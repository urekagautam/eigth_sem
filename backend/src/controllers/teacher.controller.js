import bcrypt from "bcryptjs";
import { Teacher } from "../models/teacher.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const normalizeTeacher = (teacher, assignedSubjects = []) => ({
  _id: teacher._id,
  profile: {
    firstName: teacher.first_name,
    middleName: teacher.middle_name || "",
    lastName: teacher.last_name,
    phone: teacher.mobile_no,
    email: teacher.email,
    address: teacher.address || "",
  },
  credentials: {
    username: teacher.username,
    hasPassword: !!teacher.password,
    password: teacher.plain_password || "",
    lastResetAt: teacher.updatedAt || teacher.createdAt,
  },
  assignedSubjects,
  createdAt: teacher.createdAt,
  updatedAt: teacher.updatedAt,
});

const parseTeacherBody = (body) => {
  const profile = body.profile || {};
  const credentials = body.credentials || {};

  return {
    first_name: profile.firstName || body.first_name || body.firstName,
    middle_name: profile.middleName || body.middle_name || body.middleName || "",
    last_name: profile.lastName || body.last_name || body.lastName,
    mobile_no: profile.phone || body.mobile_no || body.mobile || body.phone,
    email: profile.email || body.email,
    address: profile.address || body.address || "",
    username: credentials.username || body.username,
    password: credentials.password || body.password,
  };
};

const getActiveAssignedSubjectsByTeacher = async (teacherIds) => {
  if (!teacherIds.length) return new Map();

  const offerings = await ClassOffering.find({
    teacherId: { $in: teacherIds },
  })
    .populate("facultyId")
    .populate("subjectId")
    .sort({ createdAt: -1 });

  const activeBatchMap = new Map();
  const latestActiveBatchMap = new Map();
  const activeOfferings = await ClassOffering.find({ isActive: true }).select(
    "facultyId level batch",
  );
  activeOfferings.forEach((offering) => {
    const key = `${offering.facultyId?.toString()}-${offering.level}`;
    const batches = activeBatchMap.get(key) || new Set();
    const batch = Number(offering.batch);
    batches.add(String(batch));
    activeBatchMap.set(key, batches);

    const latestBatch = latestActiveBatchMap.get(key) || 0;
    if (batch > latestBatch) {
      latestActiveBatchMap.set(key, batch);
    }
  });

  const map = new Map();
  offerings.forEach((offering) => {
    const faculty = offering.facultyId;
    const subject = offering.subjectId;
    if (!faculty || !subject) return;

    const activeBatches = activeBatchMap.get(
      `${faculty._id.toString()}-${offering.level}`,
    );
    const latestActiveBatch = latestActiveBatchMap.get(
      `${faculty._id.toString()}-${offering.level}`,
    );
    const isCurrentBatch =
      offering.isActive &&
      activeBatches?.has(String(offering.batch)) &&
      Number(offering.batch) === Number(latestActiveBatch);

    const teacherId = offering.teacherId.toString();
    const current = map.get(teacherId) || [];
    current.push({
      _id: offering._id,
      subjectId: subject._id,
      name: subject.subject_name,
      code: subject.subject_code || "",
      facultyId: faculty._id,
      facultyCode: faculty.faculty_code,
      facultyName: faculty.faculty_name,
      level: offering.level,
      levelLabel:
        faculty.levels?.find((level) => level.value === offering.level)?.label ||
        `Level ${offering.level}`,
      batch: String(offering.batch),
      status: isCurrentBatch ? "current" : "completed",
      statusLabel: isCurrentBatch ? "Current" : "Completed",
    });
    map.set(teacherId, current);
  });

  return map;
};

export const getTeachers = async (req, res, next) => {
  try {
    const teachers = await Teacher.find({ isActive: true }).sort({
      createdAt: -1,
    });
    const assignmentMap = await getActiveAssignedSubjectsByTeacher(
      teachers.map((teacher) => teacher._id),
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          teachers.map((teacher) =>
            normalizeTeacher(teacher, assignmentMap.get(teacher._id.toString()) || []),
          ),
          "Teachers retrieved successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req, res, next) => {
  try {
    const parsed = parseTeacherBody(req.body);

    if (
      !parsed.first_name ||
      !parsed.last_name ||
      !parsed.mobile_no ||
      !parsed.email
    ) {
      throw new ApiError(400, "Required fields are missing");
    }

    const email = parsed.email.toLowerCase().trim();
    const existingEmail = await Teacher.findOne({ email });
    if (existingEmail) throw new ApiError(409, "Email already exists");

    const username = (
      parsed.username ||
      `${parsed.first_name}.${parsed.last_name}`
    )
      .trim()
      .toLowerCase();

    const existingUsername = await Teacher.findOne({ username });
    if (existingUsername) throw new ApiError(409, "Username already exists");

    const tempPassword =
      parsed.password || `Tmp@${Math.random().toString(36).slice(2, 10)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const teacher = await Teacher.create({
      ...parsed,
      email,
      username,
      password: hashedPassword,
      plain_password: tempPassword,
    });

    const responseData = normalizeTeacher(teacher);
    responseData.credentials.password = tempPassword;

    res
      .status(201)
      .json(new ApiResponse(201, responseData, "Teacher created successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new ApiError(404, "Teacher not found");

    const parsed = parseTeacherBody(req.body);

    if (parsed.email && parsed.email.toLowerCase() !== teacher.email) {
      const existing = await Teacher.findOne({
        email: parsed.email.toLowerCase(),
      });
      if (existing) throw new ApiError(409, "Email already exists");
      teacher.email = parsed.email.toLowerCase().trim();
    }

    if (parsed.first_name) teacher.first_name = parsed.first_name;
    if (parsed.middle_name !== undefined) teacher.middle_name = parsed.middle_name;
    if (parsed.last_name) teacher.last_name = parsed.last_name;
    if (parsed.mobile_no) teacher.mobile_no = parsed.mobile_no;
    if (parsed.address !== undefined) teacher.address = parsed.address;

    if (parsed.password) {
      teacher.password = await bcrypt.hash(parsed.password, 10);
      teacher.plain_password = parsed.password;
    }

    await teacher.save();

    const assignmentMap = await getActiveAssignedSubjectsByTeacher([teacher._id]);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          normalizeTeacher(teacher, assignmentMap.get(teacher._id.toString()) || []),
          "Teacher updated successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const deleteTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new ApiError(404, "Teacher not found");

    teacher.isActive = false;
    await teacher.save();

    res.status(200).json(new ApiResponse(200, null, "Teacher deleted successfully"));
  } catch (error) {
    next(error);
  }
};
