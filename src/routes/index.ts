import { Router } from "express";
import userRoutes from "./user.routes";
import propertyRoutes from "./property.routes";
import paymentRoutes from "./payment.routes";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Gateway is running",
    timestamp: new Date().toISOString(),
  });
});

// Mount service routes
router.use("/auth", userRoutes);
router.use("/users", userRoutes);
router.use("/properties", propertyRoutes);
router.use("/payments", paymentRoutes);

export default router;
