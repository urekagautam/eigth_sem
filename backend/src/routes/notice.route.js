import express from "express";
import multer from "multer";
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  uploadNoticeImage,
} from "../controllers/notice.controller.js";

const router = express.Router();

// Use memory storage so we can forward the buffer to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Get all notices
router.get("/", getNotices);

// Get a single notice by ID
router.get("/:noticeId", getNoticeById);

// Create a new notice
router.post("/", createNotice);

// Upload image for a notice (multipart/form-data, field name: `image`)
router.post("/upload", upload.single("image"), uploadNoticeImage);

// Update a notice
router.put("/:noticeId", updateNotice);

// Delete a notice
router.delete("/:noticeId", deleteNotice);

export default router;
