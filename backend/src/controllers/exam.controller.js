import mongoose from "mongoose";
import { Exam } from "../models/exam.model.js";
import { Faculty } from "../models/faculty.model.js";
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
  const student = await Student.findOne({
    facultyId,
    current_level: Number(level),
    isActive: true,
    academic_status: { $ne: "graduated" },
  })
    .sort({ admitted_batch: -1 })
    .select("admitted_batch");

  return student?.admitted_batch ? Number(student.admitted_batch) : null;
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

export const createExamSchedule = async (req, res, next) => {
  try {
    const { title, facultyId, level, batch, fullMarks, passMarks, items } = req.body;

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
    const { title, fullMarks, passMarks, items } = req.body;

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
