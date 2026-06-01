import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "examify_secret";

export const loginAdmin = async (req, res, next) => {
  try {
    const { email, username, identifier, password, role = "admin" } = req.body;
    const loginRole = ["admin", "teacher", "student"].includes(role)
      ? role
      : "admin";
    const loginId = (identifier || email || username || "").trim();

    if (!loginId || !password) {
      throw new ApiError(400, "Username/email and password are required");
    }

    let user = null;
    let invalidMessage = "Invalid username or password";

    if (loginRole === "admin") {
      user = await Admin.findOne({ email: loginId.toLowerCase() });
      invalidMessage = "Invalid email or password";
    } else if (loginRole === "teacher") {
      user = await Teacher.findOne({
        username: loginId.toLowerCase(),
        isActive: true,
      });
    } else {
      user = await Student.findOne({
        username: loginId.toLowerCase(),
        isActive: true,
        academic_status: { $ne: "graduated" },
      });
    }

    if (!user) throw new ApiError(401, invalidMessage);

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new ApiError(401, invalidMessage);
    }

    const token = jwt.sign(
      { id: user._id, role: loginRole },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            name:
              loginRole === "admin"
                ? user.email
                : [user.first_name, user.middle_name, user.last_name]
                    .filter(Boolean)
                    .join(" "),
            role: loginRole,
          },
        },
        "Login successful"
      )
    );
  } catch (error) {
    next(error);
  }
};
