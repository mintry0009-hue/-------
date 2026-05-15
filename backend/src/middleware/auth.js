import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { db } from "../db.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db
      .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
      .get(payload.userId);

    if (!user) {
      return res.status(401).json({ message: "사용자를 찾을 수 없습니다." });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
}

export function roleRequired(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    return next();
  };
}
