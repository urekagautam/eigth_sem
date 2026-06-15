import express from "express";
import {
  getAdminQuizzes,
  getStudentQuiz,
  getStudentQuizzes,
  getTeacherQuizClass,
  getTeacherQuizContext,
  publishAdminQuiz,
  saveTeacherQuizDraft,
  sendTeacherQuizToAdmin,
  submitStudentQuiz,
} from "../controllers/quiz.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/teacher/context", getTeacherQuizContext);
router.get("/teacher/classes/:classOfferingId", getTeacherQuizClass);
router.put("/teacher/classes/:classOfferingId", saveTeacherQuizDraft);
router.post("/teacher/classes/:classOfferingId/send", sendTeacherQuizToAdmin);

router.get("/admin", getAdminQuizzes);
router.put("/admin/:quizId/publish", publishAdminQuiz);

router.get("/student", getStudentQuizzes);
router.get("/student/:quizId", getStudentQuiz);
router.post("/student/:quizId/submit", submitStudentQuiz);

export default router;
