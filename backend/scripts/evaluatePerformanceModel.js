import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/db/index.js";
import {
  buildLabelledPerformanceDataset,
  predictWithModel,
  trainRandomForest,
} from "../src/ml/performancePrediction.js";

dotenv.config();

const splitRows = (rows) => {
  const ordered = [...rows].sort((a, b) =>
    `${a.studentId}-${a.targetExamId}`.localeCompare(`${b.studentId}-${b.targetExamId}`),
  );
  const testEvery = 5;
  return {
    train: ordered.filter((_, index) => index % testEvery !== 0),
    test: ordered.filter((_, index) => index % testEvery === 0),
  };
};

try {
  await connectDB();
  const rows = await buildLabelledPerformanceDataset();
  const { train, test } = splitRows(rows);
  const model = trainRandomForest(train);

  if (!model || !test.length) {
    console.log(`Rows: ${rows.length}, train: ${train.length}, test: ${test.length}`);
    console.log("Not enough labelled rows to evaluate the model yet.");
    process.exitCode = 1;
  } else {
    const predictions = test.map((row) => {
      const prediction = predictWithModel(model, row.features);
      return {
        actual: Number(row.label.finalPercent),
        predicted: Number(prediction.predictedPercent),
        actualCategory: row.label.riskCategory,
        predictedCategory: prediction.riskCategory.label,
      };
    });
    const absoluteErrors = predictions.map((item) =>
      Math.abs(item.actual - item.predicted),
    );
    const squaredErrors = predictions.map((item) => (item.actual - item.predicted) ** 2);
    const categoryMatches = predictions.filter(
      (item) => item.actualCategory === item.predictedCategory,
    ).length;

    const mae =
      absoluteErrors.reduce((sum, value) => sum + value, 0) / absoluteErrors.length;
    const rmse = Math.sqrt(
      squaredErrors.reduce((sum, value) => sum + value, 0) / squaredErrors.length,
    );
    const categoryAccuracy = (categoryMatches / predictions.length) * 100;

    console.log(`Rows: ${rows.length}`);
    console.log(`Train rows: ${train.length}`);
    console.log(`Test rows: ${test.length}`);
    console.log(`MAE: ${mae.toFixed(2)} percentage points`);
    console.log(`RMSE: ${rmse.toFixed(2)} percentage points`);
    console.log(`Risk category accuracy: ${categoryAccuracy.toFixed(1)}%`);
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
