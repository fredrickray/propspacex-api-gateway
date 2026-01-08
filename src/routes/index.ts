import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import {
  authenticate,
  authorizeRoles,
  requireTrustedDevice,
  logActivity,
  attachRequestMetadata,
} from "@middlewares/auth.middleware";
import userRoutes from "./user.routes";
import propertyRoutes from "./property.routes";
import paymentRoutes from "./payment.routes";

const indexRouter = Router();

// Health check endpoint
indexRouter.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Gateway is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount service routes
indexRouter.use("/auth", attachRequestMetadata, userRoutes);
indexRouter.use("/users", attachRequestMetadata, userRoutes);
indexRouter.use("/properties", attachRequestMetadata, propertyRoutes);
indexRouter.use("/payments", attachRequestMetadata, paymentRoutes);

export default indexRouter;
