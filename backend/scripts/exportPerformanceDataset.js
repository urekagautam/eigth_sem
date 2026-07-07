import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/db/index.js";
import {
  DATASET_PATH,
  buildLabelledPerformanceDataset,
  saveDataset,
} from "../src/ml/performancePrediction.js";

dotenv.config();

const filters = Object.fromEntries(
  process.argv
    .slice(2)
    .map((item) => item.split("="))
    .filter(([key, value]) => key && value),
);

try {
  await connectDB();
  const rows = await buildLabelledPerformanceDataset(filters);
  const outputPath = await saveDataset(rows);
  console.log(`Exported ${rows.length} labelled rows`);
  console.log(`Dataset: ${outputPath || DATASET_PATH}`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
