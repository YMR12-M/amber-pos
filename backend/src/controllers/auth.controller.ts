import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { env } from "../config/env";
import { TOKEN_COOKIE } from "../middleware/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function cookieOptions() {
  return {
    httpOnly: true,
    // `SameSite=None` بيرفضه المتصفح من غير Secure — فبنفرضها.
    secure: env.isProd || env.cookieSameSite === "none",
    sameSite: env.cookieSameSite,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?",
      [email]
    );

    const user = rows[0];

    // Hash a dummy password when the user is missing so a wrong email and a
    // wrong password take the same time (no user enumeration via timing).
    const hash = user?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu";
    const valid = await bcrypt.compare(password, hash);

    if (!user || !user.is_active || !valid) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
    });

    res.cookie(TOKEN_COOKIE, token, cookieOptions());
    res.json({ user: payload });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(TOKEN_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ message: "تم تسجيل الخروج" });
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
