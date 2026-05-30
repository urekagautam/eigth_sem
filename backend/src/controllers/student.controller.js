import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Student } from "../models/student.model.js";
import { Faculty } from "../models/faculty.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Helper to format/normalize flat Student mongoose model into nested frontend format
const normalizeStudent = (student) => {
  if (!student) return null;

  const faculty = student.facultyId;
  const facultyIdStr = faculty?._id ? faculty._id.toString() : student.facultyId?.toString() || "";
  const facultyCode = faculty?.faculty_code || faculty?.code || "";
  const facultyName = faculty?.faculty_name || faculty?.name || "";
  const structureType = faculty?.structure || faculty?.structureType || "semester";

  const SEMESTER_NAMES = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];
  const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

  const getLevelLabel = (struct, lvl) => {
    const names = struct === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
    const name = names[lvl - 1] || `Level ${lvl}`;
    return struct === "semester" ? `${name} Semester` : `${name} Year`;
  };

  const levelLabel = student.current_level ? getLevelLabel(structureType, student.current_level) : "";
  const currentClass = student.current_level
    ? `${facultyCode} — ${levelLabel} — Batch ${student.admitted_batch}`
    : "";

  return {
    _id: student._id,
    profile: {
      firstName: student.first_name,
      middleName: student.middle_name || "",
      lastName: student.last_name,
      gender: student.gender,
      bloodGroup: student.blood_group || "",
      email: student.email,
      mobile: student.mobile_no,
      citizenshipNo: student.citizenship_no || "",
    },
    studentId: student.std_id,
    universityRegNo: student.registration_no || "",
    universitySymbolNo: student.symbol_no || "",
    guardian: {
      name: student.guardian_name || "",
      mobile: student.guardian_mobile || "",
      fatherName: student.father_name || "",
      motherName: student.mother_name || "",
      fatherMobile: student.father_mobile || "",
      motherMobile: student.mother_mobile || "",
    },
    admission: {
      facultyId: facultyIdStr,
      facultyCode,
      facultyName,
      batch: String(student.admitted_batch),
    },
    enrollment: {
      status: student.isActive ? "active" : "inactive",
      structureType,
      currentLevel: student.current_level,
      currentLevelLabel: levelLabel,
      currentClass,
    },
    credentials: {
      username: student.username,
      hasPassword: !!student.password,
      password: student.plain_password || "",
      lastResetAt: student.updatedAt || student.createdAt,
    },
    roll_no: student.roll_no,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
};

// Helper to parse either flat or nested request body properties
const parseStudentBody = (body) => {
  const profile = body.profile || {};
  const guardian = body.guardian || {};
  const admission = body.admission || {};
  const enrollment = body.enrollment || {};
  const credentials = body.credentials || {};

  return {
    std_id: body.studentId || body.std_id,
    first_name: profile.firstName || body.first_name || body.firstName,
    middle_name: profile.middleName || body.middle_name || body.middleName || "",
    last_name: profile.lastName || body.last_name || body.lastName,
    facultyId: admission.facultyId || body.facultyId,
    current_level: Number(enrollment.currentLevel || body.current_level || body.currentLevel),
    admitted_batch: Number(admission.batch || body.admitted_batch || body.admittedBatch),
    roll_no: Number(body.roll_no || body.rollNo || 0),
    mobile_no: profile.mobile || body.mobile_no || body.mobile || body.mobileNo,
    email: profile.email || body.email,
    gender: profile.gender || body.gender,
    blood_group: profile.bloodGroup || body.blood_group || body.bloodGroup || "",
    citizenship_no: profile.citizenshipNo || body.citizenship_no || body.citizenshipNo || "",
    registration_no: body.universityRegNo || body.registration_no || body.registrationNo || "",
    symbol_no: body.universitySymbolNo || body.symbol_no || body.symbolNo || "",
    guardian_name: guardian.name || body.guardian_name || body.guardianName || "",
    guardian_mobile: guardian.mobile || body.guardian_mobile || body.guardianMobile || "",
    father_name: guardian.fatherName || body.father_name || body.fatherName || "",
    father_mobile: guardian.fatherMobile || body.father_mobile || body.fatherMobile || "",
    mother_name: guardian.motherName || body.mother_name || body.motherName || "",
    mother_mobile: guardian.motherMobile || body.mother_mobile || body.motherMobile || "",
    username: credentials.username || body.username,
    password: credentials.password || body.password,
  };
};

const getNextRollNo = async (facultyId, admitted_batch) => {
  const maxStudent = await Student.findOne({ facultyId, admitted_batch })
    .sort({ roll_no: -1 })
    .select("roll_no");
  return maxStudent && maxStudent.roll_no ? maxStudent.roll_no + 1 : 1;
};

