import express from "express";
import {
  assignSubjectTeacher,
  createSubject,
  getSubjects,
} from "../controllers/subject.controller.js";

const router = express.Router();

router.get("/", getSubjects);
router.post("/", createSubject);
router.put("/:subjectId/teacher", assignSubjectTeacher);

export default router;
