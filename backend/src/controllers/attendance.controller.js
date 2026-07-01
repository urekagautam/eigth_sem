import mongoose from "mongoose";
import { Attendance } from "../models/attendance.model.js";
import { ClassAttendanceSession } from "../models/classAttendanceSession.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamAttendance } from "../models/examAttendance.model.js";
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
  if (!dateValue) {
    throw new ApiError(400, "Valid attendance date is required");
  }
  const date =
    typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
      ? new Date(`${dateValue}T00:00:00`)
      : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Valid attendance date is required");
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (dateValue) => {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
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

const normalizeExamStudent = (student) => ({
  ...normalizeStudent(student),
  guardianName: student.guardian_name || "",
  guardianMobile: student.guardian_mobile || "",
  fatherName: student.father_name || "",
  fatherMobile: student.father_mobile || "",
  motherName: student.mother_name || "",
  motherMobile: student.mother_mobile || "",
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

const normalizeClassSession = (session) => ({
  id: session._id.toString(),
  classOfferingId:
    session.classOfferingId?._id?.toString() || session.classOfferingId.toString(),
  date: session.date.toISOString().slice(0, 10),
  totalStudents: session.totalStudents,
  presentCount: session.presentCount,
  markedBy: session.markedBy
    ? {
        id: session.markedBy._id?.toString() || session.markedBy.toString(),
        name: teacherFullName(session.markedBy),
      }
    : null,
  updatedAt: session.updatedAt,
});

const normalizeExamAttendance = (record) => ({
  id: record._id.toString(),
  examId: record.examId?.toString(),
  examItemId: record.examItemId?.toString(),
  studentId: record.studentId?._id?.toString() || record.studentId.toString(),
  status: record.status,
  examDate: record.examDate.toISOString().slice(0, 10),
  markedBy: record.markedBy
    ? {
        id: record.markedBy._id?.toString() || record.markedBy.toString(),
        name: record.markedBy.email || "Admin",
      }
    : null,
  updatedAt: record.updatedAt,
});

const normalizeClassExamSession = (exam, item) => ({
  examId: exam._id.toString(),
  examItemId: item._id.toString(),
  title: exam.title,
  subjectId: item.subjectId?._id?.toString() || item.subjectId?.toString(),
  subjectName: item.subjectId?.subject_name || "",
  subjectCode: item.subjectId?.subject_code || "",
  date: item.examDate.toISOString().slice(0, 10),
  time: item.examTime,
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

const classSessionGroupQuery = (offering) => attendanceGroupSet(offering);

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

const buildSummary = (records, students, totalClasses) => {
  const stats = new Map(
    students.map((student) => [
      student._id.toString(),
      {
        studentId: student._id.toString(),
        present: 0,
        absent: 0,
        total: totalClasses,
      },
    ]),
  );

  records.forEach((record) => {
    const studentId =
      record.studentId?._id?.toString() || record.studentId.toString();
    const item = stats.get(studentId);
    if (!item) return;
    item[record.status] += 1;
  });

  return Array.from(stats.values()).map((item) => ({
    ...item,
    absent: Math.max(item.total - item.present, item.absent),
    percentage: item.total ? Number(((item.present / item.total) * 100).toFixed(1)) : 0,
  }));
};

const countClassDatesFromRecords = (records) =>
  new Set(records.map((record) => record.date.toISOString().slice(0, 10))).size;

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
    const classSessions = await ClassAttendanceSession.find(
      classSessionGroupQuery(offering),
    )
      .populate("markedBy")
      .sort({ date: -1, updatedAt: -1 });
    const classTotal = Math.max(
      classSessions.length,
      countClassDatesFromRecords(records),
    );
    const exams = await Exam.find({
      facultyId: offering.facultyId._id,
      level: offering.level,
      batch: offering.batch,
    }).populate("items.subjectId");
    const examSessions = exams.flatMap((exam) =>
      (exam.items || []).map((item) => normalizeClassExamSession(exam, item)),
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          assignment: normalizeAssignment(offering),
          students: students.map(normalizeStudent),
          summary: buildSummary(records, students, classTotal),
          classTotal,
          classSessions: classSessions.map(normalizeClassSession),
          examSessions,
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
    const classSession = await ClassAttendanceSession.findOne({
      ...classSessionGroupQuery(offering),
      date,
    }).populate("markedBy");

    res.status(200).json(
      new ApiResponse(
        200,
        {
          records: records.map(normalizeAttendance),
          classSession: classSession ? normalizeClassSession(classSession) : null,
        },
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
    if (date > todayStart()) {
      throw new ApiError(400, "Attendance cannot be marked for future dates");
    }
    const examOnDate = await Exam.findOne({
      facultyId: offering.facultyId._id,
      level: offering.level,
      batch: offering.batch,
      "items.examDate": { $gte: date, $lte: endOfDay(date) },
    });
    if (examOnDate) {
      throw new ApiError(400, "This is an exam day. Regular attendance is not required");
    }
    const records = Array.isArray(req.body.records) ? req.body.records : [];

    const activeStudents = await Student.find(activeStudentFilterForOffering(offering)).select("_id");
    const validStudentIds = new Set(activeStudents.map((student) => student._id.toString()));
    const normalizedRecords = activeStudents.map((student) => {
      const submitted = records.find(
        (item) => String(item.studentId || "") === student._id.toString(),
      );
      return {
        studentId: student._id.toString(),
        status: submitted?.status === "present" ? "present" : "absent",
      };
    });
    const presentCount = normalizedRecords.filter(
      (item) => item.status === "present",
    ).length;

    if (presentCount === 0) {
      await Attendance.deleteMany({
        ...(await attendanceGroupQuery(offering)),
        date,
      });
      await ClassAttendanceSession.deleteOne({
        ...classSessionGroupQuery(offering),
        date,
      });

      res
        .status(200)
        .json(new ApiResponse(200, null, "No present students, so this date was not counted as a class"));
      return;
    }

    for (const item of normalizedRecords) {
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

    await ClassAttendanceSession.findOneAndUpdate(
      {
        ...classSessionGroupQuery(offering),
        date,
      },
      {
        $set: {
          classOfferingId: offering._id,
          ...attendanceGroupSet(offering),
          totalStudents: activeStudents.length,
          presentCount,
          markedBy: teacherId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

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
      const classSessions = await ClassAttendanceSession.find(
        classSessionGroupQuery(offering),
      )
        .populate("markedBy")
        .sort({ date: -1, updatedAt: -1 });

      const classTotal = Math.max(
        classSessions.length,
        countClassDatesFromRecords(records),
      );

      activeClasses.push({
        assignment: normalizeAssignment(offering, relatedOfferings),
        students: students.map(normalizeStudent),
        summary: buildSummary(records, students, classTotal),
        classTotal,
        classSessions: classSessions.map(normalizeClassSession),
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

const normalizeExamSession = (exam, item) => {
  const faculty = exam.facultyId;
  const subject = item.subjectId;

  return {
    examId: exam._id.toString(),
    examItemId: item._id.toString(),
    title: exam.title,
    facultyId: faculty?._id?.toString() || exam.facultyId?.toString(),
    facultyCode: faculty?.faculty_code || "",
    facultyName: faculty?.faculty_name || "",
    structureType: faculty?.structure || "semester",
    level: String(exam.level),
    levelLabel:
      faculty?.levels?.find((entry) => entry.value === exam.level)?.label ||
      `Level ${exam.level}`,
    batch: String(exam.batch),
    subjectId: subject?._id?.toString() || item.subjectId?.toString(),
    subjectName: subject?.subject_name || "",
    subjectCode: subject?.subject_code || "",
    date: item.examDate.toISOString().slice(0, 10),
    time: item.examTime,
    fullMarks: exam.fullMarks,
    published: exam.published,
  };
};

const getExamSession = async (examId, examItemId) => {
  if (
    !mongoose.Types.ObjectId.isValid(examId) ||
    !mongoose.Types.ObjectId.isValid(examItemId)
  ) {
    throw new ApiError(400, "Valid exam session is required");
  }

  const exam = await Exam.findById(examId)
    .populate("facultyId")
    .populate("items.subjectId");

  if (!exam) throw new ApiError(404, "Exam not found");

  const item = exam.items.id(examItemId);
  if (!item) throw new ApiError(404, "Exam subject session not found");

  const students = await Student.find({
    facultyId: exam.facultyId._id,
    current_level: exam.level,
    admitted_batch: exam.batch,
    isActive: true,
    academic_status: { $ne: "graduated" },
  }).sort({ roll_no: 1, std_id: 1 });

  return { exam, item, students };
};

export const getAdminExamAttendanceContext = async (req, res, next) => {
  try {
    ensureRole(req, "admin");

    const exams = await Exam.find({})
      .populate("facultyId")
      .populate("items.subjectId")
      .sort({ "items.examDate": -1, createdAt: -1 });

    const sessions = [];
    for (const exam of exams) {
      const activeStudentCount = await Student.countDocuments({
        facultyId: exam.facultyId?._id,
        current_level: exam.level,
        admitted_batch: exam.batch,
        isActive: true,
        academic_status: { $ne: "graduated" },
      });
      if (!activeStudentCount) continue;

      exam.items.forEach((item) => {
        sessions.push({
          ...normalizeExamSession(exam, item),
          studentCount: activeStudentCount,
        });
      });
    }

    sessions.sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
    );

    res.status(200).json(
      new ApiResponse(
        200,
        { sessions },
        "Exam attendance context retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminExamAttendanceSession = async (req, res, next) => {
  try {
    ensureRole(req, "admin");
    const { examId, examItemId } = req.params;
    const { exam, item, students } = await getExamSession(examId, examItemId);

    const records = await ExamAttendance.find({
      examId: exam._id,
      examItemId: item._id,
    }).populate("markedBy");
    const examRecords = await ExamAttendance.find({
      examId: exam._id,
    }).populate("markedBy");

    const absentStudentIds = new Set(
      records
        .filter((record) => record.status === "absent")
        .map((record) => record.studentId.toString()),
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          session: normalizeExamSession(exam, item),
          examSessions: exam.items
            .map((examItem) => normalizeExamSession(exam, examItem))
            .sort((a, b) =>
              `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
            ),
          students: students.map(normalizeExamStudent),
          records: records.map(normalizeExamAttendance),
          examRecords: examRecords.map(normalizeExamAttendance),
          absentStudents: students
            .filter((student) => absentStudentIds.has(student._id.toString()))
            .map(normalizeExamStudent),
        },
        "Exam attendance session retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const saveAdminExamAttendance = async (req, res, next) => {
  try {
    const adminId = ensureRole(req, "admin");
    const { examId, examItemId } = req.params;
    const { exam, item, students } = await getExamSession(examId, examItemId);
    const records = Array.isArray(req.body.records) ? req.body.records : [];
    const validStudentIds = new Set(students.map((student) => student._id.toString()));

    for (const record of records) {
      const studentId = String(record.studentId || "");
      if (!validStudentIds.has(studentId)) continue;

      await ExamAttendance.findOneAndUpdate(
        {
          examId: exam._id,
          examItemId: item._id,
          studentId,
        },
        {
          $set: {
            subjectId: item.subjectId._id || item.subjectId,
            facultyId: exam.facultyId._id,
            level: exam.level,
            batch: exam.batch,
            examDate: item.examDate,
            status: record.status === "present" ? "present" : "absent",
            markedBy: adminId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    res
      .status(200)
      .json(new ApiResponse(200, null, "Exam attendance saved successfully"));
  } catch (error) {
    next(error);
  }
};
