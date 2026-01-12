import { Response } from "express";
import logger from "./logger";

export function handleGrpcError(
  res: Response,
  error: any,
  defaultMessage: string = "Internal server error",
  service: string
) {
  logger.error("gRPC Error:", error);
  logger.error({ error }, `${service} gRPC service error`);

  const statusCode = error.code === 14 ? 503 : error.code === 5 ? 404 : 500;

  const message =
    error.code === 14 ? `${service} service unavailable` : defaultMessage;

  res.status(statusCode).json({
    success: false,
    message,
    error: error.details || message,
  });
}
