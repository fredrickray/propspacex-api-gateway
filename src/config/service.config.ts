import dotenv from "dotenv";
dotenv.config();

const config = {
  services: {
    userServiceURL: process.env.USER_SERVICE_URL as string,
    propertyServiceURL: process.env.PROPERTY_SERVICE_URL as string,
    paymentServiceURL: process.env.PAYMENT_SERVICE_URL as string,
    mediaServiceURL: process.env.MEDIA_SERVICE_URL as string,
    mailerServiceURL: process.env.MAILER_SERVICE_URL as string,
  },
  userService: {
    host: process.env.USER_SERVICE_HOST || "user-service",
    port: process.env.USER_SERVICE_PORT || 50051,
  },
  propertyService: {
    host: process.env.PROPERTY_SERVICE_HOST || "property-service",
    port: process.env.PROPERTY_SERVICE_PORT || 50052,
  },
  paymentService: {
    host: process.env.PAYMENT_SERVICE_HOST || "payment-service",
    port: process.env.PAYMENT_SERVICE_PORT || 50053,
  },
  mediaService: {
    host: process.env.MEDIA_SERVICE_HOST || "media-service",
    port: process.env.MEDIA_SERVICE_PORT || 50054,
  },
  mailerService: {
    host: process.env.MAILER_SERVICE_HOST || "mailer-service",
    port: process.env.MAILER_SERVICE_PORT || 50055,
  },
  jwtSecret: process.env.JWT_SECRET as string,
  serverEnvironment: process.env.ENV,
  serverPort: process.env.SERVER_PORT as unknown as number,
  company: process.env.COMPANY_NAME as string,
};

export default config;
