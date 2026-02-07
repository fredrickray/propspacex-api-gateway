import { Response } from "express";
import * as grpc from "@grpc/grpc-js";
import logger from "./logger";

/**
 * Maps gRPC status codes to HTTP status codes.
 * These correspond to the gRPC status codes sent by downstream services
 * (e.g., user-service's grpc-error.handler.ts).
 */
const grpcToHttpStatus: Record<number, number> = {
  [grpc.status.INVALID_ARGUMENT]: 400,
  [grpc.status.UNAUTHENTICATED]: 401,
  [grpc.status.PERMISSION_DENIED]: 403,
  [grpc.status.NOT_FOUND]: 404,
  [grpc.status.ALREADY_EXISTS]: 409,
  [grpc.status.DEADLINE_EXCEEDED]: 408,
  [grpc.status.RESOURCE_EXHAUSTED]: 429,
  [grpc.status.INTERNAL]: 500,
  [grpc.status.UNAVAILABLE]: 503,
};

/**
 * Handles gRPC errors by mapping them to appropriate HTTP responses.
 *
 * @param res - Express response object
 * @param error - The gRPC error object (contains `code`, `details`, `message`)
 * @param defaultMessage - Fallback message if the error doesn't have details
 * @param service - Name of the service for logging context (e.g., "User", "Property")
 */
export function handleGrpcError(
  res: Response,
  error: any,
  defaultMessage: string = "Internal server error",
  service: string
) {
  logger.error({ error, service }, `${service} gRPC service error`);

  const statusCode = grpcToHttpStatus[error.code] || 500;

  // For service unavailable, use a descriptive message
  // For other errors, prefer the gRPC error details (set by the service)
  const message =
    error.code === grpc.status.UNAVAILABLE
      ? `${service} service unavailable`
      : error.details || defaultMessage;

  res.status(statusCode).json({
    success: false,
    message,
  });
}
