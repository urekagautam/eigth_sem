import mongoose, { Schema } from "mongoose";

const quizAnswerSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    selectedOption: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
  },
  { _id: false },
);

const quizSubmissionSchema = new Schema(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    answers: {
      type: [quizAnswerSchema],
      default: [],
    },
    obtainedMarks: {
      type: Number,
      default: 0,
    },
    fullMarks: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ["in_progress", "submitted"],
      default: "submitted",
      index: true,
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

quizSubmissionSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export const QuizSubmission = mongoose.model(
  "QuizSubmission",
  quizSubmissionSchema,
);
