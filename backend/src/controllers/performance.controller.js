import mongoose from "mongoose";
import { Exam } from "../models/exam.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Marks } from "../models/marks.model.js";
import { Student } from "../models/student.model.js";
import { Subject } from "../models/subject.model.js";
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

const calculateStudentExamResult = ({ student, exam, subjects, markMap }) => {
  const fullMarksPerSubject = Number(exam?.fullMarks) || 100;
  const subjectResults = subjects.map((subject) => {
    const mark = markMap.get(`${exam._id.toString()}-${student._id.toString()}-${subject._id}`);
    const obtainedMarks =
      mark?.obtained_marks == null ? null : Number(mark.obtained_marks);
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
      passed: gradeInfo ? gradeInfo.grade !== "F" : null,
    };
  });

  const enteredSubjects = subjectResults.filter(
    (item) => item.obtainedMarks != null,
  );
  const total = enteredSubjects.reduce((sum, item) => sum + item.obtainedMarks, 0);
  const fullMarks = subjectResults.reduce((sum, item) => sum + item.fullMarks, 0);
  const enteredFullMarks = enteredSubjects.reduce(
    (sum, item) => sum + item.fullMarks,
    0,
  );
  const percentage = enteredFullMarks ? (total / enteredFullMarks) * 100 : null;
  const gpa = enteredSubjects.length
    ? enteredSubjects.reduce((sum, item) => sum + item.gradePoint, 0) /
      enteredSubjects.length
    : null;
  const complete = subjectResults.length > 0 && enteredSubjects.length === subjectResults.length;
  const failed = enteredSubjects.some((item) => item.passed === false);

  return {
    student: normalizeStudent(student, exam.facultyId),
    subjectResults,
    total,
    fullMarks,
    enteredSubjectCount: enteredSubjects.length,
    subjectCount: subjectResults.length,
    percentage: round(percentage, 1),
    gpa: round(gpa),
    status: !enteredSubjects.length
      ? "No marks"
      : !complete
        ? "Incomplete"
        : failed
          ? "Failed"
          : "Passed",
    complete,
    failed,
  };
};

const calculateCumulativeGpa = ({ student, exams, subjectsById, fallbackSubjects, markMap }) => {
  const termGpas = exams
    .map((exam) => {
      const subjects = getExamSubjects(exam, subjectsById, fallbackSubjects);
      return calculateStudentExamResult({ student, exam, subjects, markMap }).gpa;
    })
    .filter((gpa) => gpa != null);

  if (!termGpas.length) return { cumulativeGpa: null, termCount: 0 };
  const cumulativeGpa =
    termGpas.reduce((sum, gpa) => sum + gpa, 0) / termGpas.length;
  return { cumulativeGpa: round(cumulativeGpa), termCount: termGpas.length };
};

const applyRanks = (rows) => {
  const rankedRows = rows
    .filter((row) => row.gpa != null)
    .sort((a, b) => b.gpa - a.gpa || b.total - a.total);

  let rank = 0;
  let previousKey = "";
  const rankMap = new Map();
  rankedRows.forEach((row, index) => {
    const key = `${row.gpa}-${row.total}`;
    if (key !== previousKey) rank = index + 1;
    previousKey = key;
    rankMap.set(row.student._id, rank);
  });

  return rows.map((row) => ({
    ...row,
    rank: rankMap.get(row.student._id) || "-",
  }));
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

    const rows = currentExam
      ? students.map((student) => {
          const result = calculateStudentExamResult({
            student,
            exam: currentExam,
            subjects: examSubjects,
            markMap,
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
