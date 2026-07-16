import express from "express";
import {
  deleteTeacherAttendanceRecord,
  getAdminGeneralAttendance,
  getAdminExamAttendanceContext,
  getAdminExamAttendanceSession,
  getTeacherAttendanceByDate,
  getTeacherAttendanceClass,
  getTeacherAttendanceContext,
  getStudentAttendanceSummary,
  saveAdminExamAttendance,
  saveTeacherAttendance,
} from "../controllers/attendance.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/student/summary", getStudentAttendanceSummary);

router.get("/teacher/context", getTeacherAttendanceContext);
router.get("/teacher/classes/:classOfferingId", getTeacherAttendanceClass);
router.get("/teacher/classes/:classOfferingId/records", getTeacherAttendanceByDate);
router.put("/teacher/classes/:classOfferingId/records", saveTeacherAttendance);
router.delete(
  "/teacher/classes/:classOfferingId/records/:attendanceId",
  deleteTeacherAttendanceRecord,
);

router.get("/admin/general", getAdminGeneralAttendance);
router.get("/admin/exam/context", getAdminExamAttendanceContext);
router.get(
  "/admin/exam/:examId/items/:examItemId",
  getAdminExamAttendanceSession,
);
router.put(
  "/admin/exam/:examId/items/:examItemId",
  saveAdminExamAttendance,
);

export default router;
