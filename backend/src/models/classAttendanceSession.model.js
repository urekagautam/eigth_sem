import mongoose, { Schema } from "mongoose";

const classAttendanceSessionSchema = new Schema(
  {
    classOfferingId: {
      type: Schema.Types.ObjectId,
      ref: "ClassOffering",
      required: true,
    },

    facultyId: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
      index: true,
    },

    level: {
      type: Number,
      required: true,
      index: true,
    },

    batch: {
      type: Number,
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    totalStudents: {
      type: Number,
      required: true,
      default: 0,
    },

    presentCount: {
      type: Number,
      required: true,
      default: 0,
    },

    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
  },
  {
    timestamps: true,
  },
);

classAttendanceSessionSchema.index(
  { facultyId: 1, level: 1, batch: 1, date: 1 },
  { unique: true },
);

export const ClassAttendanceSession = mongoose.model(
  "ClassAttendanceSession",
  classAttendanceSessionSchema,
);
