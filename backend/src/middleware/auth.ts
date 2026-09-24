import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2";
import { pool } from "../config/db";
import { env } from "../config/env";
import { JwtPayload, UserRole } from "../types";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const TOKEN_COOKIE = "pos_token";

/**
 * The token lives in an httpOnly cookie so page scripts (and therefore XSS)
 * can't read it. The Bearer header stays supported for non-browser clients.
 */
function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[TOKEN_COOKIE];
  if (typeof cookieToken === "string" && cookieToken.length > 0) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);

  return null;
}

/**
 * الحساب لازم يكون لسه صالح **دلوقتي**، مش وقت ما التوكن اتعمل.
 *
 * التوكن بيعيش 8 ساعات. من غير الفحص ده، موظف بتوقفه من شاشة
 * "الموظفين" بيفضل داخل بالتوكن اللي في متصفحه لحد ما يخلص — يعني
 * كاشير مفصول يقدر يقبض ويلغي طلبات من تليفونه بعد ما توقفه.
 * نفس الحكاية مع تغيير كلمة المرور: الجلسة القديمة كانت بتفضل شغّالة.
 *
 * `tokens_valid_from` بيتحدّث عند الإيقاف وعند تغيير كلمة المرور، وأي
 * توكن اتعمل قبله بيتلغي فوراً.
 *
 * التكلفة: استعلام واحد على المفتاح الأساسي لكل نداء — أرخص بكتير من
 * إن حد مفصول يفضل ماسك النظام نص وردية.
 */
async function stillValid(payload: JwtPayload): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT is_active, role, UNIX_TIMESTAMP(tokens_valid_from) AS valid_from FROM users WHERE id = ?",
    [payload.id]
  );
  const user = rows[0];
  if (!user || !user.is_active) return false;

  // الدور اتغيّر بعد ما التوكن اتعمل؟ التوكن بيحمل الدور القديم.
  if (user.role !== payload.role) return false;

  // `valid_from = NULL` معناها الحساب عمره ما اتلغتله جلسة.
  if (user.valid_from === null) return true;

  // `iat` بالثواني، فالتوكن اللي اتعمل في **نفس ثانية** الإلغاء مش
  // ممكن نفرّق هو قبله ولا بعده — بنرفضه. الخسارة إن دخول حصل في
  // نفس الثانية بالظبط يحتاج إعادة محاولة؛ المكسب إن الإلغاء أكيد.
  const issuedAt = payload.iat ?? 0;
  return issuedAt > Number(user.valid_from);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "لازم تسجل دخول" });
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    return res.status(401).json({ message: "الجلسة منتهية، سجل دخول تاني" });
  }

  try {
    if (!(await stillValid(payload))) {
      return res.status(401).json({ message: "الحساب مش متاح — كلّم صاحب المحل" });
    }
  } catch (err) {
    return next(err);
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "مش معاك صلاحية تعمل الحاجة دي" });
    }
    next();
  };
}
