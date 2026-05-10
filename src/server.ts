import express, { Application, Request } from "express";
import { createServer, IncomingMessage, Server as HttpServer } from "http";
import { Socket } from "net";
import { Duplex } from "stream";
import jwt, { JwtPayload } from "jsonwebtoken";
import cors from "cors";
import helmet from "helmet";
import config from "@config/service.config";
import routes from "./routes";
import logger from "@utils/logger";
import { CHAT_WS_UPGRADE_PATH, createChatWsProxy } from "./ws/chat.proxy";
import {
  requestLogger,
  // errorHandler,
  notFoundHandler,
  corsConfig,
} from "@middlewares/common.middleware";
import { errorHandler, routeNotFound } from "@middlewares/error.middleware";
import { rateLimit } from "@middlewares/auth.middleware";

export default class Server {
  public app: Application;
  private httpServer!: HttpServer;
  private chatWsProxy = createChatWsProxy();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupHttpServer();
    this.setUpGracefulShutdown();
  }

  private setupMiddleware(): void {
    // Trust proxy for rate limiting behind reverse proxy
    this.app.set("trust proxy", 1);
    this.app.use(helmet());
    this.app.use(cors(corsConfig));
    this.app.use(express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        (req as Request).rawBody = buf.toString("utf8");
      },
    }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(requestLogger);
    this.app.use(rateLimit(100, 60000)); // 100 requests per minute
  }

  private setupRoutes(): void {
    this.app.use("/api/v1", routes);
  }

  private setupErrorHandling(): void {
    this.app.use(routeNotFound);
    // this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  private setupHttpServer(): void {
    this.httpServer = createServer(this.app);

    // Keep HTTP sockets alive longer so chat upgrade clients are not dropped early.
    this.httpServer.keepAliveTimeout = 300_000;
    this.httpServer.headersTimeout = 310_000;
    this.httpServer.requestTimeout = 0;

    this.httpServer.on("upgrade", (request, socket, head) => {
      this.handleUpgrade(request, socket, head);
    });
  }

  private handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): void {
    const requestUrl = new URL(request.url || "", "http://localhost");
    const pathname = requestUrl.pathname;

    if (pathname !== CHAT_WS_UPGRADE_PATH) {
      logger.warn({ path: pathname }, "Rejected websocket upgrade on unknown path");
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    if (!this.chatWsProxy) {
      logger.error("WS chat upgrade rejected because proxy target is not configured");
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
      return;
    }

    const wsSocket = socket as Socket;
    const userId = this.getWsUserId(request) || "anonymous";
    logger.info(
      { path: pathname, userId },
      "WS chat connection upgrade accepted at gateway"
    );

    wsSocket.on("close", () => {
      logger.info({ path: pathname, userId }, "WS chat connection closed at gateway");
    });
    wsSocket.on("error", (error) => {
      logger.error(
        { error, path: pathname, userId },
        "WS chat connection errored at gateway"
      );
    });

    wsSocket.setKeepAlive(true, 60_000);
    wsSocket.setTimeout(0);
    this.chatWsProxy.upgrade(request, wsSocket, head);
  }

  private getWsUserId(request: IncomingMessage): string | undefined {
    const authorization = request.headers.authorization;
    if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
      return undefined;
    }

    try {
      const decoded = jwt.decode(authorization.slice(7).trim()) as
        | JwtPayload
        | string
        | null;
      if (!decoded || typeof decoded === "string") {
        return undefined;
      }
      return typeof decoded.sub === "string" ? decoded.sub : undefined;
    } catch {
      return undefined;
    }
  }

  private setUpGracefulShutdown(): void {
    process.on("uncaughtException", (error) => {
      logger.fatal({ error }, "Uncaught exception");
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.fatal({ reason, promise }, "Unhandled promise rejection");
      process.exit(1);
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received. Shutting down gracefully...");
      this.httpServer.close();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down gracefully...");
      this.httpServer.close();
      process.exit(0);
    });
  }

  async start(PORT: number | string) {
    try {
      this.httpServer.listen(PORT, () => {
        logger.info(
          {
            port: PORT,
            environment: config.serverEnvironment,
          },
          `${config.company} API Gateway is running 🚀`
        );

        logger.info(
          {
            userService: `${config.userService.host}:${config.userService.port}`,
            propertyService: `${config.propertyService.host}:${config.propertyService.port}`,
            paymentService: `${config.paymentService.host}:${config.paymentService.port}`,
            mediaService: `${config.mediaService.host}:${config.mediaService.port}`,
          },
          "Connected microservices"
        );
      });
    } catch (error) {
      logger.error({ error }, "Failed to start server");
      process.exit(1);
    }
  }
}
