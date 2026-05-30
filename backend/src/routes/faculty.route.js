import express from "express";
import {
  getFaculties,
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} from "../controllers/faculty.controller.js";

const router = express.Router();

router.get("/", getFaculties);
router.post("/", createFaculty);
router.get("/:facultyId", getFaculty);
router.put("/:facultyId", updateFaculty);
router.delete("/:facultyId", deleteFaculty);

export default router;
