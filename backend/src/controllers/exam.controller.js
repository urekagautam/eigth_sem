import mongoose from "mongoose";
import { ClassOffering } from "../models/classOffering.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamAttendance } from "../models/examAttendance.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Marks } from "../models/marks.model.js";
import { Student } from "../models/student.model.js";
import { Subject } from "../models/subject.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const normalizeDate = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const normalizeExam = (exam) => ({
  id: exam._id.toString(),
  _id: exam._id.toString(),
  title: exam.title,
  createdAt: normalizeDate(exam.createdAt),
  fullMarks: exam.fullMarks,
  passMarks: exam.passMarks,
  notice: exam.notice || "",
  published: exam.published,
  items: (exam.items || []).map((item) => {
    const subject = item.subjectId;
    return {
      id: item._id.toString(),
      subjectId: subject?._id?.toString() || item.subjectId?.toString(),
      subject: subject?.subject_name || "",
      subjectCode: subject?.subject_code || "",
      date: normalizeDate(item.examDate),
      time: item.examTime,
    };
  }),
});

const normalizeSchedule = (facultyId, faculty, level, batch, exams) => ({
  id: `sch-${facultyId}-${level}-${batch}`,
  facultyId,
  facultyCode: faculty?.faculty_code || "",
  facultyName: faculty?.faculty_name || "",
  level: String(level),
  batch: String(batch),
  exams: exams.map(normalizeExam),
});

const getLatestActiveBatch = async (facultyId, level) => {
  const offering = await ClassOffering.findOne({
    facultyId,
    isActive: true,
    level: Number(level),
  })
    .sort({ batch: -1 })
    .select("batch");

  return offering?.batch ? Number(offering.batch) : null;
};

