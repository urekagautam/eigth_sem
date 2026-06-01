import express from "express";
import {
  createExamSchedule,
  deleteExamSchedule,
  getExamSchedules,
} from "../controllers/exam.controller.js";

const router = express.Router();

router.get("/", getExamSchedules);
router.post("/", createExamSchedule);
router.delete("/:examId", deleteExamSchedule);

export default router;
