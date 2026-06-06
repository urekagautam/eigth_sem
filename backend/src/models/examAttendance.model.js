import mongoose, { Schema } from "mongoose";

const examAttendanceSchema = new Schema(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },

    examItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
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

    examDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },

    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

examAttendanceSchema.index(
  { examId: 1, examItemId: 1, studentId: 1 },
  { unique: true },
);

export const ExamAttendance = mongoose.model(
  "ExamAttendance",
  examAttendanceSchema,
);
