import mongoose from "mongoose";
import { ClassOffering } from "../models/classOffering.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamAttendance } from "../models/examAttendance.model.js";
import { Marks } from "../models/marks.model.js";
import { Student } from "../models/student.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const ensureTeacher = (req) => {
  if (req.user?.role !== "teacher") {
    throw new ApiError(403, "Teacher access is required");
  }
  return req.user._id;
};

const teacherFullName = (teacher) =>
  [teacher?.first_name, teacher?.middle_name, teacher?.last_name]
    .filter(Boolean)
    .join(" ");

const studentFullName = (student) =>
  [student?.first_name, student?.middle_name, student?.last_name]
    .filter(Boolean)
    .join(" ");

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
    structureType: faculty.structure,
    level: String(offering.level),
    levelLabel:
      faculty.levels?.find((item) => item.value === offering.level)?.label ||
      `Level ${offering.level}`,
    batch: String(offering.batch),
    subjectId: subject._id.toString(),
    subjectName: subject.subject_name,
    subjectCode: subject.subject_code || "",
    teacherName: teacherFullName(offering.teacherId),
  };
};

const normalizeStudent = (student) => ({
  _id: student._id.toString(),
  studentId: student.std_id,
  rollNo: student.roll_no,
  name: studentFullName(student),
});

const normalizeExam = (exam, subjectId) => {
  const item = exam.items.find(
    (entry) => entry.subjectId?.toString() === subjectId?.toString(),
  );
  return {
    id: exam._id.toString(),
    title: exam.title,
    fullMarks: exam.fullMarks,
    passMarks: exam.passMarks,
    published: exam.published,
    date: item?.examDate ? item.examDate.toISOString().slice(0, 10) : "",
    time: item?.examTime || "",
    examItemId: item?._id?.toString() || "",
    createdAt: exam.createdAt,
  };
};

