import express from "express";
import {
  getPerformanceLedger,
  getStudentPerformanceDetail,
} from "../controllers/performance.controller.js";

const router = express.Router();

router.get("/", getPerformanceLedger);
router.get("/students/:studentId", getStudentPerformanceDetail);

export default router;
