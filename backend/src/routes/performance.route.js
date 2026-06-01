import express from "express";
import { getPerformanceLedger } from "../controllers/performance.controller.js";

const router = express.Router();

router.get("/", getPerformanceLedger);

export default router;
