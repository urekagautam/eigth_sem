import express from "express";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from "../controllers/teacher.controller.js";

const router = express.Router();

router.get("/", getTeachers);
router.post("/", createTeacher);
router.put("/:teacherId", updateTeacher);
router.delete("/:teacherId", deleteTeacher);

export default router;
