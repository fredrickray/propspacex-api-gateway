import { Router } from "express";
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
indexRouter.use("/payments", attachRequestMetadata, paymentRoutes);
indexRouter.use("/wallets", attachRequestMetadata, walletRoutes);
indexRouter.use("/escrows", attachRequestMetadata, escrowRoutes);

export default indexRouter;
