import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the MERN Docker App" });
});

const v1Router = express.Router();
v1Router.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");

  res.status(200).json({
    status: "success",
    message: "Server is healthy",
  });
});
v1Router.use("/auth", authRouter);

const v2Router = express.Router();
v2Router.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    data: { uptime: process.uptime() ,timestamp: new Date().toISOString() },
  });
});

app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);

export default app;