export const getExamSchedules = async (req, res, next) => {
  try {
    const { facultyId, level, batch } = req.query;
    const filter = {};

    if (facultyId) {
      if (!mongoose.Types.ObjectId.isValid(facultyId)) {
        throw new ApiError(400, "Valid faculty is required");
      }
      filter.facultyId = new mongoose.Types.ObjectId(facultyId);
    }
    if (level) filter.level = Number(level);

    if (batch) {
      filter.batch = Number(batch);
    } else if (facultyId && level) {
      const latestBatch = await getLatestActiveBatch(facultyId, level);
      if (!latestBatch) {
        return res
          .status(200)
          .json(new ApiResponse(200, [], "No active batch found for this class"));
      }
      filter.batch = latestBatch;
    }

    const exams = await Exam.find(filter)
      .populate("facultyId")
      .populate("items.subjectId")
      .sort({ createdAt: -1 });

    const grouped = new Map();
    exams.forEach((exam) => {
      const faculty = exam.facultyId;
      const id = faculty?._id?.toString() || exam.facultyId?.toString();
      const key = `${id}-${exam.level}-${exam.batch}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          facultyId: id,
          faculty,
          level: exam.level,
          batch: exam.batch,
          exams: [],
        });
      }
      grouped.get(key).exams.push(exam);
    });

    const schedules = Array.from(grouped.values()).map((entry) =>
      normalizeSchedule(
        entry.facultyId,
        entry.faculty,
        entry.level,
        entry.batch,
        entry.exams,
      ),
    );

    res
      .status(200)
      .json(new ApiResponse(200, schedules, "Exam schedules retrieved successfully"));
  } catch (error) {
    next(error);
  }
};

const studentFullName = (student) =>
  [student?.first_name, student?.middle_name, student?.last_name]
    .filter(Boolean)
    .join(" ");

const gradeForPercent = (percentage) => {
  if (percentage == null) return { grade: "", remark: "" };
  if (percentage >= 90) return { grade: "A", remark: "Outstanding" };
  if (percentage >= 80) return { grade: "A-", remark: "Excellent" };
  if (percentage >= 70) return { grade: "B+", remark: "Very good" };
  if (percentage >= 60) return { grade: "B", remark: "Good" };
  if (percentage >= 50) return { grade: "B-", remark: "Satisfactory" };
  return { grade: "F", remark: "Fail" };
};

export const createExamSchedule = async (req, res, next) => {
  try {
    const { title, facultyId, level, batch, fullMarks, passMarks, notice, items } = req.body;

    if (!title?.trim() || !facultyId || !level) {
      throw new ApiError(400, "Exam title, faculty, and level are required");
    }
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      throw new ApiError(400, "Valid faculty is required");
    }
    if (!Array.isArray(items) || !items.length) {
      throw new ApiError(400, "At least one subject schedule is required");
    }

    const faculty = await Faculty.findOne({
      _id: facultyId,
      isDeleted: { $ne: true },
    });
    if (!faculty) throw new ApiError(404, "Faculty not found");

    const selectedLevel = Number(level);
    const selectedBatch = batch
      ? Number(batch)
      : await getLatestActiveBatch(facultyId, selectedLevel);

    if (!selectedBatch) {
      throw new ApiError(400, "No active batch found for this class");
    }

    if (selectedLevel < 1 || selectedLevel > faculty.max_level) {
      throw new ApiError(400, "Level is outside this faculty structure");
    }

    const activeStudentCount = await Student.countDocuments({
      facultyId,
      current_level: selectedLevel,
      admitted_batch: selectedBatch,
      isActive: true,
      academic_status: { $ne: "graduated" },
    });
    if (!activeStudentCount) {
      throw new ApiError(400, "This batch is not active in the selected level");
    }

    const subjectIds = items.map((item) => item.subjectId);
    const hasInvalidSubjectId = subjectIds.some(
      (subjectId) => !mongoose.Types.ObjectId.isValid(subjectId),
    );
    if (hasInvalidSubjectId) {
      throw new ApiError(400, "Every schedule row needs a valid subject");
    }

    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      facultyId,
      level: selectedLevel,
    }).select("_id");
    const validSubjectIds = new Set(subjects.map((subject) => subject._id.toString()));

    const seenSubjects = new Set();
    const examItems = items.map((item) => {
      const subjectId = item.subjectId?.toString();
      if (!validSubjectIds.has(subjectId)) {
        throw new ApiError(400, "Selected subject does not belong to this class");
      }
      if (seenSubjects.has(subjectId)) {
        throw new ApiError(400, "A subject can be scheduled only once in an exam");
      }
      seenSubjects.add(subjectId);

      if (!item.date || !item.time) {
        throw new ApiError(400, "Date and time are required for every subject");
      }

      return {
        subjectId,
        examDate: new Date(item.date),
        examTime: item.time,
      };
    });

    const fullMarksValue = Number(fullMarks) || 100;
    const passMarksValue = Number(passMarks ?? Math.ceil(fullMarksValue * 0.4));
    if (passMarksValue < 0 || passMarksValue > fullMarksValue) {
      throw new ApiError(
        400,
        "Pass marks must be between 0 and the exam full marks",
      );
    }

    const exam = await Exam.create({
      title: title.trim(),
      facultyId,
      level: selectedLevel,
      batch: selectedBatch,
      fullMarks: fullMarksValue,
      passMarks: passMarksValue,
      notice: notice?.trim() || "",
      items: examItems,
    });

    const populated = await Exam.findById(exam._id)
      .populate("facultyId")
      .populate("items.subjectId");

    res
      .status(201)
      .json(new ApiResponse(201, normalizeExam(populated), "Exam schedule created successfully"));
  } catch (error) {
    next(error);
  }
};

const buildExamItems = async ({ items, facultyId, level }) => {
  const subjectIds = items.map((item) => item.subjectId);
  const hasInvalidSubjectId = subjectIds.some(
    (subjectId) => !mongoose.Types.ObjectId.isValid(subjectId),
  );
  if (hasInvalidSubjectId) {
    throw new ApiError(400, "Every schedule row needs a valid subject");
  }

  const subjects = await Subject.find({
    _id: { $in: subjectIds },
    facultyId,
    level,
  }).select("_id");
  const validSubjectIds = new Set(subjects.map((subject) => subject._id.toString()));

  const seenSubjects = new Set();
  return items.map((item) => {
    const subjectId = item.subjectId?.toString();
    if (!validSubjectIds.has(subjectId)) {
      throw new ApiError(400, "Selected subject does not belong to this class");
    }
    if (seenSubjects.has(subjectId)) {
      throw new ApiError(400, "A subject can be scheduled only once in an exam");
    }
    seenSubjects.add(subjectId);

    if (!item.date || !item.time) {
      throw new ApiError(400, "Date and time are required for every subject");
    }

    return {
      subjectId,
      examDate: new Date(item.date),
      examTime: item.time,
    };
  });
};

export const updateExamSchedule = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { title, fullMarks, passMarks, notice, items } = req.body;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw new ApiError(400, "Valid exam is required");
    }
    if (!title?.trim()) {
      throw new ApiError(400, "Exam title is required");
    }
    if (!Array.isArray(items) || !items.length) {
      throw new ApiError(400, "At least one subject schedule is required");
    }

    const exam = await Exam.findById(examId);
    if (!exam) throw new ApiError(404, "Exam not found");

    const fullMarksValue = Number(fullMarks) || 100;
    const passMarksValue = Number(passMarks ?? Math.ceil(fullMarksValue * 0.4));
    if (passMarksValue < 0 || passMarksValue > fullMarksValue) {
      throw new ApiError(
        400,
        "Pass marks must be between 0 and the exam full marks",
      );
    }

    exam.title = title.trim();
    exam.fullMarks = fullMarksValue;
    exam.passMarks = passMarksValue;
    exam.notice = notice?.trim() || "";
    exam.items = await buildExamItems({
      items,
      facultyId: exam.facultyId,
      level: exam.level,
    });

    await exam.save();

    const populated = await Exam.findById(exam._id)
      .populate("facultyId")
      .populate("items.subjectId");

    res
      .status(200)
      .json(new ApiResponse(200, normalizeExam(populated), "Exam schedule updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const getStudentAcademics = async (req, res, next) => {
  try {
    if (req.user?.role !== "student") {
      throw new ApiError(403, "Student access is required");
    }

    const student = await Student.findById(req.user._id).populate("facultyId");
    if (!student) throw new ApiError(404, "Student not found");
    const faculty = student.facultyId;
    if (!faculty) throw new ApiError(404, "Student faculty not found");

    const classFilter = {
      facultyId: faculty._id,
      level: Number(student.current_level),
      batch: Number(student.admitted_batch),
    };

    const exams = await Exam.find(classFilter)
      .populate("facultyId")
      .populate("items.subjectId")
      .sort({ createdAt: -1 });

    const examIds = exams.map((exam) => exam._id);
    const offerings = await ClassOffering.find(classFilter).populate("subjectId");
    const offeringBySubject = new Map(
      offerings.map((offering) => [
        offering.subjectId?._id?.toString() || offering.subjectId?.toString(),
        offering,
      ]),
    );

    const marks = examIds.length
      ? await Marks.find({
          studentId: student._id,
          examId: { $in: examIds },
        }).populate("classOfferingId")
      : [];
    const markByExamSubject = new Map();
    marks.forEach((mark) => {
      const subjectId =
        mark.classOfferingId?.subjectId?._id?.toString?.() ||
        mark.classOfferingId?.subjectId?.toString?.();
      if (!subjectId) return;
      markByExamSubject.set(`${mark.examId.toString()}-${subjectId}`, mark);
    });

    const attendance = examIds.length
      ? await ExamAttendance.find({
          studentId: student._id,
          examId: { $in: examIds },
        })
      : [];
    const attendanceByExamSubject = new Map(
      attendance.map((record) => [
        `${record.examId.toString()}-${record.subjectId.toString()}`,
        record,
      ]),
    );

    const normalizedExams = exams.map((exam) => {
      const subjects = (exam.items || []).map((item) => {
        const subject = item.subjectId;
        const subjectId = subject?._id?.toString() || item.subjectId?.toString();
        const attendanceRecord = attendanceByExamSubject.get(
          `${exam._id.toString()}-${subjectId}`,
        );
        const isAbsent = attendanceRecord?.status === "absent";
        const mark = markByExamSubject.get(`${exam._id.toString()}-${subjectId}`);
        const obtainedMarks =
          isAbsent || mark?.obtained_marks == null
            ? null
            : Number(mark.obtained_marks);
        const percentage =
          obtainedMarks == null
            ? null
            : Number(((obtainedMarks / Number(exam.fullMarks || 100)) * 100).toFixed(1));
        const gradeInfo = gradeForPercent(percentage);
        const passed =
          isAbsent || obtainedMarks == null
            ? false
            : obtainedMarks >= Number(exam.passMarks || 0);

        return {
          subjectId,
          subjectName: subject?.subject_name || "Subject",
          subjectCode: subject?.subject_code || "",
          examDate: normalizeDate(item.examDate),
          examTime: item.examTime,
          fullMarks: Number(exam.fullMarks || 100),
          passMarks: Number(exam.passMarks || 0),
          obtainedMarks,
          percentage,
          grade: isAbsent ? "" : gradeInfo.grade,
          remark: isAbsent
            ? "Absent"
            : obtainedMarks == null
              ? "--"
              : gradeInfo.remark,
          status: isAbsent
            ? "absent"
            : obtainedMarks == null
              ? "pending"
              : passed
                ? "passed"
                : "failed",
          attendanceStatus: attendanceRecord?.status || "not_marked",
          classOfferingId:
            offeringBySubject.get(subjectId)?._id?.toString() || "",
        };
      });

      const enteredSubjects = subjects.filter((subject) => subject.obtainedMarks != null);
      const total = enteredSubjects.reduce(
        (sum, subject) => sum + Number(subject.obtainedMarks || 0),
        0,
      );
      const fullMarks = subjects.reduce(
        (sum, subject) => sum + Number(subject.fullMarks || 0),
        0,
      );
      const complete =
        subjects.length > 0 &&
        enteredSubjects.length === subjects.length &&
        subjects.every((subject) => subject.status !== "absent");
      const percentage =
        complete && fullMarks
          ? Number(((total / fullMarks) * 100).toFixed(1))
          : null;

      return {
        ...normalizeExam(exam),
        subjects,
        result: {
          total,
          fullMarks,
          enteredSubjectCount: enteredSubjects.length,
          subjectCount: subjects.length,
          percentage,
          complete,
          status: subjects.some((subject) => subject.status === "absent")
            ? "Absent"
            : subjects.some((subject) => subject.status === "failed")
              ? "Failed"
              : complete
                ? "Passed"
                : "Pending",
        },
      };
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student: {
            id: student._id.toString(),
            studentId: student.std_id,
            name: studentFullName(student),
            rollNo: student.roll_no,
          },
          classInfo: {
            facultyCode: faculty.faculty_code,
            facultyName: faculty.faculty_name,
            level: String(student.current_level),
            levelLabel:
              faculty.levels?.find((item) => item.value === Number(student.current_level))
                ?.label || `Level ${student.current_level}`,
            batch: String(student.admitted_batch),
          },
          exams: normalizedExams,
        },
        "Student academics retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const deleteExamSchedule = async (req, res, next) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw new ApiError(400, "Valid exam is required");
    }

    const deleted = await Exam.findByIdAndDelete(examId);
    if (!deleted) throw new ApiError(404, "Exam not found");

    res.status(200).json(new ApiResponse(200, null, "Exam deleted successfully"));
  } catch (error) {
    next(error);
  }
};
