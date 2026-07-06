import mongoose from "mongoose";
import { ClassOffering } from "../models/classOffering.model.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizSubmission } from "../models/quizSubmission.model.js";
import { Student } from "../models/student.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const optionLabels = ["A", "B", "C", "D"];
const NEPAL_TIME_OFFSET_MINUTES = 5 * 60 + 45;

const ensureRole = (req, role) => {
  if (req.user?.role !== role) {
    throw new ApiError(403, `${role} access is required`);
  }
  return req.user._id;
};

const fullName = (person) =>
  [person?.first_name, person?.middle_name, person?.last_name]
    .filter(Boolean)
    .join(" ");

const makeEmptyQuestions = () =>
  Array.from({ length: 10 }, () => ({
    questionText: "",
    options: optionLabels.map((label) => ({ label, text: "" })),
    correctOption: "",
  }));

const padDatePart = (value) => String(value).padStart(2, "0");

const parseNepalDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return new Date(value);

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ) -
      NEPAL_TIME_OFFSET_MINUTES * 60 * 1000,
  );
};

const normalizeDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const nepalDate = new Date(date.getTime() + NEPAL_TIME_OFFSET_MINUTES * 60 * 1000);
  return `${nepalDate.getUTCFullYear()}-${padDatePart(
    nepalDate.getUTCMonth() + 1,
  )}-${padDatePart(nepalDate.getUTCDate())}T${padDatePart(
    nepalDate.getUTCHours(),
  )}:${padDatePart(nepalDate.getUTCMinutes())}`;
};

const isQuizOpenNow = (quiz, now = new Date()) => {
  const startsAt = quiz.availableFrom ? new Date(quiz.availableFrom) : null;
  const endsAt = quiz.availableUntil ? new Date(quiz.availableUntil) : null;
  return (
    quiz.status === "published" &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt >= now)
  );
};

const isQuizClosedNow = (quiz, now = new Date()) =>
  quiz.status === "published" &&
  quiz.availableUntil &&
  new Date(quiz.availableUntil) < now;

const buildValidAnswers = (quiz, answers = []) => {
  const questionIds = new Set(quiz.questions.map((question) => question._id.toString()));
  const answerByQuestion = new Map();

  (Array.isArray(answers) ? answers : []).forEach((answer) => {
    const questionId = String(answer.questionId || "");
    if (questionIds.has(questionId) && optionLabels.includes(answer.selectedOption)) {
      answerByQuestion.set(questionId, {
        questionId,
        selectedOption: answer.selectedOption,
      });
    }
  });

  return Array.from(answerByQuestion.values());
};

const scoreAnswers = (quiz, answers = []) => {
  const answerByQuestion = new Map(
    answers.map((answer) => [String(answer.questionId), answer.selectedOption]),
  );

  return quiz.questions.reduce((total, question) => {
    return (
      total +
      (answerByQuestion.get(question._id.toString()) === question.correctOption ? 1 : 0)
    );
  }, 0);
};

const finalizeSubmission = async (quiz, submission) => {
  if (!submission || submission.status === "submitted") return submission;

  submission.obtainedMarks = scoreAnswers(quiz, submission.answers);
  submission.fullMarks = quiz.questions.length;
  submission.status = "submitted";
  submission.submittedAt = submission.submittedAt || new Date();
  await submission.save();
  return submission;
};

const isSubmittedSubmission = (submission) =>
  Boolean(submission) &&
  (submission.status === "submitted" || !submission.status);

const getTeacherOffering = async (teacherId, classOfferingId) => {
  if (!mongoose.Types.ObjectId.isValid(classOfferingId)) {
    throw new ApiError(400, "Valid class offering is required");
  }

  const offering = await ClassOffering.findOne({
    _id: classOfferingId,
    teacherId,
    isActive: true,
  })
    .populate("facultyId")
    .populate("subjectId")
    .populate("teacherId");

  if (!offering) {
    throw new ApiError(404, "Active teacher assignment not found");
  }

  const activeStudentCount = await Student.countDocuments({
    facultyId: offering.facultyId._id,
    current_level: offering.level,
    admitted_batch: offering.batch,
    isActive: true,
    academic_status: { $ne: "graduated" },
  });

  if (!activeStudentCount) {
    throw new ApiError(400, "This class is not active anymore");
  }

  return offering;
};