export const getTeacherMarksContext = async (req, res, next) => {
  try {
    const teacherId = ensureTeacher(req);

    const offerings = await ClassOffering.find({
      teacherId,
      isActive: true,
    })
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

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { assignments: activeOfferings.map(normalizeAssignment) },
          "Teacher marks context retrieved successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const getTeacherMarksClass = async (req, res, next) => {
  try {
    const teacherId = ensureTeacher(req);
    const { classOfferingId } = req.params;
    const offering = await getTeacherOffering(teacherId, classOfferingId);

    const students = await Student.find({
      facultyId: offering.facultyId._id,
      current_level: offering.level,
      admitted_batch: offering.batch,
      isActive: true,
      academic_status: { $ne: "graduated" },
    }).sort({ roll_no: 1, std_id: 1 });

    const exams = await Exam.find({
      facultyId: offering.facultyId._id,
      level: offering.level,
      batch: offering.batch,
      "items.subjectId": offering.subjectId._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          assignment: normalizeAssignment(offering),
          students: students.map(normalizeStudent),
          exams: exams.map((exam) => normalizeExam(exam, offering.subjectId._id)),
        },
        "Teacher marks class retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getTeacherExamMarks = async (req, res, next) => {
  try {
    const teacherId = ensureTeacher(req);
    const { classOfferingId, examId } = req.params;
    const offering = await getTeacherOffering(teacherId, classOfferingId);

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw new ApiError(400, "Valid exam is required");
    }

    const exam = await Exam.findOne({
      _id: examId,
      facultyId: offering.facultyId._id,
      level: offering.level,
      batch: offering.batch,
      "items.subjectId": offering.subjectId._id,
    });
    if (!exam) throw new ApiError(404, "Exam not found for this subject");

    const marks = await Marks.find({
      classOfferingId: offering._id,
      examId,
    });
    const examItem = exam.items.find(
      (item) => item.subjectId?.toString() === offering.subjectId._id.toString(),
    );
    const attendance = examItem
      ? await ExamAttendance.find({
          examId: exam._id,
          examItemId: examItem._id,
        })
      : [];
    const attendanceTaken = attendance.length > 0;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          attendanceTaken,
          marks: marks.map((mark) => ({
            id: mark._id.toString(),
            studentId: mark.studentId.toString(),
            obtainedMarks: mark.obtained_marks,
            grade: mark.grade || "",
          })),
          attendance: attendance.map((record) => ({
            studentId: record.studentId.toString(),
            status: record.status,
          })),
        },
        "Marks retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const saveTeacherExamMarks = async (req, res, next) => {
  try {
    const teacherId = ensureTeacher(req);
    const { classOfferingId, examId } = req.params;
    const { marks = [] } = req.body;
    const offering = await getTeacherOffering(teacherId, classOfferingId);

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw new ApiError(400, "Valid exam is required");
    }

    const exam = await Exam.findOne({
      _id: examId,
      facultyId: offering.facultyId._id,
      level: offering.level,
      batch: offering.batch,
      "items.subjectId": offering.subjectId._id,
    });
    if (!exam) throw new ApiError(404, "Exam not found for this subject");
    if (exam.published) {
      throw new ApiError(400, "Published exam marks cannot be changed");
    }
    const examItem = exam.items.find(
      (item) => item.subjectId?.toString() === offering.subjectId._id.toString(),
    );

    const activeStudents = await Student.find({
      facultyId: offering.facultyId._id,
      current_level: offering.level,
      admitted_batch: offering.batch,
      isActive: true,
      academic_status: { $ne: "graduated" },
    }).select("_id");
    const validStudentIds = new Set(
      activeStudents.map((student) => student._id.toString()),
    );
    const attendanceRecords = examItem
      ? await ExamAttendance.find({
          examId: exam._id,
          examItemId: examItem._id,
        }).select("studentId status")
      : [];

    if (!attendanceRecords.length) {
      throw new ApiError(400, "Exam attendance must be marked before entering marks");
    }

    const presentStudentIds = new Set(
      attendanceRecords
        .filter((record) => record.status === "present")
        .map((record) => record.studentId.toString()),
    );

    for (const item of marks) {
      if (!validStudentIds.has(String(item.studentId))) continue;
      if (!presentStudentIds.has(String(item.studentId))) {
        await Marks.deleteOne({
          studentId: item.studentId,
          examId,
          classOfferingId: offering._id,
        });
        continue;
      }
      if (item.obtainedMarks === "" || item.obtainedMarks == null) {
        await Marks.deleteOne({
          studentId: item.studentId,
          examId,
          classOfferingId: offering._id,
        });
        continue;
      }

      const obtainedMarks = Number(item.obtainedMarks);
      if (
        Number.isNaN(obtainedMarks) ||
        obtainedMarks < 0 ||
        obtainedMarks > Number(exam.fullMarks || 100)
      ) {
        throw new ApiError(400, "Marks must be within the exam full marks");
      }

      await Marks.findOneAndUpdate(
        {
          studentId: item.studentId,
          examId,
          classOfferingId: offering._id,
        },
        {
          $set: {
            obtained_marks: obtainedMarks,
            enteredBy: teacherId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    res.status(200).json(new ApiResponse(200, null, "Marks saved successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteTeacherExamMark = async (req, res, next) => {
  try {
    const teacherId = ensureTeacher(req);
    const { classOfferingId, examId, studentId } = req.params;
    const offering = await getTeacherOffering(teacherId, classOfferingId);

    const exam = await Exam.findById(examId);
    if (!exam) throw new ApiError(404, "Exam not found");
    if (exam.published) {
      throw new ApiError(400, "Published exam marks cannot be changed");
    }

    await Marks.deleteOne({
      studentId,
      examId,
      classOfferingId: offering._id,
    });

    res.status(200).json(new ApiResponse(200, null, "Mark deleted successfully"));
  } catch (error) {
    next(error);
  }
};
