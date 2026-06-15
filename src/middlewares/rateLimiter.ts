import rateLimit from "express-rate-limit";

const buildLimiter = (windowMs: number, max: number, message: string) =>
    process.env.NODE_ENV === "test"
        ? (_req: import("express").Request, _res: import("express").Response, next: import("express").NextFunction) => next()
        : rateLimit({
              windowMs,
              max,
              standardHeaders: true,
              legacyHeaders: false,
              message: { status: "error", message },
          });

export const authLimiter = buildLimiter(
    60 * 1000,
    5,
    "Too many requests, please try again later"
);

export const otpLimiter = buildLimiter(
    5 * 60 * 1000,
    3,
    "Too many OTP requests, please try again in 5 minutes"
);