const normalizeAssignment = (offering) => {
  const faculty = offering.facultyId;
  const subject = offering.subjectId;
  return {
    classOfferingId: offering._id.toString(),
    facultyId: faculty._id.toString(),
    facultyCode: faculty.faculty_code,
    facultyName: faculty.faculty_name,
    level: String(offering.level),
    levelLabel:
      faculty.levels?.find((item) => item.value === offering.level)?.label ||
      `Level ${offering.level}`,
    batch: String(offering.batch),
    subjectId: subject._id.toString(),
    subjectName: subject.subject_name,
    subjectCode: subject.subject_code || "",
    teacherName: fullName(offering.teacherId),
  };
};

const sanitizeQuestions = (questions = []) => {
  const template = makeEmptyQuestions();
  const incoming = Array.isArray(questions) ? questions.slice(0, 10) : [];

  return template.map((fallback, index) => {
    const question = incoming[index] || {};
    const optionMap = new Map(
      (Array.isArray(question.options) ? question.options : []).map((option) => [
        option.label,
        option.text || "",
      ]),
    );

    return {
      _id: question._id,
      questionText: question.questionText || "",
      options: optionLabels.map((label) => ({
        label,
        text: optionMap.get(label) || "",
      })),
      correctOption: optionLabels.includes(question.correctOption)
        ? question.correctOption
        : "",
    };
  });
};

const validateCompleteQuiz = (questions) => {
  if (!Array.isArray(questions) || questions.length !== 10) {
    throw new ApiError(400, "Exactly 10 questions are required");
  }

  questions.forEach((question, index) => {
    if (!question.questionText?.trim()) {
      throw new ApiError(400, `Question ${index + 1} is empty`);
    }
    if (!optionLabels.includes(question.correctOption)) {
      throw new ApiError(400, `Select the correct answer for question ${index + 1}`);
    }
    optionLabels.forEach((label) => {
      const option = question.options?.find((item) => item.label === label);
      if (!option?.text?.trim()) {
        throw new ApiError(400, `Option ${label} is empty in question ${index + 1}`);
      }
    });
  });
};

const normalizeQuizForTeacher = (quiz) => {
  if (!quiz) {
    return {
      title: "Online Quiz",
      status: "draft",
      questions: makeEmptyQuestions(),
    };
  }

  return {
    id: quiz._id.toString(),
    title: quiz.title,
    status: quiz.status,
    submittedAt: quiz.submittedAt,
    availableFrom: normalizeDateTime(quiz.availableFrom),
    availableUntil: normalizeDateTime(quiz.availableUntil),
    questions: sanitizeQuestions(quiz.questions).map((question) => ({
      id: question._id?.toString(),
      questionText: question.questionText,
      options: question.options,
      correctOption: question.correctOption,
    })),
  };
};

const normalizeQuizForAdmin = (quiz) => {
  const now = new Date();
  const isClosed =
    quiz.status === "published" &&
    quiz.availableUntil &&
    new Date(quiz.availableUntil) < now;

  return {
    id: quiz._id.toString(),
    title: quiz.title,
    status: quiz.status,
    displayStatus: isClosed ? "closed" : quiz.status,
    submittedAt: quiz.submittedAt,
    availableFrom: normalizeDateTime(quiz.availableFrom),
    availableUntil: normalizeDateTime(quiz.availableUntil),
    facultyId: quiz.facultyId?._id?.toString() || quiz.facultyId?.toString(),
    facultyCode: quiz.facultyId?.faculty_code || "",
    facultyName: quiz.facultyId?.faculty_name || "",
    level: String(quiz.level),
    batch: String(quiz.batch),
    subjectId: quiz.subjectId?._id?.toString() || quiz.subjectId?.toString(),
    subjectName: quiz.subjectId?.subject_name || "",
    subjectCode: quiz.subjectId?.subject_code || "",
    teacherName: fullName(quiz.teacherId),
    marks: quiz.questions?.length || 10,
    questions: sanitizeQuestions(quiz.questions).map((question) => ({
      id: question._id?.toString(),
      questionText: question.questionText,
      options: question.options,
      correctOption: question.correctOption,
    })),
  };
};

