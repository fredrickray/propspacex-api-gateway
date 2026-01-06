import { Router, Request, Response } from "express";
import { paymentService } from "../grpc-clients";
import { authenticate, authorizeRoles } from "@middlewares/auth.middleware";
import logger from "@utils/logger";

const router = Router();

// Helper to handle gRPC errors
const handleGrpcError = (res: Response, error: any) => {
  logger.error({ error }, "Payment service error");

  const statusCode = error.code === 14 ? 503 : error.code === 5 ? 404 : 500;
  const message =
    error.code === 14
      ? "Payment service unavailable"
      : error.details || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};

// ==================== Payment Routes ====================

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialize a payment
 * @access  Private
 */
router.post(
  "/initialize",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const {
        propertyId,
        type,
        amount,
        currency,
        email,
        gateway,
        callbackUrl,
        metadata,
      } = req.body;

      const response = await paymentService.initializePayment({
        userId,
        propertyId,
        type,
        amount,
        currency,
        email: email || req.user!.email,
        gateway,
        callbackUrl,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      });

      logger.info({ userId, type, amount }, "Payment initialized");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   GET /api/payments/verify/:reference
 * @desc    Verify a payment
 * @access  Private
 */
router.get(
  "/verify/:reference",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;
      const { gateway } = req.query;

      const response = await paymentService.verifyPayment({
        reference,
        gateway: gateway as string,
      });

      logger.info({ reference }, "Payment verified");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await paymentService.getPayment({ paymentId: id });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   GET /api/payments
 * @desc    Get user's payments
 * @access  Private
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = 10, status, type } = req.query;

    const response = await paymentService.getUserPayments({
      userId,
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      type: type as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   GET /api/payments/property/:propertyId
 * @desc    Get payments for a property
 * @access  Private (Owner, Admin)
 */
router.get(
  "/property/:propertyId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const response = await paymentService.getPropertyPayments({
        propertyId,
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

// ==================== Subscription Routes ====================

/**
 * @route   POST /api/payments/subscriptions
 * @desc    Create a subscription
 * @access  Private
 */
router.post(
  "/subscriptions",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { planId, email, gateway, callbackUrl } = req.body;

      const response = await paymentService.createSubscription({
        userId,
        planId,
        email: email || req.user!.email,
        gateway,
        callbackUrl,
      });

      logger.info({ userId, planId }, "Subscription created");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   DELETE /api/payments/subscriptions/:id
 * @desc    Cancel a subscription
 * @access  Private
 */
router.delete(
  "/subscriptions/:id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const response = await paymentService.cancelSubscription({
        subscriptionId: id,
        userId,
      });

      logger.info({ subscriptionId: id, userId }, "Subscription cancelled");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   GET /api/payments/subscriptions
 * @desc    Get user's subscriptions
 * @access  Private
 */
router.get(
  "/subscriptions",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { page = 1, limit = 10 } = req.query;

      const response = await paymentService.getUserSubscriptions({
        userId,
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

// ==================== Refund Routes ====================

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Request a refund
 * @access  Private
 */
router.post(
  "/:id/refund",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { reason } = req.body;

      const response = await paymentService.requestRefund({
        paymentId: id,
        userId,
        reason,
      });

      logger.info({ paymentId: id, userId }, "Refund requested");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   PUT /api/payments/refunds/:id/process
 * @desc    Process a refund (admin only)
 * @access  Private/Admin
 */
router.put(
  "/refunds/:id/process",
  authenticate,
  authorizeRoles("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approve, adminNote } = req.body;

      const response = await paymentService.processRefund({
        refundId: id,
        approve,
        adminNote,
      });

      logger.info({ refundId: id, approve }, "Refund processed by admin");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

// ==================== Transaction History ====================

/**
 * @route   GET /api/payments/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get(
  "/transactions",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { page = 1, limit = 10, type, startDate, endDate } = req.query;

      const response = await paymentService.getTransactionHistory({
        userId,
        page: Number(page),
        limit: Number(limit),
        type: type as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

// ==================== Webhook Route ====================

/**
 * @route   POST /api/payments/webhook/:gateway
 * @desc    Handle payment webhook
 * @access  Public (verified by signature)
 */
router.post("/webhook/:gateway", async (req: Request, res: Response) => {
  try {
    const { gateway } = req.params;
    const signature =
      req.headers["x-paystack-signature"] ||
      req.headers["verif-hash"] ||
      req.headers["stripe-signature"] ||
      "";

    const response = await paymentService.handleWebhook({
      gateway,
      event: req.body.event,
      payload: JSON.stringify(req.body),
      signature: signature as string,
    });

    logger.info({ gateway, event: req.body.event }, "Webhook processed");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

export default router;
