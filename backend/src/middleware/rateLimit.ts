import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * Login is the brute-force target: 10 attempts per 15 minutes per IP.
 * Successful logins don't count, so a busy shift never locks a real cashier out.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === "test" ? 1000 : 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "محاولات دخول كتير أوي. استنى 15 دقيقة وحاول تاني." },
});

/**
 * سقف عام على الـ API لكبح الإساءة الآلية.
 *
 * الرقم لكل IP، ومحل كامل بيطلّع من IP واحد (نفس الراوتر): كل تابلت
 * كاشير بيسأل كل 8 ثواني، وشاشة المطبخ كل 5. السقف الافتراضي (600)
 * بيسع محل بأجهزة كتير من غير ما الشاشات تقف في الذروة، وينفع
 * يتضبط من `API_RATE_LIMIT`.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.nodeEnv === "test" ? 100000 : env.apiRateLimit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "طلبات كتير أوي. حاول بعد شوية." },
});
