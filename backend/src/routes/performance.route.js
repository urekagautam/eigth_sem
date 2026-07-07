import express from "express";
import {
  getPerformanceDataset,
  getPerformanceLedger,
  getStudentPerformanceDetail,
} from "../controllers/performance.controller.js";

const router = express.Router();

router.get("/", getPerformanceLedger);
router.get("/dataset", getPerformanceDataset);
router.get("/students/:studentId", getStudentPerformanceDetail);

export default router;
