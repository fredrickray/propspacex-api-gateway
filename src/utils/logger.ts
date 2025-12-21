import pino from "pino";
import config from "@config/service.config";

const logger = pino({
  level: config.serverEnvironment === "production" ? "info" : "debug",
  transport:
    config.serverEnvironment === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  base: {
    service: "api-gateway",
  },
});

export default logger;
