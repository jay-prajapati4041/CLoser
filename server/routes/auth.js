// Auth routes register users, validate sessions, and enforce trusted browser origins.
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import express from "express";
import rateLimit from "express-rate-limit";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { COOKIE_NAME, cookieOptions, requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

function requireTrustedOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin || !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "This request origin is not allowed." });
  }
  return next();
}

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

async function createSession(user, res) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await Session.create({ user: user._id, tokenHash, expiresAt });
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SESSION_TTL_MS,
  });
}

router.post("/register", authLimiter, requireTrustedOrigin, async (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name || name.length > 80) {
    return res.status(400).json({ error: "Enter your name (up to 80 characters)." });
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ error: "Use a password of at least 8 characters and no more than 72 bytes." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    await createSession(user, res);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    throw error;
  }
});

router.post("/login", authLimiter, requireTrustedOrigin, async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Enter your email and password." });
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(401).json({ error: "That email and password don’t match." });
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: "That email and password don’t match." });
  }

  await createSession(user, res);
  return res.json({ user: publicUser(user) });
});

router.post("/logout", requireTrustedOrigin, async (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await Session.deleteOne({ tokenHash });
  }
  res.clearCookie(COOKIE_NAME, cookieOptions());
  return res.json({ message: "You’ve been signed out." });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export { allowedOrigins };
export default router;