const normalizeQuizForStudent = (quiz, submission = null) => {
  const now = new Date();
  const startsAt = quiz.availableFrom ? new Date(quiz.availableFrom) : null;
  const endsAt = quiz.availableUntil ? new Date(quiz.availableUntil) : null;
  const isOpen = isQuizOpenNow(quiz, now);
  const isSubmitted = isSubmittedSubmission(submission);
  const displayStatus =
    isSubmitted
      ? "submitted"
      : quiz.status === "published" && endsAt && endsAt < now
      ? "closed"
      : isOpen
        ? "open"
        : "scheduled";
  const savedAnswers = new Map(
    (submission?.answers || []).map((answer) => [
      answer.questionId.toString(),
      answer.selectedOption,
    ]),
  );

  return {
    id: quiz._id.toString(),
    title: quiz.title,
    subjectName: quiz.subjectId?.subject_name || "",
    subjectCode: quiz.subjectId?.subject_code || "",
    teacherName: fullName(quiz.teacherId),
    availableFrom: normalizeDateTime(quiz.availableFrom),
    availableUntil: normalizeDateTime(quiz.availableUntil),
    marks: quiz.questions?.length || 10,
    isOpen,
    displayStatus,
    hasSubmitted: isSubmitted,
    inProgress: submission?.status === "in_progress",
    score: isSubmitted ? submission?.obtainedMarks : null,
    submittedAt: submission?.submittedAt,
    serverNow: normalizeDateTime(now),
    savedAnswers: Object.fromEntries(savedAnswers),
    questions: sanitizeQuestions(quiz.questions).map((question) => ({
      id: question._id?.toString(),
      questionText: question.questionText,
      options: question.options,
      selectedOption: savedAnswers.get(question._id?.toString()) || "",
      correctOption: isSubmitted ? question.correctOption : undefined,
    })),
  };
};

export const getTeacherQuizContext = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const offerings = await ClassOffering.find({ teacherId, isActive: true })
      .populate("facultyId")
      .populate("subjectId")
      .populate("teacherId")
      .sort({ createdAt: -1 });

    const activeOfferings = [];
    for (const offering of offerings) {
      if (!offering.facultyId || !offering.subjectId) continue;
      const count = await Student.countDocuments({
        facultyId: offering.facultyId._id,
        current_level: offering.level,
        admitted_batch: offering.batch,
        isActive: true,
        academic_status: { $ne: "graduated" },
      });
      if (count > 0) activeOfferings.push(offering);
    }

    const quizzes = await Quiz.find({
      teacherId,
      classOfferingId: { $in: activeOfferings.map((offering) => offering._id) },
    }).select("classOfferingId status submittedAt availableFrom availableUntil");
    const quizByOffering = new Map(
      quizzes.map((quiz) => [quiz.classOfferingId.toString(), quiz]),
    );

    const assignments = activeOfferings.map((offering) => {
      const quiz = quizByOffering.get(offering._id.toString());
      return {
        ...normalizeAssignment(offering),
        quizStatus: quiz?.status || "not_started",
        submittedAt: quiz?.submittedAt,
        availableFrom: normalizeDateTime(quiz?.availableFrom),
        availableUntil: normalizeDateTime(quiz?.availableUntil),
      };
    });

    res
      .status(200)
      .json(new ApiResponse(200, { assignments }, "Quiz context retrieved"));
  } catch (error) {
    next(error);
  }
};

export const getTeacherQuizClass = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const offering = await getTeacherOffering(teacherId, req.params.classOfferingId);
    const quiz = await Quiz.findOne({
      teacherId,
      classOfferingId: offering._id,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          assignment: normalizeAssignment(offering),
          quiz: normalizeQuizForTeacher(quiz),
        },
        "Teacher quiz retrieved",
      ),
    );
  } catch (error) {
    next(error);
  }
};

