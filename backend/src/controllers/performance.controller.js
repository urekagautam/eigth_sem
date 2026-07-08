import mongoose from "mongoose";
import { Attendance } from "../models/attendance.model.js";
import { ClassAttendanceSession } from "../models/classAttendanceSession.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamAttendance } from "../models/examAttendance.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Marks } from "../models/marks.model.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizSubmission } from "../models/quizSubmission.model.js";
import { Student } from "../models/student.model.js";
import { Subject } from "../models/subject.model.js";
import {
  buildLabelledPerformanceDataset,
  getStudentPerformancePrediction,
} from "../ml/performancePrediction.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const GPA_SCALE = [
  { min: 90, grade: "A", gradePoint: 4.0, remark: "Outstanding" },
  { min: 80, grade: "A-", gradePoint: 3.7, remark: "Excellent" },
  { min: 70, grade: "B+", gradePoint: 3.3, remark: "Very good" },
  { min: 60, grade: "B", gradePoint: 3.0, remark: "Good" },
  { min: 50, grade: "B-", gradePoint: 2.7, remark: "Satisfactory" },
  { min: 0, grade: "F", gradePoint: 0.0, remark: "Fail" },
];

const round = (value, places = 2) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(places));
};

const getGrade = (percentage) =>
  GPA_SCALE.find((item) => percentage >= item.min) || GPA_SCALE[GPA_SCALE.length - 1];

