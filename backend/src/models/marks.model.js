import mongoose, { Schema } from "mongoose";

const marksSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    classOfferingId: {
      type: Schema.Types.ObjectId,
      ref: "ClassOffering",
      required: true,
    },

    obtained_marks: {
      type: Number,
      required: true,
    },

    grade: {
      type: String,
      trim: true,
    },

    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
  },
  {
    timestamps: true,
  }
);

export const Marks = mongoose.model("Marks", marksSchema);