import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "examify_secret";

export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      throw new ApiError(401, "Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);
    if (!passwordMatches) {
      throw new ApiError(401, "Invalid email or password");
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
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
            id: admin._id,
            email: admin.email,
            role: admin.role,
          },
        },
        "Login successful"
      )
    );
  } catch (error) {
    next(error);
  }
};
