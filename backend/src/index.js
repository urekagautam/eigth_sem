import dotenv from "dotenv";
import express from "express";
import connectDB from "./db/index.js";
import authRoute from "./routes/auth.route.js";
import facultyRoute from "./routes/faculty.route.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use("/api/admin", authRoute);app.use('/api/admin/faculties', facultyRoute);
app.get("/", (req, res) => {
  res.send("Server is ready");
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    errors: err.errors || [],
  });
});

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  }); 