const fullName = (student) =>
  [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(" ");

const levelLabel = (faculty, level) =>
  faculty?.levels?.find((item) => item.value === Number(level))?.label ||
  `Level ${level}`;

const normalizeFaculty = (faculty) => ({
  _id: faculty._id.toString(),
  code: faculty.faculty_code,
  name: faculty.faculty_name,
  structureType: faculty.structure,
  maxLevel: faculty.max_level,
  levels: faculty.levels || [],
});

const normalizeStudent = (student, faculty) => ({
  _id: student._id.toString(),
  studentId: student.std_id,
  rollNo: student.roll_no,
  name: fullName(student),
  admission: {
    facultyId: faculty._id.toString(),
    facultyCode: faculty.faculty_code,
    facultyName: faculty.faculty_name,
    batch: String(student.admitted_batch),
  },
  enrollment: {
    status: student.academic_status === "graduated" ? "graduated" : "active",
    currentLevel: student.current_level,
    currentLevelLabel: levelLabel(faculty, student.current_level),
  },
  performanceSummary: {
    cumulativeGpa: student.performance_summary?.cumulative_gpa ?? null,
    termCount: student.performance_summary?.term_count || 0,
    updatedAt: student.performance_summary?.updated_at || null,
  },
});

const normalizeStudentProfile = (student, faculty) => ({
  ...normalizeStudent(student, faculty),
  profile: {
    firstName: student.first_name,
    middleName: student.middle_name || "",
    lastName: student.last_name,
    gender: student.gender,
    bloodGroup: student.blood_group || "",
    email: student.email,
    mobile: student.mobile_no,
    citizenshipNo: student.citizenship_no || "",
  },
  guardian: {
    name: student.guardian_name || "",
    mobile: student.guardian_mobile || "",
    fatherName: student.father_name || "",
    fatherMobile: student.father_mobile || "",
    motherName: student.mother_name || "",
    motherMobile: student.mother_mobile || "",
  },
  universityRegNo: student.registration_no || "",
  universitySymbolNo: student.symbol_no || "",
  username: student.username,
});

const normalizeSubject = (subject) => ({
  _id: subject._id.toString(),
  name: subject.subject_name,
  code: subject.subject_code || "",
  level: subject.level,
});

const normalizeExam = (exam) => ({
  id: exam._id.toString(),
  title: exam.title,
  fullMarks: exam.fullMarks,
  batch: String(exam.batch),
  published: exam.published,
  createdAt: exam.createdAt,
});

const buildMarkMap = async (examIds, studentIds) => {
  if (!examIds.length || !studentIds.length) return new Map();

  const marks = await Marks.find({
    examId: { $in: examIds },
    studentId: { $in: studentIds },
  }).populate("classOfferingId");

  const map = new Map();
  marks.forEach((mark) => {
    const subjectId = mark.classOfferingId?.subjectId?.toString();
    if (!subjectId) return;
    const key = `${mark.examId.toString()}-${mark.studentId.toString()}-${subjectId}`;
    map.set(key, mark);
  });
  return map;
};

const getExamSubjects = (exam, subjectsById, fallbackSubjects) => {
  if (!exam) return fallbackSubjects;
  const fromRoutine = (exam.items || [])
    .map((item) => subjectsById.get(item.subjectId?.toString()))
    .filter(Boolean);
  return fromRoutine.length ? fromRoutine : fallbackSubjects;
};

const calculateStudentExamResult = ({ student, exam, subjects, markMap, absentSubjectIds = new Set() }) => {
  const fullMarksPerSubject = Number(exam?.fullMarks) || 100;
  const passMarks = Number(exam?.passMarks ?? Math.ceil(fullMarksPerSubject * 0.4));
  const subjectResults = subjects.map((subject) => {
    const subjectId = subject._id.toString();
    const isAbsent = absentSubjectIds.has(subjectId);
    const mark = markMap.get(`${exam._id.toString()}-${student._id.toString()}-${subject._id}`);
    const obtainedMarks = isAbsent
      ? null
      : mark?.obtained_marks == null
        ? null
        : Number(mark.obtained_marks);
    const percentage =
      obtainedMarks == null ? null : (obtainedMarks / fullMarksPerSubject) * 100;
    const gradeInfo = percentage == null ? null : getGrade(percentage);

    return {
      subjectId: subject._id,
      subjectName: subject.name,
      subjectCode: subject.code,
      obtainedMarks,
      fullMarks: fullMarksPerSubject,
      percentage: round(percentage, 1),
      grade: gradeInfo?.grade || "",
      gradePoint: gradeInfo ? gradeInfo.gradePoint : null,
      remark: gradeInfo?.remark || "Not entered",
      passed: isAbsent ? false : obtainedMarks == null ? null : obtainedMarks >= passMarks,
      absent: isAbsent,
      passMarks,
    };
  });

  const enteredSubjects = subjectResults.filter(
    (item) => item.obtainedMarks != null,
  );
  const total = enteredSubjects.reduce((sum, item) => sum + item.obtainedMarks, 0);
  const fullMarks = subjectResults.reduce((sum, item) => sum + item.fullMarks, 0);
  const complete = subjectResults.length > 0 && enteredSubjects.length === subjectResults.length;
  const percentage = complete && fullMarks ? (total / fullMarks) * 100 : null;
  const gpa = complete
    ? enteredSubjects.reduce((sum, item) => sum + item.gradePoint, 0) /
      enteredSubjects.length
    : null;
  const hasAbsent = subjectResults.some((item) => item.absent);
  const hasFail = subjectResults.some((item) => item.passed === false && !item.absent);
  const failed = hasFail || hasAbsent;

  let status = "";
  if (!enteredSubjects.length && hasAbsent) {
    status = "Absent";
  } else if (!enteredSubjects.length) {
    status = "No marks";
  } else if (!complete) {
    status = "Incomplete";
  } else if (hasFail && hasAbsent) {
    status = "Failed & Absent";
  } else if (hasAbsent) {
    status = "Absent";
  } else if (hasFail) {
    status = "Failed";
  } else {
    status = "Passed";
  }

  return {
    student: normalizeStudent(student, exam.facultyId),
    subjectResults,
    total,
    fullMarks,
    enteredSubjectCount: enteredSubjects.length,
    subjectCount: subjectResults.length,
    missingSubjectCount: subjectResults.length - enteredSubjects.length,
    percentage: round(percentage, 1),
    gpa: round(gpa),
    status,
    complete,
    failed,
  };
};

const calculateCumulativeGpa = ({ student, exams, subjectsById, fallbackSubjects, markMap }) => {
  const termGpas = exams
    .map((exam) => {
      const subjects = getExamSubjects(exam, subjectsById, fallbackSubjects);
      const result = calculateStudentExamResult({ student, exam, subjects, markMap });
      return result.complete ? result.gpa : null;
    })
    .filter((gpa) => gpa != null);

  if (!termGpas.length) return { cumulativeGpa: null, termCount: 0 };
  const cumulativeGpa =
    termGpas.reduce((sum, gpa) => sum + gpa, 0) / termGpas.length;
  return { cumulativeGpa: round(cumulativeGpa), termCount: termGpas.length };
};

const applyRanks = (rows) => {
  const rankedRows = rows
    .filter((row) => row.status === "Passed" && row.complete && row.gpa != null)
    .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0) || b.total - a.total);

  let rank = 0;
  let previousKey = "";
  const rankMap = new Map();
  rankedRows.forEach((row, index) => {
    const key = `${row.gpa ?? 0}-${row.total}`;
    if (key !== previousKey) rank = index + 1;
    previousKey = key;
    rankMap.set(row.student._id, rank);
  });

  return rows
    .map((row) => ({
      ...row,
      rank: rankMap.get(row.student._id) || "-",
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
};

export const getPerformanceLedger = async (req, res, next) => {
  try {
    const { facultyId, level, batch, examId } = req.query;

    if (!facultyId || !mongoose.Types.ObjectId.isValid(facultyId)) {
      throw new ApiError(400, "Valid faculty is required");
    }
    if (!level) throw new ApiError(400, "Semester/year is required");

    const faculty = await Faculty.findOne({
      _id: facultyId,
      isDeleted: { $ne: true },
    });
    if (!faculty) throw new ApiError(404, "Faculty not found");

    const selectedLevel = Number(level);
    const activeStudentsForLevel = await Student.find({
      facultyId,
      current_level: selectedLevel,
      isActive: true,
      academic_status: { $ne: "graduated" },
    }).sort({ roll_no: 1, std_id: 1 });

    const activeBatches = Array.from(
      new Set(
        activeStudentsForLevel
          .map((student) => Number(student.admitted_batch))
          .filter(Boolean),
      ),
    )
      .sort((a, b) => b - a)
      .map(String);

    const selectedBatch = batch || activeBatches[0] || "";
    const students = selectedBatch
      ? activeStudentsForLevel.filter(
          (student) => String(student.admitted_batch) === String(selectedBatch),
        )
      : [];

    const subjects = await Subject.find({
      facultyId,
      level: selectedLevel,
    }).sort({ subject_name: 1 });
    const normalizedSubjects = subjects.map(normalizeSubject);
    const subjectsById = new Map(
      normalizedSubjects.map((subject) => [subject._id, subject]),
    );

    const exams = selectedBatch
      ? await Exam.find({
          facultyId,
          level: selectedLevel,
          batch: Number(selectedBatch),
        })
          .populate("facultyId")
          .sort({ createdAt: -1 })
      : [];

    const currentExam =
      exams.find((exam) => exam._id.toString() === examId) || exams[0] || null;
    const examSubjects = getExamSubjects(
      currentExam,
      subjectsById,
      normalizedSubjects,
    );

    const examIds = exams.map((exam) => exam._id);
    const studentIds = students.map((student) => student._id);
    const markMap = await buildMarkMap(examIds, studentIds);

    const examAttendanceRecords = currentExam
      ? await ExamAttendance.find({
          examId: currentExam._id,
          studentId: { $in: studentIds },
        }).select("studentId status examItemId subjectId")
      : [];

    const absentMap = new Map();
    examAttendanceRecords
      .filter((record) => record.status === "absent")
      .forEach((record) => {
        const studentId = record.studentId.toString();
        const subjectId = record.subjectId?.toString();
        if (!absentMap.has(studentId)) absentMap.set(studentId, new Set());
        if (subjectId) absentMap.get(studentId).add(subjectId);
      });

    const rows = currentExam
      ? students.map((student) => {
          const result = calculateStudentExamResult({
            student,
            exam: currentExam,
            subjects: examSubjects,
            markMap,
            absentSubjectIds: absentMap.get(student._id.toString()) || new Set(),
          });
          const cumulative = calculateCumulativeGpa({
            student,
            exams,
            subjectsById,
            fallbackSubjects: normalizedSubjects,
            markMap,
          });
          return { ...result, ...cumulative };
        })
      : [];

    if (rows.length) {
      await Student.bulkWrite(
        rows.map((row) => ({
          updateOne: {
            filter: { _id: row.student._id },
            update: {
              $set: {
                "performance_summary.cumulative_gpa": row.cumulativeGpa,
                "performance_summary.term_count": row.termCount,
                "performance_summary.last_exam_id": currentExam?._id,
                "performance_summary.updated_at": new Date(),
              },
            },
          },
        })),
      );
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          faculty: normalizeFaculty(faculty),
          level: String(selectedLevel),
          levelLabel: levelLabel(faculty, selectedLevel),
          batch: selectedBatch,
          activeBatches,
          subjects: examSubjects,
          exams: exams.map(normalizeExam),
          currentExam: currentExam ? normalizeExam(currentExam) : null,
          students: students.map((student) => normalizeStudent(student, faculty)),
          rows: applyRanks(rows),
          gpaScale: GPA_SCALE,
        },
        "Performance ledger retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

const percentage = (obtained, full) =>
  full ? round((Number(obtained || 0) / Number(full)) * 100, 1) : null;

const buildAttendanceSummary = (records) => {
  const total = records.length;
  const present = records.filter((record) => record.status === "present").length;
  const absent = total - present;
  return {
    present,
    absent,
    total,
    percentage: total ? round((present / total) * 100, 1) : null,
  };
};

const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const buildClassAttendanceSummary = ({ records, sessions }) => {
  const classDates = new Set(sessions.map((session) => dateKey(session.date)));

  records.forEach((record) => {
    classDates.add(dateKey(record.date));
  });

  const presentDates = new Set(
    records
      .filter((record) => record.status === "present")
      .map((record) => dateKey(record.date)),
  );

  const total = classDates.size;
  const present = presentDates.size;
  const absent = Math.max(total - present, 0);

  return {
    present,
    absent,
    total,
    percentage: total ? round((present / total) * 100, 1) : null,
  };
};

export const getStudentPerformanceDetail = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new ApiError(400, "Valid student is required");
    }

    const student = await Student.findById(studentId).populate("facultyId");
    if (!student) throw new ApiError(404, "Student not found");
    const faculty = student.facultyId;
    if (!faculty) throw new ApiError(404, "Student faculty not found");

    const selectedLevel = Number(student.current_level);
    const selectedBatch = Number(student.admitted_batch);
    const classFilter = {
      facultyId: faculty._id,
      level: selectedLevel,
      batch: selectedBatch,
    };

    const subjects = await Subject.find({
      facultyId: faculty._id,
      level: selectedLevel,
    }).sort({ subject_name: 1 });
    const normalizedSubjects = subjects.map(normalizeSubject);
    const subjectsById = new Map(
      normalizedSubjects.map((subject) => [subject._id, subject]),
    );

    const exams = await Exam.find(classFilter)
      .populate("facultyId")
      .sort({ createdAt: 1 });
    const markMap = await buildMarkMap(
      exams.map((exam) => exam._id),
      [student._id],
    );

    const examAttendanceSummaryRecords = await ExamAttendance.find({
      studentId: student._id,
      ...classFilter,
    }).select("examId status");
    const absencesByExam = new Set(
      examAttendanceSummaryRecords
        .filter((record) => record.status === "absent")
        .map((record) => record.examId.toString()),
    );

    const examResults = exams.map((exam) => {
      const result = calculateStudentExamResult({
        student,
        exam,
        subjects: getExamSubjects(exam, subjectsById, normalizedSubjects),
        markMap,
        hasAbsentAttendance: absencesByExam.has(exam._id.toString()),
      });
      return {
        exam: normalizeExam(exam),
        total: result.total,
        fullMarks: result.fullMarks,
        enteredSubjectCount: result.enteredSubjectCount,
        subjectCount: result.subjectCount,
        percentage: result.percentage,
        gpa: result.gpa,
        status: result.status,
        subjectResults: result.subjectResults,
      };
    });

    const offerings = await ClassOffering.find(classFilter).populate("subjectId");
    const offeringIds = offerings.map((offering) => offering._id);
    const attendanceRecords = offeringIds.length
      ? await Attendance.find({
          studentId: student._id,
          $or: [
            classFilter,
            { classOfferingId: { $in: offeringIds } },
          ],
        })
          .sort({ date: -1 })
      : [];
    const classAttendanceSessions = await ClassAttendanceSession.find(
      classFilter,
    ).sort({ date: -1 });
    const classAttendanceSummary = buildClassAttendanceSummary({
      records: attendanceRecords,
      sessions: classAttendanceSessions,
    });
    const attendanceSummaryCards = [
      {
        subjectId: "class-attendance",
        subjectName: `${levelLabel(faculty, selectedLevel)} class attendance`,
        subjectCode: "",
        ...classAttendanceSummary,
      },
    ];

    const examAttendanceRecords = await ExamAttendance.find({
      studentId: student._id,
      ...classFilter,
    })
      .populate("examId")
      .populate("subjectId")
      .sort({ examDate: -1, updatedAt: -1 });

    const quizzes = await Quiz.find({
      ...classFilter,
      status: "published",
    })
      .populate("subjectId")
      .sort({ availableFrom: 1, createdAt: 1 });
    const quizSubmissions = quizzes.length
      ? await QuizSubmission.find({
          studentId: student._id,
          quizId: { $in: quizzes.map((quiz) => quiz._id) },
        })
      : [];
    const submissionByQuiz = new Map(
      quizSubmissions.map((submission) => [submission.quizId.toString(), submission]),
    );
    const quizResults = quizzes.map((quiz) => {
      const submission = submissionByQuiz.get(quiz._id.toString());
      return {
        quizId: quiz._id.toString(),
        title: quiz.title,
        subjectName: quiz.subjectId?.subject_name || "Subject",
        subjectCode: quiz.subjectId?.subject_code || "",
        obtainedMarks: submission?.obtainedMarks ?? null,
        fullMarks: submission?.fullMarks ?? quiz.questions?.length ?? 0,
        percentage: submission
          ? percentage(submission.obtainedMarks, submission.fullMarks)
          : null,
        submittedAt: submission?.submittedAt || null,
        status: submission ? "submitted" : "pending",
      };
    });
    const submittedQuizResults = quizResults.filter(
      (quiz) => quiz.obtainedMarks != null,
    );
    const quizObtained = submittedQuizResults.reduce(
      (sum, quiz) => sum + Number(quiz.obtainedMarks || 0),
      0,
    );
    const quizFull = submittedQuizResults.reduce(
      (sum, quiz) => sum + Number(quiz.fullMarks || 0),
      0,
    );

    const cumulative = calculateCumulativeGpa({
      student,
      exams,
      subjectsById,
      fallbackSubjects: normalizedSubjects,
      markMap,
    });
    const prediction = await getStudentPerformancePrediction(student._id);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student: normalizeStudentProfile(student, faculty),
          faculty: normalizeFaculty(faculty),
          level: String(selectedLevel),
          levelLabel: levelLabel(faculty, selectedLevel),
          batch: String(selectedBatch),
          subjects: normalizedSubjects,
          exams: examResults,
          attendance: {
            overall: classAttendanceSummary,
            bySubject: attendanceSummaryCards,
          },
          examAttendance: {
            overall: buildAttendanceSummary(examAttendanceRecords),
            records: examAttendanceRecords.map((record) => ({
              examId: record.examId?._id?.toString() || record.examId?.toString(),
              examTitle: `${
                record.subjectId?.subject_code
                  ? `${record.subjectId.subject_code} - ${record.subjectId.subject_name}`
                  : record.subjectId?.subject_name || "Subject"
              } - ${record.examId?.title || "Exam"}`,
              subjectId:
                record.subjectId?._id?.toString() || record.subjectId?.toString(),
              subjectName: record.examId?.title || "Exam",
              subjectCode: "",
              date: record.examDate,
              status: record.status,
            })),
          },
          quizzes: {
            overall: {
              obtainedMarks: quizObtained,
              fullMarks: quizFull,
              percentage: percentage(quizObtained, quizFull),
              submitted: submittedQuizResults.length,
              total: quizResults.length,
            },
            records: quizResults.length
              ? [
                  {
                    quizId: "quiz-total",
                    title: "Total quiz marks",
                    subjectName: "All subjects",
                    subjectCode: "",
                    obtainedMarks: quizObtained,
                    fullMarks: quizFull,
                    percentage: percentage(quizObtained, quizFull),
                    submittedAt: null,
                    status: "summary",
                  },
                  ...quizResults,
                ]
              : [],
          },
          summary: {
            cumulativeGpa: cumulative.cumulativeGpa,
            termCount: cumulative.termCount,
          },
          prediction,
        },
        "Student performance detail retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getPerformanceDataset = async (req, res, next) => {
  try {
    const rows = await buildLabelledPerformanceDataset(req.query);
    res.status(200).json(
      new ApiResponse(
        200,
        {
          generatedAt: new Date(),
          rowCount: rows.length,
          rows,
        },
        "Labelled performance dataset generated successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};
