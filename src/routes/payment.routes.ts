import { Request, Response, Router } from "express";
import { paymentService } from "../grpc-clients";
import { authenticate } from "@middlewares/auth.middleware";
import { handleGrpcError } from "@utils/handleGrpcError";
import logger from "@utils/logger";
import {
  bodyRecord,
  optionalNonEmptyString,
  ESCROW_PAYMENT_INTENT_PURPOSES,
  queryRecord,
  queryFirst,
  requireIdempotencyKey,
  requireNonEmptyString,
  requirePositiveInt,
  requireProvider,
  requireReference,
  requireIntIn,
  CURRENCY_CODES,
  sendValidationError,
  type ValidationIssue,
} from "@utils/paymentRequestValidation";

const router = Router();

router.post("/intent", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }

  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const provider = requireProvider(issues, b.provider);
  const currency_code = requireIntIn(issues, "currency_code", b.currency_code, CURRENCY_CODES, "currency_code");
  const amount_minor = requirePositiveInt(issues, "amount_minor", b.amount_minor);
  const purpose = requireIntIn(
    issues,
    "purpose",
    b.purpose,
    ESCROW_PAYMENT_INTENT_PURPOSES,
    "purpose"
  );

  let buyer_user_id = optionalNonEmptyString(req.user?.userId);
  if (optionalNonEmptyString(b.buyer_user_id) && b.buyer_user_id !== buyer_user_id) {
    issues.push({
      field: "buyer_user_id",
      message: "buyer_user_id must match the authenticated user",
    });
  }
  if (!buyer_user_id) {
    issues.push({ field: "buyer_user_id", message: "buyer_user_id is required" });
  }

  let email = optionalNonEmptyString(b.email);
  if (!email) email = optionalNonEmptyString(req.user?.email);
  if (!email) {
    issues.push({ field: "email", message: "email is required" });
  }

  const escrow_id = requireNonEmptyString(issues, "escrow_id", b.escrow_id, "escrow_id");

  const callback_url = optionalNonEmptyString(b.callback_url);

  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const buyerUserId = buyer_user_id as string;
    const escrowId = escrow_id as string;
    const providerName = provider as string;
    const payerEmail = email as string;
    const amountMinor = amount_minor as number;
    const currencyCode = currency_code as number;
    const idemKey = idempotency_key as string;
    const paymentPurpose = purpose as number;

    const response = await paymentService.createPaymentIntent({
      buyer_user_id: buyerUserId,
      escrow_id: escrowId,
      amount_minor: amountMinor,
      currency_code: currencyCode,
      provider: providerName,
      email: payerEmail,
      callback_url,
      idempotency_key: idemKey,
      purpose: paymentPurpose,
    });

    logger.info({ buyerUserId, escrowId }, "Payment intent created");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to create payment intent", "Payment");
  }
});

router.post("/verify", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const provider = requireProvider(issues, b.provider);
  const reference = requireReference(issues, b.reference);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const providerName = provider as string;
    const paymentRef = reference as string;
    const response = await paymentService.verifyPaymentByReference({
      provider: providerName,
      reference: paymentRef,
    });

    logger.info({ reference: paymentRef }, "Payment verified");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to verify payment", "Payment");
  }
});

router.get("/verify/:reference", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const q = queryRecord(req.query);
  const provider = requireProvider(issues, queryFirst(q, "provider") ?? queryFirst(q, "gateway"), "provider");
  const reference = requireReference(issues, req.params.reference);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const providerName = provider as string;
    const paymentRef = reference as string;
    const response = await paymentService.verifyPaymentByReference({
      provider: providerName,
      reference: paymentRef,
    });

    logger.info({ reference: paymentRef }, "Payment verified");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to verify payment", "Payment");
  }
});

router.post("/wallet-topup/intent", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }

  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const provider = requireProvider(issues, b.provider);
  const currency_code = requireIntIn(issues, "currency_code", b.currency_code, CURRENCY_CODES, "currency_code");
  const amount_minor = requirePositiveInt(issues, "amount_minor", b.amount_minor);
  let user_id = optionalNonEmptyString(req.user?.userId);
  if (optionalNonEmptyString(b.user_id) && b.user_id !== user_id) {
    issues.push({
      field: "user_id",
      message: "user_id must match the authenticated user",
    });
  }
  if (!user_id) {
    issues.push({ field: "user_id", message: "user_id is required" });
  }

  let email = optionalNonEmptyString(b.email);
  if (!email) email = optionalNonEmptyString(req.user?.email);
  if (!email) {
    issues.push({ field: "email", message: "email is required" });
  }
  const callback_url = optionalNonEmptyString(b.callback_url);

  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const topupUserId = user_id as string;
    const amountMinor = amount_minor as number;
    const currencyCode = currency_code as number;
    const providerName = provider as string;
    const userEmail = email as string;
    const idemKey = idempotency_key as string;

    const response = await paymentService.createWalletTopupIntent({
      user_id: topupUserId,
      amount_minor: amountMinor,
      currency_code: currencyCode,
      provider: providerName,
      email: userEmail,
      callback_url,
      idempotency_key: idemKey,
    });

    logger.info({ userId: topupUserId, amountMinor }, "Wallet topup intent created");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to create wallet topup intent", "Payment");
  }
});

router.post("/wallet-topup/verify", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const provider = requireProvider(issues, b.provider);
  const reference = requireReference(issues, b.reference);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const providerName = provider as string;
    const paymentRef = reference as string;
    const response = await paymentService.verifyWalletTopup({
      provider: providerName,
      reference: paymentRef,
    });

    logger.info({ reference: paymentRef }, "Wallet topup verified");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to verify wallet topup", "Payment");
  }
});

router.get("/wallet-topup/verify/:reference", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const q = queryRecord(req.query);
  const provider = requireProvider(issues, queryFirst(q, "provider") ?? queryFirst(q, "gateway"), "provider");
  const reference = requireReference(issues, req.params.reference);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const providerName = provider as string;
    const paymentRef = reference as string;
    const response = await paymentService.verifyWalletTopup({
      provider: providerName,
      reference: paymentRef,
    });

    logger.info({ reference: paymentRef }, "Wallet topup verified");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to verify wallet topup", "Payment");
  }
});

router.post("/webhook/:provider", async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const provider = requireProvider(issues, req.params.provider, "provider");
  const signature =
    (req.headers["x-paystack-signature"] ||
      req.headers["verif-hash"] ||
      req.headers["stripe-signature"] ||
      "") + "";
  if (!String(signature).trim()) {
    issues.push({ field: "signature", message: "Webhook signature header is required" });
  }
  const rawBody = req.rawBody;
  const payload_json = typeof rawBody === "string" ? rawBody : "";
  if (!payload_json) {
    issues.push({
      field: "payload",
      message: "Raw webhook body is required; ensure application/json body parsing captured rawBody",
    });
  }
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const body = bodyRecord(req.body);
    const event = body ? optionalNonEmptyString(body.event) ?? "" : "";

    const response = await paymentService.handleProviderWebhook({
      provider: provider as string,
      signature: String(signature),
      event,
      payload_json,
    });

    logger.info({ provider, event }, "Provider webhook processed");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to process webhook", "Payment");
  }
});

export default router;
