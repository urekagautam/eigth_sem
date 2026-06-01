import express from "express";
import {
  deleteTeacherExamMark,
  getTeacherExamMarks,
  getTeacherMarksClass,
  getTeacherMarksContext,
  saveTeacherExamMarks,
} from "../controllers/teacherMarks.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/context", getTeacherMarksContext);
router.get("/classes/:classOfferingId", getTeacherMarksClass);
router.get("/classes/:classOfferingId/exams/:examId/marks", getTeacherExamMarks);
router.put("/classes/:classOfferingId/exams/:examId/marks", saveTeacherExamMarks);
router.delete(
  "/classes/:classOfferingId/exams/:examId/marks/:studentId",
  deleteTeacherExamMark,
);

export default router;
