import { Request, Response, Router } from "express";
import { escrowService, userService } from "../grpc-clients";
import { authenticate, authorizeRoles } from "@middlewares/auth.middleware";
import config from "@config/service.config";
import { handleGrpcError } from "@utils/handleGrpcError";
import {
  ACTOR_ROLES,
  bodyRecord,
  ESCROW_DISPUTE_RESOLVE_OUTCOMES,
  ESCROW_STATUSES,
  optionalIntIn,
  optionalNonEmptyString,
  queryRecord,
  queryFirst,
  queryString,
  requireIdempotencyKey,
  requireIntIn,
  requireNonEmptyString,
  requireNonNegativeInt,
  requirePositiveInt,
  paginationFromQuery,
  sendValidationError,
  CURRENCY_CODES,
  type ValidationIssue,
} from "@utils/paymentRequestValidation";

const router = Router();

const roleFromAppRole = (appRole?: string): number => {
  if (appRole === "agent") return 2;
  if (appRole === "admin") return 3;
  return 1;
};

const parseEscrowMetadata = (metadata?: string) => {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const enrichEscrow = async (escrow: any, userId: string) => {
  if (!config.featureFlags.escrowCompatEnrichmentEnabled) {
    return escrow;
  }
  const metadata = parseEscrowMetadata(escrow.metadata_json || escrow.metadataJson);
  let deal: any = null;
  if (escrow.deal_ref || escrow.dealRef) {
    try {
      deal = await userService.getDeal({
        dealId: String(escrow.deal_ref || escrow.dealRef),
        userId,
      });
    } catch {
      deal = null;
    }
  }

  const dealData = deal?.deal || {};
  return {
    ...escrow,
    conversationId:
      dealData.conversationId ||
      (metadata.conversationId as string) ||
      "",
    propertyTitle:
      dealData.propertyTitle ||
      (metadata.propertyTitle as string) ||
      "",
    buyerName: dealData.buyerName || "",
    agentName: dealData.agentName || "",
  };
};

function parseHoldFundsNow(value: unknown): boolean {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return false;
}

router.get("/", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const q = queryRecord(req.query);
  const pagination = paginationFromQuery(issues, q);
  const user_id = optionalNonEmptyString(req.user?.userId);
  if (!user_id) {
    issues.push({ field: "user_id", message: "user_id is required (query or inferred from session)" });
  }
  const role = roleFromAppRole(req.user?.appRole);
  const status = optionalIntIn(issues, "status", queryFirst(q, "status"), ESCROW_STATUSES, "escrow status");
  if (!pagination || issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.listEscrowsByUser({
      user_id: user_id as string,
      role,
      status,
      pagination,
    });
    const escrows = await Promise.all(
      (response as any).escrows.map((escrow: any) =>
        enrichEscrow(escrow, user_id as string)
      )
    );

    res.status(200).json({ ...(response as any), escrows });
  } catch (error) {
    handleGrpcError(res, error, "Failed to list escrows", "Escrow");
  }
});

router.get("/deal/:dealRef", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const deal_ref = requireNonEmptyString(issues, "dealRef", req.params.dealRef, "deal_ref");
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.getEscrowByDealRef({ deal_ref: deal_ref as string });
    const userId = optionalNonEmptyString(req.user?.userId) as string;
    const escrow = (response as any).escrow
      ? await enrichEscrow((response as any).escrow, userId)
      : null;
    res.status(200).json({ ...(response as any), escrow });
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch escrow by deal ref", "Escrow");
  }
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }

  const deal_ref = requireNonEmptyString(issues, "deal_ref", b.deal_ref, "deal_ref");
  const buyer_user_id = optionalNonEmptyString(req.user?.userId);
  if (!buyer_user_id) {
    issues.push({ field: "buyer_user_id", message: "Authenticated buyer session is required" });
  }
  if (optionalNonEmptyString(b.buyer_user_id) && b.buyer_user_id !== buyer_user_id) {
    issues.push({
      field: "buyer_user_id",
      message: "buyer_user_id must match the authenticated user",
    });
  }
  const agent_user_id = requireNonEmptyString(issues, "agent_user_id", b.agent_user_id, "agent_user_id");
  const property_id = requireNonEmptyString(issues, "property_id", b.property_id, "property_id");
  const currency_code = requireIntIn(issues, "currency_code", b.currency_code, CURRENCY_CODES, "currency_code");
  const amount_minor = requirePositiveInt(issues, "amount_minor", b.amount_minor);
  const platform_fee_minor = requireNonNegativeInt(issues, "platform_fee_minor", b.platform_fee_minor ?? 0);
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const hold_funds_now = parseHoldFundsNow(b.hold_funds_now);
  const metadata_json = optionalNonEmptyString(b.metadata_json);

  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.createEscrow({
      deal_ref: deal_ref as string,
      buyer_user_id: buyer_user_id as string,
      agent_user_id: agent_user_id as string,
      property_id: property_id as string,
      currency_code: currency_code as number,
      amount_minor: amount_minor as number,
      platform_fee_minor: platform_fee_minor as number,
      hold_funds_now,
      metadata_json,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to create escrow", "Escrow");
  }
});

