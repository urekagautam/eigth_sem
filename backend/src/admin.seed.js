import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedAdmin();
