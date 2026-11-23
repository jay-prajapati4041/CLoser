// Auth middleware loads the user's persisted session from the secure cookie.
import { createHash } from "node:crypto";
import Session from "../models/Session.js";

const COOKIE_NAME = "closer_session";

async function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await Session.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).populate("user", "name email");

  if (!session || !session.user) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }

  req.user = session.user;
  req.sessionId = session._id;
  return next();
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export { COOKIE_NAME, cookieOptions, requireAuth };
