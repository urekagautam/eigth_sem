import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Admin } from "../models/admin.model.js";

export const verifyJWT = async (req, res, next) => {
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.cookies?.accessToken;

  if (!token) {
    throw new ApiError(401, "No token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    let user =
      (await Student.findById(decoded.id)) ||
      (await Teacher.findById(decoded.id)) ||
      (await Admin.findById(decoded.id));

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.user = {
      _id: user._id,
      role: user.role,
    };

    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
};