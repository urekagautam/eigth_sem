import express from "express";
import {
  createExamSchedule,
  deleteExamSchedule,
  getExamSchedules,
  updateExamSchedule,
} from "../controllers/exam.controller.js";

const router = express.Router();

router.get("/", getExamSchedules);
router.post("/", createExamSchedule);
router.put("/:examId", updateExamSchedule);
router.delete("/:examId", deleteExamSchedule);

export default router;
