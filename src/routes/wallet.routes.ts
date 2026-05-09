import { Request, Response, Router } from "express";
import { walletService } from "../grpc-clients";
import { authenticate, authorizeRoles } from "@middlewares/auth.middleware";
import { handleGrpcError } from "@utils/handleGrpcError";
import {
  bodyRecord,
  optionalNonEmptyString,
  optionalIntIn,
  queryRecord,
  queryFirst,
  requireIdempotencyKey,
  requireIntIn,
  requireNonEmptyString,
  requirePositiveInt,
  paginationFromQuery,
  sendValidationError,
  CURRENCY_CODES,
  WITHDRAWAL_STATUSES,
  type ValidationIssue,
} from "@utils/paymentRequestValidation";

const router = Router();

type WithdrawalLike = Record<string, unknown>;
type WithdrawalListLike = { withdrawals?: unknown[]; [key: string]: unknown };

function mapWithdrawalStatusToLifecycle(status: unknown): string {
  const raw = String(status ?? "").toUpperCase().trim();
  if (raw === "WITHDRAWAL_STATUS_PENDING" || raw === "1") return "pending";
  if (raw === "WITHDRAWAL_STATUS_PROCESSING" || raw === "2") return "processing";
  if (raw === "WITHDRAWAL_STATUS_SUCCESS" || raw === "3") return "success";
  if (raw === "WITHDRAWAL_STATUS_FAILED" || raw === "4") return "failed";
  if (raw === "WITHDRAWAL_STATUS_CANCELLED" || raw === "5") return "cancelled";
  return "unspecified";
}

function withWithdrawalLifecycle(withdrawal: WithdrawalLike): WithdrawalLike {
  return {
    ...withdrawal,
    lifecycle_state: mapWithdrawalStatusToLifecycle(withdrawal.status),
  };
}

router.post("/", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  let user_id = optionalNonEmptyString(b.user_id);
  if (!user_id) user_id = optionalNonEmptyString(req.user?.userId);
  if (!user_id) {
    issues.push({ field: "user_id", message: "user_id is required" });
  }
  const currency_code = requireIntIn(issues, "currency_code", b.currency_code, CURRENCY_CODES, "currency_code");
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.createWallet({
      user_id,
      currency_code,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to create wallet", "Wallet");
  }
});

router.get("/me/transactions", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const q = queryRecord(req.query);
  const pagination = paginationFromQuery(issues, q);
  if (!pagination || issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.listWalletTransactions({
      user_id: req.user!.userId,
      pagination,
      reference_type: optionalNonEmptyString(q.reference_type),
      reference_id: optionalNonEmptyString(q.reference_id),
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch wallet transactions", "Wallet");
  }
});

router.get("/withdrawals/me", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const q = queryRecord(req.query);
  const pagination = paginationFromQuery(issues, q);
  const status = optionalIntIn(issues, "status", queryFirst(q, "status"), WITHDRAWAL_STATUSES, "withdrawal status");
  if (!pagination || issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.listWithdrawals({
      user_id: req.user!.userId,
      pagination,
      status,
    });
    const payload = response as WithdrawalListLike;
    const withdrawals = Array.isArray(payload.withdrawals)
      ? payload.withdrawals.map((w) => withWithdrawalLifecycle(w as WithdrawalLike))
      : [];
    res.status(200).json({ ...payload, withdrawals });
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch withdrawals", "Wallet");
  }
});

