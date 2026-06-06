import { Notice } from "../models/notice.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v2 as cloudinary } from "cloudinary";

// Get all notices
const getNotices = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const notices = await Notice.find(query).sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, notices, "Notices retrieved successfully"));
});

// Get a single notice by ID
const getNoticeById = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;

  const notice = await Notice.findById(noticeId);

  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, notice, "Notice retrieved successfully"));
});

// Create a new notice
const createNotice = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    font_style = {},
    notice_image = "",
    image_caption = "",
    isActive = true,
  } = req.body;

  // Validate input
  if (!title && !description && !notice_image) {
    throw new ApiError(
      400,
      "At least one of title, description, or notice_image is required",
    );
  }

  const notice = new Notice({
    title: title || "",
    description: description || "",
    font_style: {
      bold: font_style.bold || false,
      italic: font_style.italic || false,
      underline: font_style.underline || false,
    },
    notice_image,
    image_caption,
    isActive,
  });

  const savedNotice = await notice.save();

  res
    .status(201)
    .json(new ApiResponse(201, savedNotice, "Notice created successfully"));
});

// Update a notice
const updateNotice = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;
  const {
    title,
    description,
    font_style,
    notice_image,
    image_caption,
    isActive,
  } = req.body;

  const notice = await Notice.findById(noticeId);

  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  // Update fields if provided
  if (title !== undefined) notice.title = title;
  if (description !== undefined) notice.description = description;
  if (font_style !== undefined) {
    notice.font_style = {
      bold: font_style.bold ?? notice.font_style.bold,
      italic: font_style.italic ?? notice.font_style.italic,
      underline: font_style.underline ?? notice.font_style.underline,
    };
  }
  if (notice_image !== undefined) notice.notice_image = notice_image;
  if (image_caption !== undefined) notice.image_caption = image_caption;
  if (isActive !== undefined) notice.isActive = isActive;

  const updatedNotice = await notice.save();

  res
    .status(200)
    .json(new ApiResponse(200, updatedNotice, "Notice updated successfully"));
});

// Delete a notice
const deleteNotice = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;

  const notice = await Notice.findByIdAndDelete(noticeId);

  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, notice, "Notice deleted successfully"));
});

// Upload notice image to Cloudinary
const uploadNoticeImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  // Configure cloudinary from env vars if not already configured elsewhere
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Convert buffer to data URI and upload
  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "notices",
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, { imagePath: result.secure_url }, "Image uploaded"),
    );
});

export {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  uploadNoticeImage,
};
