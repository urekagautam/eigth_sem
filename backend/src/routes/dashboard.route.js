import express from "express";
import {
  getAdminDashboard,
  getTeacherDashboard,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/admin", getAdminDashboard);
router.get("/teacher", getTeacherDashboard);

export default router;
