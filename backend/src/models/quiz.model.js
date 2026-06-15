import mongoose, { Schema } from "mongoose";

const quizOptionSchema = new Schema(
  {
    label: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const quizQuestionSchema = new Schema({
  questionText: {
    type: String,
    default: "",
    trim: true,
  },
  options: {
    type: [quizOptionSchema],
    default: () => [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ],
  },
  correctOption: {
    type: String,
    enum: ["", "A", "B", "C", "D"],
    default: "",
  },
});

const quizSchema = new Schema(
  {
    classOfferingId: {
      type: Schema.Types.ObjectId,
      ref: "ClassOffering",
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
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
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "Online Quiz",
    },
    questions: {
      type: [quizQuestionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "published"],
      default: "draft",
    },
    submittedAt: {
      type: Date,
    },
    publishedAt: {
      type: Date,
    },
    availableFrom: {
      type: Date,
    },
    availableUntil: {
      type: Date,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  },
);

quizSchema.index({ classOfferingId: 1, teacherId: 1 }, { unique: true });
quizSchema.index({ facultyId: 1, level: 1, batch: 1, subjectId: 1, status: 1 });

export const Quiz = mongoose.model("Quiz", quizSchema);
