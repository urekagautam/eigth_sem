import mongoose, { Schema } from "mongoose";

const examItemSchema = new Schema(
  {
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    examDate: {
      type: Date,
      required: true,
    },

    examTime: {
      type: String,
      required: true,
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Exam time must be HH:mm"],
    },
  },
  { _id: true },
);

const examSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
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

    batch: {
      type: Number,
      required: true,
    },

    fullMarks: {
      type: Number,
      required: true,
      default: 100,
      min: 1,
    },

    passMarks: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    published: {
      type: Boolean,
      default: false,
    },

    items: {
      type: [examItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "At least one exam subject is required",
      },
    },
  },
  {
    timestamps: true,
  }
);

examSchema.index({ facultyId: 1, level: 1, batch: 1, createdAt: -1 });

export const Exam = mongoose.model("Exam", examSchema);
