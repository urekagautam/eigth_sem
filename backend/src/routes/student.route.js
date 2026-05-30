import express from "express";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/student.controller.js";

const router = express.Router();

router.get("/", getStudents);
router.post("/", createStudent);
router.put("/:studentId", updateStudent);
router.delete("/:studentId", deleteStudent);

export default router;