const upsertTeacherQuiz = async ({ req, sendToAdmin }) => {
  const teacherId = ensureRole(req, "teacher");
  const offering = await getTeacherOffering(teacherId, req.params.classOfferingId);
  const questions = sanitizeQuestions(req.body.questions);

  if (sendToAdmin) validateCompleteQuiz(questions);

  const existing = await Quiz.findOne({
    teacherId,
    classOfferingId: offering._id,
  });

  if (existing?.status === "published") {
    throw new ApiError(400, "Published quiz questions cannot be edited");
  }

  const quiz = await Quiz.findOneAndUpdate(
    {
      teacherId,
      classOfferingId: offering._id,
    },
    {
      $set: {
        title: req.body.title?.trim() || "Online Quiz",
        facultyId: offering.facultyId._id,
        level: offering.level,
        batch: offering.batch,
        subjectId: offering.subjectId._id,
        questions,
        status: sendToAdmin ? "submitted" : existing?.status || "draft",
        ...(sendToAdmin ? { submittedAt: new Date() } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return quiz;
};

export const saveTeacherQuizDraft = async (req, res, next) => {
  try {
    const quiz = await upsertTeacherQuiz({ req, sendToAdmin: false });
    res
      .status(200)
      .json(new ApiResponse(200, normalizeQuizForTeacher(quiz), "Quiz draft saved"));
  } catch (error) {
    next(error);
  }
};

export const sendTeacherQuizToAdmin = async (req, res, next) => {
  try {
    const quiz = await upsertTeacherQuiz({ req, sendToAdmin: true });
    res.status(200).json(
      new ApiResponse(
        200,
        normalizeQuizForTeacher(quiz),
        "Quiz sent to admin successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminQuizzes = async (req, res, next) => {
  try {
    ensureRole(req, "admin");
    const quizzes = await Quiz.find({ status: { $in: ["submitted", "published"] } })
      .populate("facultyId")
      .populate("subjectId")
      .populate("teacherId")
      .sort({ submittedAt: -1, createdAt: -1 });

    const groups = new Map();
    quizzes.forEach((quiz) => {
      const facultyId = quiz.facultyId?._id?.toString() || quiz.facultyId?.toString();
      const key = `${facultyId}-${quiz.level}-${quiz.batch}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          facultyId,
          facultyCode: quiz.facultyId?.faculty_code || "",
          facultyName: quiz.facultyId?.faculty_name || "",
          level: String(quiz.level),
          batch: String(quiz.batch),
          totalMarks: 0,
          quizzes: [],
        });
      }
      const group = groups.get(key);
      const item = normalizeQuizForAdmin(quiz);
      group.totalMarks += item.marks;
      group.quizzes.push(item);
    });

    res
      .status(200)
      .json(new ApiResponse(200, Array.from(groups.values()), "Quizzes retrieved"));
  } catch (error) {
    next(error);
  }
};

export const publishAdminQuiz = async (req, res, next) => {
  try {
    const adminId = ensureRole(req, "admin");
    const { quizId } = req.params;
    const { availableFrom, availableUntil } = req.body;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw new ApiError(400, "Valid quiz is required");
    }
    if (!availableFrom || !availableUntil) {
      throw new ApiError(400, "Start and end time are required");
    }

    const startsAt = parseNepalDateTime(availableFrom);
    const endsAt = parseNepalDateTime(availableUntil);
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      startsAt >= endsAt
    ) {
      throw new ApiError(400, "Quiz end time must be after start time");
    }

    const quiz = await Quiz.findOne({ _id: quizId, status: { $ne: "draft" } });
    if (!quiz) throw new ApiError(404, "Submitted quiz not found");
    validateCompleteQuiz(sanitizeQuestions(quiz.questions));

    quiz.status = "published";
    quiz.availableFrom = startsAt;
    quiz.availableUntil = endsAt;
    quiz.publishedBy = adminId;
    quiz.publishedAt = new Date();
    await quiz.save();

    const populated = await Quiz.findById(quiz._id)
      .populate("facultyId")
      .populate("subjectId")
      .populate("teacherId");

    res
      .status(200)
      .json(new ApiResponse(200, normalizeQuizForAdmin(populated), "Quiz schedule saved"));
  } catch (error) {
    next(error);
  }
};

export const getStudentQuizzes = async (req, res, next) => {
  try {
    const studentId = ensureRole(req, "student");
    const student = await Student.findById(studentId);
    if (!student) throw new ApiError(404, "Student not found");

    const quizzes = await Quiz.find({
      facultyId: student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
      status: "published",
    })
      .populate("subjectId")
      .populate("teacherId")
      .sort({ availableFrom: 1 });

    const submissions = await QuizSubmission.find({
      studentId,
      quizId: { $in: quizzes.map((quiz) => quiz._id) },
    });
    const submissionByQuiz = new Map(
      submissions.map((submission) => [submission.quizId.toString(), submission]),
    );

    for (const quiz of quizzes) {
      const submission = submissionByQuiz.get(quiz._id.toString());
      if (submission?.status === "in_progress" && isQuizClosedNow(quiz)) {
        await finalizeSubmission(quiz, submission);
      }
    }

    res.status(200).json(
      new ApiResponse(
        200,
        quizzes.map((quiz) =>
          normalizeQuizForStudent(quiz, submissionByQuiz.get(quiz._id.toString())),
        ),
        "Student quizzes retrieved",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getStudentQuiz = async (req, res, next) => {
  try {
    const studentId = ensureRole(req, "student");
    if (!mongoose.Types.ObjectId.isValid(req.params.quizId)) {
      throw new ApiError(400, "Valid quiz is required");
    }

    const student = await Student.findById(studentId);
    if (!student) throw new ApiError(404, "Student not found");

    const quiz = await Quiz.findOne({
      _id: req.params.quizId,
      facultyId: student.facultyId,
      level: student.current_level,
      batch: student.admitted_batch,
      status: "published",
    })
      .populate("subjectId")
      .populate("teacherId");
    if (!quiz) throw new ApiError(404, "Quiz not found");

    let submission = await QuizSubmission.findOne({ quizId: quiz._id, studentId });
    if (submission?.status === "in_progress" && isQuizClosedNow(quiz)) {
      submission = await finalizeSubmission(quiz, submission);
    }
    const payload = normalizeQuizForStudent(quiz, submission);
    if (!payload.isOpen && !payload.hasSubmitted) {
      throw new ApiError(400, "Quiz is not open right now");
    }

    res.status(200).json(new ApiResponse(200, payload, "Quiz retrieved"));
  } catch (error) {
    next(error);
  }
};

const getStudentPublishedQuiz = async (studentId, quizId) => {
  if (!mongoose.Types.ObjectId.isValid(quizId)) {
    throw new ApiError(400, "Valid quiz is required");
  }

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "Student not found");

  const quiz = await Quiz.findOne({
    _id: quizId,
    facultyId: student.facultyId,
    level: student.current_level,
    batch: student.admitted_batch,
    status: "published",
  });
  if (!quiz) throw new ApiError(404, "Quiz not found");

  return quiz;
};

export const saveStudentQuizProgress = async (req, res, next) => {
  try {
    const studentId = ensureRole(req, "student");
    const quiz = await getStudentPublishedQuiz(studentId, req.params.quizId);

    if (!isQuizOpenNow(quiz)) {
      const existing = await QuizSubmission.findOne({ quizId: quiz._id, studentId });
      if (existing?.status === "in_progress" && isQuizClosedNow(quiz)) {
        const finalized = await finalizeSubmission(quiz, existing);
        res.status(200).json(
          new ApiResponse(
            200,
            {
              status: finalized.status,
              obtainedMarks: finalized.obtainedMarks,
              fullMarks: finalized.fullMarks,
              submittedAt: finalized.submittedAt,
            },
            "Quiz time ended. Saved answers were submitted.",
          ),
        );
        return;
      }
      throw new ApiError(400, "Quiz is not open right now");
    }

    const existing = await QuizSubmission.findOne({ quizId: quiz._id, studentId });
    if (isSubmittedSubmission(existing)) {
      throw new ApiError(400, "Quiz already submitted");
    }

    const answers = buildValidAnswers(quiz, req.body.answers);
    const submission = await QuizSubmission.findOneAndUpdate(
      { quizId: quiz._id, studentId },
      {
        $set: {
          answers,
          fullMarks: quiz.questions.length,
          status: "in_progress",
          submittedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          status: submission.status,
          savedAnswerCount: submission.answers.length,
          updatedAt: submission.updatedAt,
        },
        "Quiz progress saved",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const submitStudentQuiz = async (req, res, next) => {
  try {
    const studentId = ensureRole(req, "student");
    const quiz = await getStudentPublishedQuiz(studentId, req.params.quizId);

    const now = new Date();
    if (quiz.availableFrom && new Date(quiz.availableFrom) > now) {
      throw new ApiError(400, "Quiz has not started");
    }

    const existing = await QuizSubmission.findOne({ quizId: quiz._id, studentId });
    if (isSubmittedSubmission(existing)) {
      throw new ApiError(400, "Quiz already submitted");
    }

    const incomingAnswers = buildValidAnswers(quiz, req.body.answers);
    const answers = incomingAnswers.length
      ? incomingAnswers
      : buildValidAnswers(quiz, existing?.answers || []);
    const obtainedMarks = scoreAnswers(quiz, answers);

    const submission = await QuizSubmission.findOneAndUpdate(
      { quizId: quiz._id, studentId },
      {
        $set: {
          answers,
          obtainedMarks,
          fullMarks: quiz.questions.length,
          status: "submitted",
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json(
      new ApiResponse(
        201,
        {
          obtainedMarks: submission.obtainedMarks,
          fullMarks: submission.fullMarks,
          submittedAt: submission.submittedAt,
        },
        "Quiz submitted successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};
