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
    const secret = process.env.ACCESS_TOKEN_SECRET || "examify_secret";
    const decoded = jwt.verify(token, secret);

    let user =
      (await Student.findById(decoded.id)) ||
      (await Teacher.findById(decoded.id)) ||
      (await Admin.findById(decoded.id));

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.user = {
      _id: user._id,
      role: decoded.role || user.role,
    };

    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
};
