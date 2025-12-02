import dotenv from "dotenv";
dotenv.config();

const config = {
  services: {
    userServiceURL: process.env.USER_SERVICE_URL as string,
    propertyServiceURL: process.env.PROPERTY_SERVICE_URL as string,
    paymentServiceURL: process.env.PAYMENT_SERVICE_URL as string,
    mdeialServiceURL: process.env.MEDIA_SERVICE_URL as string,
    mailerServiceURL: process.env.MAILER_SERVICE_URL as string,
  },
  jwtSecret: process.env.JWT_SECRET as string,
  serverEnvironment: process.env.ENV,
  company: process.env.COMPANY_NAME as string,
};

export default config;
