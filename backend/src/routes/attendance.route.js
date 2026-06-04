import express from "express";
import {
  deleteTeacherAttendanceRecord,
  getAdminGeneralAttendance,
  getTeacherAttendanceByDate,
  getTeacherAttendanceClass,
  getTeacherAttendanceContext,
  saveTeacherAttendance,
} from "../controllers/attendance.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/teacher/context", getTeacherAttendanceContext);
router.get("/teacher/classes/:classOfferingId", getTeacherAttendanceClass);
router.get("/teacher/classes/:classOfferingId/records", getTeacherAttendanceByDate);
router.put("/teacher/classes/:classOfferingId/records", saveTeacherAttendance);
router.delete(
  "/teacher/classes/:classOfferingId/records/:attendanceId",
  deleteTeacherAttendanceRecord,
);

router.get("/admin/general", getAdminGeneralAttendance);

export default router;
