import mongoose, { Schema } from "mongoose";

const subjectSchema = new Schema(
  {
    subject_name: {
      type: String,
      required: true,
      trim: true,
    },

    subject_code: {
      type: String,
      trim: true,
    },

    facultyId: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    level: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Subject = mongoose.model("Subject", subjectSchema);