router.get("/:escrowId/timeline", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const escrow_id = requireNonEmptyString(issues, "escrowId", req.params.escrowId, "escrow_id");
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.getEscrowTimeline({ escrow_id: escrow_id as string });
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch escrow timeline", "Escrow");
  }
});

router.post("/:escrowId/mark-complete", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const escrow_id = requireNonEmptyString(issues, "escrowId", req.params.escrowId, "escrow_id");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  let agent_user_id = optionalNonEmptyString(req.user?.userId);
  if (optionalNonEmptyString(b.agent_user_id) && b.agent_user_id !== agent_user_id) {
    issues.push({
      field: "agent_user_id",
      message: "agent_user_id must match the authenticated user",
    });
  }
  if (!agent_user_id) {
    issues.push({ field: "agent_user_id", message: "agent_user_id is required" });
  }
  const note = optionalNonEmptyString(b.note);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.markEscrowServiceComplete({
      escrow_id: escrow_id as string,
      agent_user_id: agent_user_id as string,
      note,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to mark escrow complete", "Escrow");
  }
});

router.post("/:escrowId/release", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const escrow_id = requireNonEmptyString(issues, "escrowId", req.params.escrowId, "escrow_id");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
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
  const note = optionalNonEmptyString(b.note);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.releaseEscrow({
      escrow_id: escrow_id as string,
      buyer_user_id: buyer_user_id as string,
      note,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to release escrow", "Escrow");
  }
});

router.post("/:escrowId/cancel", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const escrow_id = requireNonEmptyString(issues, "escrowId", req.params.escrowId, "escrow_id");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const cancelled_by_role = roleFromAppRole(req.user?.appRole);
  const reason = requireNonEmptyString(issues, "reason", b.reason, "reason");
  let cancelled_by_user_id = optionalNonEmptyString(req.user?.userId);
  if (optionalNonEmptyString(b.cancelled_by_user_id) && b.cancelled_by_user_id !== cancelled_by_user_id) {
    issues.push({
      field: "cancelled_by_user_id",
      message: "cancelled_by_user_id must match the authenticated user",
    });
  }
  if (!cancelled_by_user_id) {
    issues.push({ field: "cancelled_by_user_id", message: "cancelled_by_user_id is required" });
  }
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.cancelEscrow({
      escrow_id: escrow_id as string,
      cancelled_by_user_id: cancelled_by_user_id as string,
      cancelled_by_role: cancelled_by_role as number,
      reason: reason as string,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to cancel escrow", "Escrow");
  }
});

router.post("/:escrowId/disputes", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const escrow_id = requireNonEmptyString(issues, "escrowId", req.params.escrowId, "escrow_id");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const opened_by_role = roleFromAppRole(req.user?.appRole);
  const reason = requireNonEmptyString(issues, "reason", b.reason, "reason");
  let opened_by_user_id = optionalNonEmptyString(req.user?.userId);
  if (optionalNonEmptyString(b.opened_by_user_id) && b.opened_by_user_id !== opened_by_user_id) {
    issues.push({
      field: "opened_by_user_id",
      message: "opened_by_user_id must match the authenticated user",
    });
  }
  if (!opened_by_user_id) {
    issues.push({ field: "opened_by_user_id", message: "opened_by_user_id is required" });
  }
  const details = optionalNonEmptyString(b.details);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.openEscrowDispute({
      escrow_id: escrow_id as string,
      opened_by_user_id: opened_by_user_id as string,
      opened_by_role: opened_by_role as number,
      reason: reason as string,
      details,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to open escrow dispute", "Escrow");
  }
});

router.post("/disputes/:disputeId/resolve", authenticate, authorizeRoles("admin"), async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const dispute_id = requireNonEmptyString(issues, "disputeId", req.params.disputeId, "dispute_id");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const resolution = requireIntIn(
    issues,
    "resolution",
    b.resolution,
    ESCROW_DISPUTE_RESOLVE_OUTCOMES,
    "resolution"
  );
  const buyer_award_minor = requireNonNegativeInt(issues, "buyer_award_minor", b.buyer_award_minor ?? 0);
  const agent_award_minor = requireNonNegativeInt(issues, "agent_award_minor", b.agent_award_minor ?? 0);
  let admin_user_id = optionalNonEmptyString(b.admin_user_id);
  if (!admin_user_id) admin_user_id = optionalNonEmptyString(req.user?.userId);
  if (!admin_user_id) {
    issues.push({ field: "admin_user_id", message: "admin_user_id is required" });
  }
  const admin_note = optionalNonEmptyString(b.admin_note);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.resolveEscrowDispute({
      dispute_id: dispute_id as string,
      admin_user_id: admin_user_id as string,
      resolution: resolution as number,
      buyer_award_minor: buyer_award_minor as number,
      agent_award_minor: agent_award_minor as number,
      admin_note,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to resolve escrow dispute", "Escrow");
  }
});

router.get("/:escrowId", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const escrow_id = requireNonEmptyString(issues, "escrowId", req.params.escrowId, "escrow_id");
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await escrowService.getEscrowById({ escrow_id: escrow_id as string });
    const userId = optionalNonEmptyString(req.user?.userId) as string;
    const escrow = (response as any).escrow
      ? await enrichEscrow((response as any).escrow, userId)
      : null;
    res.status(200).json({ ...(response as any), escrow });
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch escrow", "Escrow");
  }
});

export default router;
