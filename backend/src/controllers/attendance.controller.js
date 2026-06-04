import mongoose from "mongoose";
import { Attendance } from "../models/attendance.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import { Student } from "../models/student.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const ensureRole = (req, role) => {
  if (req.user?.role !== role) {
    throw new ApiError(403, `${role[0].toUpperCase()}${role.slice(1)} access is required`);
  }
  return req.user._id;
};

const startOfDay = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Valid attendance date is required");
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const teacherFullName = (teacher) =>
  [teacher?.first_name, teacher?.middle_name, teacher?.last_name]
    .filter(Boolean)
    .join(" ");

const studentFullName = (student) =>
  [student?.first_name, student?.middle_name, student?.last_name]
    .filter(Boolean)
    .join(" ");

const classGroupKey = (offering) =>
  `${offering.facultyId._id || offering.facultyId}:${offering.level}:${offering.batch}`;

const normalizeAssignment = (offering, relatedOfferings = [offering]) => {
  const faculty = offering.facultyId;
  const subjects = relatedOfferings
    .filter((item) => item.subjectId)
    .map((item) => ({
      subjectId: item.subjectId._id.toString(),
      subjectName: item.subjectId.subject_name,
      subjectCode: item.subjectId.subject_code || "",
      teacherName: teacherFullName(item.teacherId),
    }));

  return {
    classOfferingId: offering._id.toString(),
    facultyId: faculty._id.toString(),
    facultyCode: faculty.faculty_code,
    facultyName: faculty.faculty_name,
    structureType: faculty.structure,
    level: String(offering.level),
    levelLabel:
      faculty.levels?.find((item) => item.value === offering.level)?.label ||
      `Level ${offering.level}`,
    batch: String(offering.batch),
    subjects,
    subjectId: subjects[0]?.subjectId || "",
    subjectName: subjects.map((subject) => subject.subjectName).join(", "),
    subjectCode: subjects[0]?.subjectCode || "",
    teacherName: teacherFullName(offering.teacherId),
  };
};

const normalizeStudent = (student) => ({
  _id: student._id.toString(),
  studentId: student.std_id,
  rollNo: student.roll_no,
  name: studentFullName(student),
});

const normalizeAttendance = (record) => ({
  id: record._id.toString(),
  studentId: record.studentId?._id?.toString() || record.studentId.toString(),
  classOfferingId:
    record.classOfferingId?._id?.toString() || record.classOfferingId.toString(),
  date: record.date.toISOString().slice(0, 10),
  status: record.status,
  markedBy: record.markedBy
    ? {
        id: record.markedBy._id?.toString() || record.markedBy.toString(),
        name: teacherFullName(record.markedBy),
      }
    : null,
  updatedAt: record.updatedAt,
});

const activeStudentFilterForOffering = (offering) => ({
  facultyId: offering.facultyId._id,
  current_level: offering.level,
  admitted_batch: offering.batch,
  isActive: true,
  academic_status: { $ne: "graduated" },
});

const attendanceGroupSet = (offering) => ({
  facultyId: offering.facultyId._id,
  level: offering.level,
  batch: offering.batch,
});

const attendanceGroupQuery = async (offering) => {
  const relatedOfferings = await ClassOffering.find({
    facultyId: offering.facultyId._id,
    level: offering.level,
    batch: offering.batch,
    isActive: true,
  }).select("_id");

  return {
    $or: [
      attendanceGroupSet(offering),
      { classOfferingId: { $in: relatedOfferings.map((item) => item._id) } },
    ],
  };
};

const getTeacherOffering = async (teacherId, classOfferingId) => {
  if (!mongoose.Types.ObjectId.isValid(classOfferingId)) {
    throw new ApiError(400, "Valid class offering is required");
  }

  const offering = await ClassOffering.findOne({
    _id: classOfferingId,
    teacherId,
    isActive: true,
  })
    .populate("facultyId")
    .populate("subjectId")
    .populate("teacherId");

  if (!offering) {
    throw new ApiError(404, "Active teacher assignment not found");
  }

  const activeStudentCount = await Student.countDocuments(
    activeStudentFilterForOffering(offering),
  );

  if (!activeStudentCount) {
    throw new ApiError(400, "This class is not active anymore");
  }

  return offering;
};

const getActiveOfferingsForTeacher = async (teacherId) => {
  const offerings = await ClassOffering.find({ teacherId, isActive: true })
    .populate("facultyId")
    .populate("subjectId")
    .populate("teacherId")
    .sort({ createdAt: -1 });

  const activeOfferings = [];
  for (const offering of offerings) {
    if (!offering.facultyId || !offering.subjectId) continue;
    const count = await Student.countDocuments(activeStudentFilterForOffering(offering));
    if (count > 0) activeOfferings.push(offering);
  }
  return activeOfferings;
};

const dedupeClassGroups = (offerings) => {
  const groups = new Map();
  offerings.forEach((offering) => {
    const key = classGroupKey(offering);
    const existing = groups.get(key);
    if (existing) {
      existing.relatedOfferings.push(offering);
    } else {
      groups.set(key, { offering, relatedOfferings: [offering] });
    }
  });
  return Array.from(groups.values());
};

