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
      default: null,
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

marksSchema.index(
  { studentId: 1, examId: 1, classOfferingId: 1 },
  { unique: true },
);

export const Marks = mongoose.model("Marks", marksSchema);
