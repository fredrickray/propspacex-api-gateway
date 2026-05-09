import express, { Application, Request } from "express";
import cors from "cors";
import helmet from "helmet";
import config from "@config/service.config";
import routes from "./routes";
import logger from "@utils/logger";
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

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
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
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down gracefully...");
      process.exit(0);
    });
  }

  async start(PORT: number | string) {
    try {
      this.app.listen(PORT, () => {
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
