import express from "express";
import {
  createExamSchedule,
  deleteExamSchedule,
  getExamSchedules,
  getStudentAcademics,
  updateExamSchedule,
} from "../controllers/exam.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", getExamSchedules);
router.get("/student/academics", verifyJWT, getStudentAcademics);
router.post("/", createExamSchedule);
router.put("/:examId", updateExamSchedule);
router.delete("/:examId", deleteExamSchedule);

export default router;
