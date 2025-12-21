import { Request, Response, NextFunction } from "express";
import logger from "@utils/logger";

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Log request
  logger.info(
    {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    },
    "Incoming request"
  );

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
      "Request completed"
    );
  });

  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
    },
    "Unhandled error"
  );

  console.log("error: ", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.ENV === "development" && { error: err.message }),
  });
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn({ method: req.method, url: req.originalUrl }, "Route not found");

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

/**
 * CORS configuration middleware
 */
export const corsConfig = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      // Add production domains here
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin }, "CORS blocked request from origin");
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
