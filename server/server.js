// API entry point: configures Express, mounts routes, and connects to MongoDB.
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import authRouter, { allowedOrigins } from "./routes/auth.js";
import leadsRouter from "./routes/leads.js";

const app = express();

let databaseConnection;

async function ensureDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }
  if (!databaseConnection) {
    databaseConnection = mongoose.connect(process.env.MONGODB_URI);
  }
  await databaseConnection;
}

app.use("/api", async (_req, _res, next) => {
  if (!process.env.VERCEL) {
    return next();
  }
  try {
    await ensureDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.send("Closer API is running.");
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/leads", leadsRouter);

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const status = error.status === 400 ? 400 : error.message === "Origin not allowed" ? 403 : 500;
  if (status === 500) {
    console.error("Request failed:", error.name || "Error");
  }
  res.status(status).json({
    error: status === 400
      ? "The request body is invalid."
      : status === 403
        ? "This request origin is not allowed."
        : "Something went wrong. Please try again.",
  });
});

async function startServer() {
  await ensureDatabase();
  const port = Number(process.env.PORT) || 5000;
  const server = app.listen(port, () => {
    console.log(`Closer API listening on port ${port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startServer().catch((error) => {
    console.error(
      "Unable to start the API. Check MONGODB_URI and confirm the database is available.",
      error.name || "Error"
    );
    process.exitCode = 1;
  });
}

export { app, startServer };
export default app;
