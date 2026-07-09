import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAbsentSubjectIdsByExam,
  buildAbsentSubjectIdsByStudent,
} from "./performance.controller.js";

test("buildAbsentSubjectIdsByExam groups subject-specific absences by exam", () => {
  const records = [
    { examId: { toString: () => "exam-1" }, subjectId: { toString: () => "subject-1" }, status: "absent" },
    { examId: { toString: () => "exam-1" }, subjectId: { toString: () => "subject-2" }, status: "present" },
    { examId: { toString: () => "exam-2" }, subjectId: { toString: () => "subject-3" }, status: "absent" },
  ];

  const result = buildAbsentSubjectIdsByExam(records);

  assert.deepEqual([...result.get("exam-1")], ["subject-1"]);
  assert.deepEqual([...result.get("exam-2")], ["subject-3"]);
});

test("buildAbsentSubjectIdsByStudent keeps present subject attendance from becoming absent", () => {
  const records = [
    {
      studentId: { toString: () => "student-1" },
      examId: { toString: () => "exam-1" },
      subjectId: { toString: () => "subject-1" },
      status: "present",
    },
    {
      studentId: { toString: () => "student-1" },
      examId: { toString: () => "exam-1" },
      subjectId: { toString: () => "subject-2" },
      status: "present",
    },
    {
      studentId: { toString: () => "student-1" },
      examId: { toString: () => "exam-1" },
      subjectId: { toString: () => "subject-3" },
      status: "absent",
    },
  ];

  const result = buildAbsentSubjectIdsByStudent(records);

  assert.deepEqual([...result.get("student-1").get("exam-1")], ["subject-3"]);
});
