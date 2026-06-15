import bcrypt from "bcryptjs";
import { Admin } from "../models/admin.model.js";

const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "admin123";

export const seedDefaultAdmin = async () => {
  const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL });

  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await Admin.create({
    email: DEFAULT_ADMIN_EMAIL,
    password: hashedPassword,
    role: "admin",
  });

  console.log("Default admin seeded successfully");
};
