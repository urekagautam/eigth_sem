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

    const decodedRole = String(decoded.role || "").toLowerCase();

    let user = null;
    let role = decodedRole;

    if (decodedRole === "admin") {
      user = await Admin.findById(decoded.id);
      role = "admin";
    } else if (decodedRole === "teacher") {
      user = await Teacher.findById(decoded.id);
      role = "teacher";
    } else if (decodedRole === "student") {
      user = await Student.findById(decoded.id);
      role = "student";
    } else {
      user =
        (await Admin.findById(decoded.id)) ||
        (await Teacher.findById(decoded.id)) ||
        (await Student.findById(decoded.id));
      role = user?.role || (user instanceof Admin ? "admin" : "");
    }

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.user = {
      _id: user._id,
      role,
    };

    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
};
