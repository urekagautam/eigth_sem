import mongoose, { Schema } from "mongoose";

const noticeSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },
    font_style: {
      // legacy single-style field (kept for backward compatibility)
      bold: {
        type: Boolean,
        default: false,
      },
      italic: {
        type: Boolean,
        default: false,
      },
      underline: {
        type: Boolean,
        default: false,
      },
    },

    font_style_title: {
      isBold: { type: Boolean, default: false },
      isUnderline: { type: Boolean, default: false },
    },

    font_style_description: {
      isBold: { type: Boolean, default: false },
      isUnderline: { type: Boolean, default: false },
    },

    notice_image: {
      type: String, // Cloudinary URL later
      default: "",
    },

    image_caption: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Notice = mongoose.model("Notice", noticeSchema);
