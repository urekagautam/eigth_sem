import { buildPerformanceClusters } from "../ml/performanceClustering.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const ensureRole = (req, role) => {
  if (req.user?.role !== role) {
    throw new ApiError(403, `${role} access required`);
  }
  return req.user._id;
};

export const getAdminDashboard = async (req, res, next) => {
  try {
    ensureRole(req, "admin");
    const clusters = await buildPerformanceClusters({
      scope: "admin",
      facultyId: req.query.facultyId || "",
      level: req.query.level || "",
      batch: req.query.batch || "",
    });

    res.status(200).json(
      new ApiResponse(
        200,
        clusters,
        "Admin dashboard analytics retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = ensureRole(req, "teacher");
    const clusters = await buildPerformanceClusters({
      scope: "teacher",
      teacherId,
      facultyId: req.query.facultyId || "",
      level: req.query.level || "",
      batch: req.query.batch || "",
    });

    res.status(200).json(
      new ApiResponse(
        200,
        clusters,
        "Teacher dashboard analytics retrieved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};
