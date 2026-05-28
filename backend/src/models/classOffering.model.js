import mongoose, { Schema } from "mongoose";

const classOfferingSchema = new Schema(
  {
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

    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ClassOffering = mongoose.model("ClassOffering", classOfferingSchema);