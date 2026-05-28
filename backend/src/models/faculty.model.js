import mongoose, { Schema } from "mongoose";

const facultySchema = new Schema(
  {
    faculty_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    faculty_name: {
      type: String,
      required: true,
      trim: true,
    },

    structure: {
      type: String,
      enum: ["semester", "year"],
      required: true,
    },

    max_level: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Faculty = mongoose.model("Faculty", facultySchema);