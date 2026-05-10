import { IncomingMessage } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "@config/service.config";
import logger from "@utils/logger";

const CHAT_WS_PATH = "/v1/ws/chat";

type UpgradeProxy = ReturnType<typeof createProxyMiddleware>;

const getHeader = (
  header: string | string[] | undefined
): string | undefined => {
  if (!header) return undefined;
  return Array.isArray(header) ? header[0] : header;
};

const getBearerToken = (request: IncomingMessage): string | undefined => {
  const authorization = getHeader(request.headers.authorization);
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return undefined;
  }
  return authorization.slice(7).trim();
};

const extractUserId = (request: IncomingMessage): string | undefined => {
  const token = getBearerToken(request);
  if (!token) return undefined;

  try {
    const decoded = jwt.decode(token) as JwtPayload | string | null;
    if (!decoded || typeof decoded === "string") return undefined;
    return typeof decoded.sub === "string" ? decoded.sub : undefined;
  } catch {
    return undefined;
  }
};

const getUserIdForLogging = (request: IncomingMessage): string => {
  return extractUserId(request) || "anonymous";
};

export const createChatWsProxy = (): UpgradeProxy | null => {
  const target = config.services.userServiceURL;

  if (!target) {
    logger.error(
      "Missing USER_SERVICE_URL. Chat websocket proxy will not be available."
    );
    return null;
  }

  return createProxyMiddleware({
    target,
    ws: true,
    changeOrigin: true,
    xfwd: true,
    pathFilter: CHAT_WS_PATH,
    on: {
      proxyReqWs: (proxyReq, req) => {
        const request = req as IncomingMessage;
        const authorization = getHeader(request.headers.authorization);
        if (authorization) {
          proxyReq.setHeader("authorization", authorization);
        }

        const requestId = getHeader(request.headers["x-request-id"]);
        if (requestId) {
          proxyReq.setHeader("x-request-id", requestId);
        }

        logger.info(
          {
            path: request.url,
            userId: getUserIdForLogging(request),
          },
          "WS chat upgrade proxied to user-service"
        );
      },
      error: (error, req) => {
        const request = req as IncomingMessage;
        logger.error(
          {
            error,
            path: request.url,
            userId: getUserIdForLogging(request),
          },
          "WS chat proxy error"
        );
      },
    },
  });
};

export const CHAT_WS_UPGRADE_PATH = CHAT_WS_PATH;
