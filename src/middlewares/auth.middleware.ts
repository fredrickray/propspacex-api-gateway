import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "@config/service.config";
import logger from "@utils/logger";
import UserServiceClient from "@grpc-clients/user.client";

const userClient = new UserServiceClient(
  `${config.userService.host}:${config.userService.port}`
);
// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        appRole: string;
        isVerified: boolean;
        isAccountActive: boolean;
      };
      deviceId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  }
}

export default class GatewayAuthMiddleware {
  private static extractAccessToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.split(" ")[1];
    }
    if ((req as any).cookies?.access_token) {
      return (req as any).cookies.access_token;
    }
    return null;
  }

  private static extractIpAddress(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(",")[0];
      return ips.trim();
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  }

  private static extractUserAgent(req: Request): string {
    return req.headers["user-agent"] || "unknown";
  }

  static async attachRequestMetadata(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    req.ipAddress = GatewayAuthMiddleware.extractIpAddress(req);
    req.userAgent = GatewayAuthMiddleware.extractUserAgent(req);

    // Forward to downstream services
    req.headers["x-client-ip"] = req.ipAddress;
    req.headers["x-user-agent"] = req.userAgent;

    next();
  }

  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const accessToken = GatewayAuthMiddleware.extractAccessToken(req);

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          message: "Authorization token required",
        });
      }

      const validation = await userClient.validateToken({ accessToken });

      if (!validation.valid) {
        return res.status(401).json({
          success: false,
          message: validation.error || "Invalid token",
        });
      }

      if (!validation.isAccountActive) {
        return res.status(401).json({
          success: false,
          message: "Your account is deactivated. Please contact support.",
        });
      }

      if (!validation.isVerified) {
        return res.status(401).json({
          success: false,
          message: "Please verify your email address",
        });
      }

      const ipAddress = GatewayAuthMiddleware.extractIpAddress(req);
      const userAgent = GatewayAuthMiddleware.extractUserAgent(req);

      // Register device via User Service (async, don't block request)
      userClient
        .registerDevice({
          userId: validation.userId,
          ipAddress,
          userAgent,
          isTrusted: false,
        })
        .then((deviceResponse) => {
          if (deviceResponse.isSuspicious) {
            // Security alert is handled by User Service
            console.log(
              `Suspicious device detected for user ${validation.userId}`
            );
          }
        })
        .catch((err) => {
          console.error("Failed to register device:", err);
        });

      // Attach user info to request
      req.user = {
        userId: validation.userId,
        email: validation.email,
        appRole: validation.appRole,
        isVerified: validation.isVerified,
        isAccountActive: validation.isAccountActive,
      };
      req.ipAddress = ipAddress;
      req.userAgent = userAgent;

      // Forward user info to downstream services via headers
      req.headers["x-user-id"] = validation.userId;
      req.headers["x-user-email"] = validation.email;
      req.headers["x-user-role"] = validation.appRole;
      req.headers["x-client-ip"] = ipAddress;
      req.headers["x-user-agent"] = userAgent;

      next();
    } catch (error: any) {
      console.error("Authentication error:", error);
      return res.status(500).json({
        success: false,
        message: "Authentication service unavailable",
      });
    }
  }

  static async optionalAuth(req: Request, res: Response, next: NextFunction) {
    const accessToken = GatewayAuthMiddleware.extractAccessToken(req);

    req.ipAddress = GatewayAuthMiddleware.extractIpAddress(req);
    req.userAgent = GatewayAuthMiddleware.extractUserAgent(req);
    req.headers["x-client-ip"] = req.ipAddress;
    req.headers["x-user-agent"] = req.userAgent;

    if (!accessToken) {
      return next();
    }

    try {
      const validation = await userClient.validateToken({ accessToken });

      if (validation.valid && validation.isAccountActive) {
        req.user = {
          userId: validation.userId,
          email: validation.email,
          appRole: validation.appRole,
          isVerified: validation.isVerified,
          isAccountActive: validation.isAccountActive,
        };
        req.headers["x-user-id"] = validation.userId;
        req.headers["x-user-email"] = validation.email;
        req.headers["x-user-role"] = validation.appRole;
      }
    } catch (error) {
      // Silently continue without user
    }

    next();
  }

  static authorizeRoles(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Admin bypass
      if (req.user.appRole === "ADMIN") {
        return next();
      }

      if (!allowedRoles.includes(req.user.appRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to access this resource",
        });
      }

      next();
    };
  }

  /**
   * Require trusted device for sensitive operations
   */
  static async requireTrustedDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const deviceId = req.headers["x-device-id"] as string;
    if (!deviceId) {
      return res.status(401).json({
        success: false,
        message: "Device identification required",
      });
    }

    try {
      const trustCheck = await userClient.checkDeviceTrust({
        userId: req.user.userId,
        deviceId,
      });

      if (!trustCheck.isTrusted) {
        return res.status(403).json({
          success: false,
          message:
            "This action requires a trusted device. Please verify your device first.",
        });
      }

      req.deviceId = deviceId;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Device verification service unavailable",
      });
    }
  }

  static logActivity(event: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Log after request completes
      res.on("finish", async () => {
        try {
          await userClient.logActivity({
            event,
            userId: req.user?.userId || "",
            ipAddress: req.ipAddress || "",
            userAgent: req.userAgent || "",
            deviceId: req.deviceId || "",
            metadata: JSON.stringify({
              path: req.path,
              method: req.method,
              statusCode: res.statusCode,
            }),
          });
        } catch (error) {
          console.error("Failed to log activity:", error);
        }
      });
      next();
    };
  }
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (
  maxRequests: number = 100,
  windowMs: number = 60000
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const clientData = requestCounts.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (clientData.count >= maxRequests) {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
      return;
    }

    clientData.count++;
    next();
  };
};

export const attachRequestMetadata =
  GatewayAuthMiddleware.attachRequestMetadata;
export const authenticate = GatewayAuthMiddleware.authenticate;
export const optionalAuth = GatewayAuthMiddleware.optionalAuth;
export const authorizeRoles = GatewayAuthMiddleware.authorizeRoles;
export const requireTrustedDevice = GatewayAuthMiddleware.requireTrustedDevice;
export const logActivity = GatewayAuthMiddleware.logActivity;
