import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

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
    },

    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },

    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index(
  { studentId: 1, facultyId: 1, level: 1, batch: 1, date: 1 },
  { unique: true },
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