router.get("/withdrawals", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const q = queryRecord(req.query);
  const pagination = paginationFromQuery(issues, q);
  const status = optionalIntIn(issues, "status", queryFirst(q, "status"), WITHDRAWAL_STATUSES, "withdrawal status");
  const queryUserId = optionalNonEmptyString(queryFirst(q, "user_id"));

  let userId = req.user!.userId;
  if (req.user?.appRole === "admin" && queryUserId) {
    userId = queryUserId;
  }
  if (!userId) {
    issues.push({ field: "user_id", message: "user_id is required" });
  }
  if (!pagination || issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.listWithdrawals({
      user_id: userId,
      pagination,
      status,
    });
    const payload = response as WithdrawalListLike;
    const withdrawals = Array.isArray(payload.withdrawals)
      ? payload.withdrawals.map((w) => withWithdrawalLifecycle(w as WithdrawalLike))
      : [];
    res.status(200).json({ ...payload, withdrawals });
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch withdrawals", "Wallet");
  }
});

router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const response = await walletService.getWalletByUserId({ user_id: req.user!.userId });
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch wallet", "Wallet");
  }
});

router.get("/:walletId", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const wallet_id = requireNonEmptyString(issues, "walletId", req.params.walletId, "wallet_id");
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.getWalletById({ wallet_id: wallet_id as string });
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to fetch wallet", "Wallet");
  }
});

router.post("/withdrawals", authenticate, async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const amount_minor = requirePositiveInt(issues, "amount_minor", b.amount_minor);
  const bank_code = requireNonEmptyString(issues, "bank_code", b.bank_code, "bank_code");
  const account_number = requireNonEmptyString(issues, "account_number", b.account_number, "account_number");
  const account_name = requireNonEmptyString(issues, "account_name", b.account_name, "account_name");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.requestWithdrawal({
      user_id: req.user!.userId,
      amount_minor: amount_minor as number,
      bank_code: bank_code as string,
      account_number: account_number as string,
      account_name: account_name as string,
      idempotency_key: idempotency_key as string,
    });
    const payload = response as { withdrawal?: WithdrawalLike; [key: string]: unknown };
    const withdrawal = payload.withdrawal ? withWithdrawalLifecycle(payload.withdrawal) : undefined;
    res.status(200).json({ ...payload, withdrawal });
  } catch (error) {
    handleGrpcError(res, error, "Failed to request withdrawal", "Wallet");
  }
});

router.post("/credit", authenticate, authorizeRoles("admin"), async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const user_id = requireNonEmptyString(issues, "user_id", b.user_id, "user_id");
  const amount_minor = requirePositiveInt(issues, "amount_minor", b.amount_minor);
  const reference_type = requireNonEmptyString(issues, "reference_type", b.reference_type, "reference_type");
  const reference_id = requireNonEmptyString(issues, "reference_id", b.reference_id, "reference_id");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const note = optionalNonEmptyString(b.note);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.creditWallet({
      user_id: user_id as string,
      amount_minor: amount_minor as number,
      reference_type: reference_type as string,
      reference_id: reference_id as string,
      note,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to credit wallet", "Wallet");
  }
});

router.post("/debit", authenticate, authorizeRoles("admin"), async (req: Request, res: Response) => {
  const issues: ValidationIssue[] = [];
  const b = bodyRecord(req.body);
  if (!b) {
    sendValidationError(res, [{ field: "body", message: "JSON body is required" }]);
    return;
  }
  const user_id = requireNonEmptyString(issues, "user_id", b.user_id, "user_id");
  const amount_minor = requirePositiveInt(issues, "amount_minor", b.amount_minor);
  const reference_type = requireNonEmptyString(issues, "reference_type", b.reference_type, "reference_type");
  const reference_id = requireNonEmptyString(issues, "reference_id", b.reference_id, "reference_id");
  const idempotency_key = requireIdempotencyKey(issues, b.idempotency_key);
  const note = optionalNonEmptyString(b.note);
  if (issues.length) {
    sendValidationError(res, issues);
    return;
  }

  try {
    const response = await walletService.debitWallet({
      user_id: user_id as string,
      amount_minor: amount_minor as number,
      reference_type: reference_type as string,
      reference_id: reference_id as string,
      note,
      idempotency_key: idempotency_key as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error, "Failed to debit wallet", "Wallet");
  }
});

export default router;
