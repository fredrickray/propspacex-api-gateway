import { Router } from "express";
import config from "@config/service.config";
import {
  authenticate,
  authorizeRoles,
  attachRequestMetadata,
} from "@middlewares/auth.middleware";
import userRoutes from "./user.routes";
import propertyRoutes from "./property.routes";
import paymentRoutes from "./payment.routes";
import walletRoutes from "./wallet.routes";
import escrowRoutes from "./escrow.routes";
import agentRoutes from "./agent.routes";
import dealRoutes from "./deal.routes";
import adminPropertyRoutes from "./admin.routes";
import verificationRoutes from "./verification.routes";

const indexRouter = Router();

indexRouter.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Gateway is running",
    timestamp: new Date().toISOString(),
  });
});

indexRouter.use("/auth", attachRequestMetadata, userRoutes);
indexRouter.use("/users", attachRequestMetadata, userRoutes);
indexRouter.use("/agents", attachRequestMetadata, authenticate, authorizeRoles("agent"), agentRoutes);
indexRouter.use("/properties", attachRequestMetadata, propertyRoutes);
indexRouter.use(
  "/admin/properties",
  attachRequestMetadata,
  authenticate,
  authorizeRoles("admin"),
  adminPropertyRoutes
);
const adminVerification = [
  attachRequestMetadata,
  authenticate,
  authorizeRoles("admin"),
  verificationRoutes,
] as const;
indexRouter.use("/admin/verifications", ...adminVerification);
indexRouter.use("/verifications", ...adminVerification);
indexRouter.use("/audit-logs", ...adminVerification);
indexRouter.use("/payments", attachRequestMetadata, paymentRoutes);
indexRouter.use("/wallets", attachRequestMetadata, walletRoutes);
indexRouter.use("/escrows", attachRequestMetadata, escrowRoutes);
if (config.featureFlags.dealsApiEnabled) {
  indexRouter.use("/deals", attachRequestMetadata, dealRoutes);
}

export default indexRouter;