// Create Student
export const createStudent = async (req, res, next) => {
  try {
    const parsed = parseStudentBody(req.body);

    if (!parsed.std_id || !parsed.first_name || !parsed.last_name || !parsed.facultyId || !parsed.current_level || !parsed.admitted_batch || !parsed.email || !parsed.mobile_no || !parsed.gender) {
      throw new ApiError(400, "Required fields are missing");
    }

    // Check if faculty exists
    const faculty = await Faculty.findById(parsed.facultyId);
    if (!faculty) {
      throw new ApiError(404, "Selected Faculty not found");
    }

    // Check unique email and std_id and username
    const existingStdId = await Student.findOne({ std_id: parsed.std_id });
    if (existingStdId) {
      throw new ApiError(409, "Student ID already exists");
    }

    const existingEmail = await Student.findOne({ email: parsed.email.toLowerCase() });
    if (existingEmail) {
      throw new ApiError(409, "Email already exists");
    }

    // Auto-generate username/password if not supplied
    if (!parsed.username) {
      parsed.username = `${parsed.first_name.toLowerCase()}.${parsed.last_name.toLowerCase()}`;
    }
    const finalUsername = parsed.username.trim().toLowerCase();

    const existingUsername = await Student.findOne({ username: finalUsername });
    if (existingUsername) {
      throw new ApiError(409, "Username already exists");
    }

    const tempPassword = parsed.password || `Tmp@${Math.random().toString(36).slice(2, 10)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Compute roll number if not provided or 0
    if (!parsed.roll_no) {
      parsed.roll_no = await getNextRollNo(parsed.facultyId, parsed.admitted_batch);
    }

    const student = await Student.create({
      ...parsed,
      email: parsed.email.toLowerCase().trim(),
      username: finalUsername,
      password: hashedPassword,
      plain_password: tempPassword,
    });

    const populatedStudent = await Student.findById(student._id).populate("facultyId");
    
    // Return temp password in credentials if auto-generated/supplied to show in client UI
    const responseData = normalizeStudent(populatedStudent);
    if (responseData && responseData.credentials) {
      responseData.credentials.password = tempPassword;
    }

    res.status(201).json(new ApiResponse(201, responseData, "Student created successfully"));
  } catch (error) {
    next(error);
  }
};

// Get Students (with faculty/level filters)
// Get Students (with faculty/level filters)
export const getStudents = async (req, res, next) => {
  try {
    const { facultyId, level } = req.query;
    const filter = { isActive: true };

    if (facultyId) {
      // Convert string to MongoDB ObjectId
      filter.facultyId = new mongoose.Types.ObjectId(facultyId);
    }
    if (level) {
      filter.current_level = Number(level);
    }

    const students = await Student.find(filter).populate("facultyId").sort({ createdAt: -1 });
    const formatted = students.map(normalizeStudent);

    res.status(200).json(new ApiResponse(200, formatted, "Students retrieved successfully"));
  } catch (error) {
    next(error);
  }
};

// Update Student
export const updateStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    const parsed = parseStudentBody(req.body);

    // Update fields if provided
    if (parsed.std_id && parsed.std_id !== student.std_id) {
      const existing = await Student.findOne({ std_id: parsed.std_id });
      if (existing) throw new ApiError(409, "Student ID already exists");
      student.std_id = parsed.std_id;
    }

    if (parsed.email && parsed.email.toLowerCase() !== student.email) {
      const existing = await Student.findOne({ email: parsed.email.toLowerCase() });
      if (existing) throw new ApiError(409, "Email already exists");
      student.email = parsed.email.toLowerCase().trim();
    }

    if (parsed.first_name) student.first_name = parsed.first_name;
    if (parsed.middle_name !== undefined) student.middle_name = parsed.middle_name;
    if (parsed.last_name) student.last_name = parsed.last_name;
    if (parsed.facultyId) student.facultyId = parsed.facultyId;
    if (parsed.current_level) student.current_level = parsed.current_level;
    if (parsed.admitted_batch) student.admitted_batch = parsed.admitted_batch;
    if (parsed.roll_no) student.roll_no = parsed.roll_no;
    if (parsed.mobile_no) student.mobile_no = parsed.mobile_no;
    if (parsed.gender) student.gender = parsed.gender;
    if (parsed.blood_group !== undefined) student.blood_group = parsed.blood_group;
    if (parsed.citizenship_no !== undefined) student.citizenship_no = parsed.citizenship_no;
    if (parsed.registration_no !== undefined) student.registration_no = parsed.registration_no;
    if (parsed.symbol_no !== undefined) student.symbol_no = parsed.symbol_no;
    if (parsed.guardian_name !== undefined) student.guardian_name = parsed.guardian_name;
    if (parsed.guardian_mobile !== undefined) student.guardian_mobile = parsed.guardian_mobile;
    if (parsed.father_name !== undefined) student.father_name = parsed.father_name;
    if (parsed.father_mobile !== undefined) student.father_mobile = parsed.father_mobile;
    if (parsed.mother_name !== undefined) student.mother_name = parsed.mother_name;
    if (parsed.mother_mobile !== undefined) student.mother_mobile = parsed.mother_mobile;

    if (parsed.password) {
      student.password = await bcrypt.hash(parsed.password, 10);
      student.plain_password = parsed.password;
    }

    await student.save();
    
    const populatedStudent = await Student.findById(student._id).populate("facultyId");
    res.status(200).json(new ApiResponse(200, normalizeStudent(populatedStudent), "Student updated successfully"));
  } catch (error) {
    next(error);
  }
};

// Delete Student (Soft Delete)
export const deleteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    student.isActive = false;
    await student.save();

    res.status(200).json(new ApiResponse(200, null, "Student deleted successfully"));
  } catch (error) {
    next(error);
  }
};
