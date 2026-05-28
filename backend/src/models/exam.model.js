import mongoose, { Schema } from "mongoose";

const examSchema = new Schema(
  {
    exam_name: {
      type: String,
      required: true,
      trim: true,
    },

    classOfferingId: {
      type: Schema.Types.ObjectId,
      ref: "ClassOffering",
      required: true,
    },

    exam_date: {
      type: Date,
      required: true,
    },

    total_marks: {
      type: Number,
      required: true,
    },

    pass_marks: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Exam = mongoose.model("Exam", examSchema);