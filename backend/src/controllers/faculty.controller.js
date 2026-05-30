import { Faculty } from "../models/faculty.model.js";
import { ApiError } from "../utils/ApiError.js";

const buildFacultyLevels = (structure, maxLevel) => {
  const limit = structure === "semester" ? 8 : 5;
  const count = Math.min(Math.max(Number(maxLevel) || 1, 1), limit);
  return Array.from({ length: count }, (_, index) => {
    const level = index + 1;
    const label =
      structure === "semester"
        ? ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"][index] || `Level ${level}`
        : ["First", "Second", "Third", "Fourth", "Fifth"][index] || `Level ${level}`;
    return {
      value: level,
      label: structure === "semester" ? `${label} Semester` : `${label} Year`,
    };
  });
};

const normalizeFaculty = (faculty) => ({
  _id: faculty._id,
  id: faculty._id,
  code: faculty.faculty_code,
  name: faculty.faculty_name,
  structureType: faculty.structure,
  maxLevel: faculty.max_level,
  createdAt: faculty.createdAt,
  levels: buildFacultyLevels(faculty.structure, faculty.max_level),
});

export const getFaculties = async (req, res, next) => {
  try {
    const faculties = await Faculty.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: faculties.map(normalizeFaculty) });
  } catch (error) {
    next(error);
  }
};

export const createFaculty = async (req, res, next) => {
  try {
    const { code, name, structureType, maxLevel } = req.body;

    if (!code?.trim() || !name?.trim()) {
      throw new ApiError(400, "Faculty name and code are required");
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedName = name.trim();
    const structure = structureType === "year" ? "year" : "semester";
    const maxLevelValue = Number(maxLevel) || (structure === "semester" ? 8 : 4);
    const maxLevelLimit = structure === "semester" ? 8 : 5;
    const maxLevelFinal = Math.min(Math.max(maxLevelValue, 1), maxLevelLimit);

    // Check if a faculty with the same name already exists and is NOT deleted
    const existingByName = await Faculty.findOne({
      faculty_name: normalizedName,
      isDeleted: { $ne: true },
    });
    if (existingByName) {
      throw new ApiError(409, "Faculty already added");
    }

    // Check if a soft-deleted faculty with the same code exists
    const deletedByCode = await Faculty.findOne({
      faculty_code: normalizedCode,
      isDeleted: true,
    });

    let faculty;

    if (deletedByCode) {
      // If a deleted faculty with this code exists, restore it instead of creating a new one
      deletedByCode.faculty_name = normalizedName;
      deletedByCode.structure = structure;
      deletedByCode.max_level = maxLevelFinal;
      deletedByCode.levels = buildFacultyLevels(structure, maxLevelFinal);
      deletedByCode.isDeleted = false;
      faculty = await deletedByCode.save();
    } else {
      // Create a new faculty
      const levels = buildFacultyLevels(structure, maxLevelFinal);
      faculty = await Faculty.create({
        faculty_code: normalizedCode,
        faculty_name: normalizedName,
        structure,
        max_level: maxLevelFinal,
        levels,
      });
    }

    res.status(201).json({ success: true, data: normalizeFaculty(faculty) });
  } catch (error) {
    next(error);
  }
};

export const getFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findOne({
      _id: req.params.facultyId,
      isDeleted: { $ne: true },
    });
    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }
    res.status(200).json({ success: true, data: normalizeFaculty(faculty) });
  } catch (error) {
    next(error);
  }
};

export const updateFaculty = async (req, res, next) => {
  try {
    const { facultyId } = req.params;
    const { code, name, structureType, maxLevel } = req.body;

    const faculty = await Faculty.findOne({
      _id: facultyId,
      isDeleted: { $ne: true },
    });
    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }

    if (code?.trim()) {
      const newCode = code.trim().toUpperCase();
      const existing = await Faculty.findOne({
        faculty_code: newCode,
        _id: { $ne: facultyId },
        isDeleted: { $ne: true },
      });
      if (existing) {
        throw new ApiError(409, "Another faculty with this code already exists");
      }
      faculty.faculty_code = newCode;
    }
    if (name?.trim()) {
      faculty.faculty_name = name.trim();
    }
    if (structureType) {
      faculty.structure = structureType === "year" ? "year" : "semester";
    }
    if (maxLevel != null) {
      const maxLevelValue = Number(maxLevel) || (faculty.structure === "semester" ? 8 : 4);
      const maxLevelLimit = faculty.structure === "semester" ? 8 : 5;
      faculty.max_level = Math.min(Math.max(maxLevelValue, 1), maxLevelLimit);
    }

    faculty.levels = buildFacultyLevels(faculty.structure, faculty.max_level);

    await faculty.save();
    res.status(200).json({ success: true, data: normalizeFaculty(faculty) });
  } catch (error) {
    next(error);
  }
};

export const deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findOne({
      _id: req.params.facultyId,
      isDeleted: { $ne: true },
    });
    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }
    faculty.isDeleted = true;
    await faculty.save();
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
