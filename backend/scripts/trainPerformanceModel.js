import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/db/index.js";
import {
  MODEL_PATH,
  buildLabelledPerformanceDataset,
  saveDataset,
  saveModel,
  trainRandomForest,
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
  await saveDataset(rows);
  const model = trainRandomForest(rows);

  if (!model) {
    console.log(`Only ${rows.length} labelled rows found.`);
    console.log("At least 12 labelled rows are needed to train the Random Forest model.");
    process.exitCode = 1;
  } else {
    const modelPath = await saveModel(model);
    console.log(`Trained Random Forest with ${rows.length} labelled rows`);
    console.log(`Model: ${modelPath || MODEL_PATH}`);
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