const buildSummary = (records, students) => {
  const stats = new Map(
    students.map((student) => [
      student._id.toString(),
      { studentId: student._id.toString(), present: 0, absent: 0, total: 0 },
    ]),
  );

  records.forEach((record) => {
    const studentId =
      record.studentId?._id?.toString() || record.studentId.toString();
    const item = stats.get(studentId);
    if (!item) return;
    item.total += 1;
    item[record.status] += 1;
  });

  return Array.from(stats.values()).map((item) => ({
    ...item,
    percentage: item.total ? Number(((item.present / item.total) * 100).toFixed(1)) : 0,
  }));
};

export const getTeacherAttendanceContext = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const offerings = await getActiveOfferingsForTeacher(teacherId);
    const groups = dedupeClassGroups(offerings);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          assignments: groups.map(({ offering, relatedOfferings }) =>
            normalizeAssignment(offering, relatedOfferings),
          ),
        },
        "Teacher attendance context retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getTeacherAttendanceClass = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const offering = await getTeacherOffering(teacherId, req.params.classOfferingId);

    const students = await Student.find(activeStudentFilterForOffering(offering)).sort({
      roll_no: 1,
      std_id: 1,
    });

    const records = await Attendance.find(await attendanceGroupQuery(offering))
      .populate("markedBy")
      .sort({ date: -1, updatedAt: -1 });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          assignment: normalizeAssignment(offering),
          students: students.map(normalizeStudent),
          summary: buildSummary(records, students),
        },
        "Teacher attendance class retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getTeacherAttendanceByDate = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const offering = await getTeacherOffering(teacherId, req.params.classOfferingId);
    const date = startOfDay(req.query.date);

    const records = await Attendance.find({
      ...(await attendanceGroupQuery(offering)),
      date,
    }).populate("markedBy");

    res.status(200).json(
      new ApiResponse(
        200,
        { records: records.map(normalizeAttendance) },
        "Attendance records retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const saveTeacherAttendance = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const offering = await getTeacherOffering(teacherId, req.params.classOfferingId);
    const date = startOfDay(req.body.date);
    const records = Array.isArray(req.body.records) ? req.body.records : [];

    const activeStudents = await Student.find(activeStudentFilterForOffering(offering)).select("_id");
    const validStudentIds = new Set(activeStudents.map((student) => student._id.toString()));

    for (const item of records) {
      const studentId = String(item.studentId || "");
      if (!validStudentIds.has(studentId)) continue;

      const status = item.status === "present" ? "present" : "absent";
      const existingRecord = await Attendance.findOne({
        ...(await attendanceGroupQuery(offering)),
        studentId,
        date,
      });

      if (existingRecord) {
        existingRecord.status = status;
        existingRecord.markedBy = teacherId;
        existingRecord.classOfferingId = offering._id;
        existingRecord.facultyId = offering.facultyId._id;
        existingRecord.level = offering.level;
        existingRecord.batch = offering.batch;
        await existingRecord.save();
      } else {
        await Attendance.create({
          studentId,
          classOfferingId: offering._id,
          ...attendanceGroupSet(offering),
          date,
          status,
          markedBy: teacherId,
        });
      }
    }

    res.status(200).json(new ApiResponse(200, null, "Attendance saved successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteTeacherAttendanceRecord = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const offering = await getTeacherOffering(teacherId, req.params.classOfferingId);

    await Attendance.deleteOne({
      _id: req.params.attendanceId,
      ...(await attendanceGroupQuery(offering)),
    });

    res.status(200).json(new ApiResponse(200, null, "Attendance record deleted successfully"));
  } catch (error) {
    next(error);
  }
};

export const getAdminGeneralAttendance = async (req, res, next) => {
  try {
    ensureRole(req, "admin");
    const { facultyId, level, batch, classOfferingId } = req.query;

    const offeringFilter = { isActive: true };
    if (classOfferingId) offeringFilter._id = classOfferingId;
    if (facultyId) offeringFilter.facultyId = facultyId;
    if (level) offeringFilter.level = Number(level);
    if (batch) offeringFilter.batch = Number(batch);

    const offerings = await ClassOffering.find(offeringFilter)
      .populate("facultyId")
      .populate("subjectId")
      .populate("teacherId")
      .sort({ createdAt: -1 });

    const activeClasses = [];
    const groups = dedupeClassGroups(offerings);
    for (const { offering, relatedOfferings } of groups) {
      if (!offering.facultyId || !offering.subjectId) continue;
      const students = await Student.find(activeStudentFilterForOffering(offering)).sort({
        roll_no: 1,
        std_id: 1,
      });
      if (!students.length) continue;

      const records = await Attendance.find(await attendanceGroupQuery(offering))
        .populate("markedBy")
        .sort({ date: -1, updatedAt: -1 });

      activeClasses.push({
        assignment: normalizeAssignment(offering, relatedOfferings),
        students: students.map(normalizeStudent),
        summary: buildSummary(records, students),
        records: records.map(normalizeAttendance),
      });
    }

    res.status(200).json(
      new ApiResponse(
        200,
        { classes: activeClasses },
        "General attendance retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};
