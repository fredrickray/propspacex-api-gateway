import { Response } from "express";

/** Proto `payment.CurrencyCode` — reject UNSPECIFIED for mutating calls */
export const CURRENCY_CODES = [1, 2] as const;

export const PAYMENT_PURPOSES = [0, 1, 2] as const;
export const REQUIRED_PAYMENT_PURPOSES = [1, 2] as const;
export const ESCROW_PAYMENT_INTENT_PURPOSES = [1] as const;

export const ACTOR_ROLES = [0, 1, 2, 3, 4] as const;

export const ESCROW_STATUSES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/** Typical admin resolutions for `ResolveEscrowDispute` */
export const ESCROW_DISPUTE_RESOLVE_OUTCOMES = [3, 4, 5, 6] as const;

export const WITHDRAWAL_STATUSES = [0, 1, 2, 3, 4, 5] as const;

export type ValidationIssue = { field: string; message: string };

export function sendValidationError(res: Response, issues: ValidationIssue[]): void {
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: issues.reduce<Record<string, string>>((acc, { field, message }) => {
      acc[field] = message;
      return acc;
    }, {}),
  });
}

export function bodyRecord(body: unknown): Record<string, unknown> | null {
  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  return body as Record<string, unknown>;
}

export function queryRecord(query: unknown): Record<string, unknown> {
  if (!query || typeof query !== "object") return {};
  return query as Record<string, unknown>;
}

/** First value for a query key (Express may use string[]). */
export function queryFirst(query: Record<string, unknown>, key: string): unknown {
  const v = query[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export function queryString(query: Record<string, unknown>, key: string): string | undefined {
  return optionalNonEmptyString(queryFirst(query, key));
}

function trimStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== "string") return String(v).trim();
  const s = v.trim();
  return s === "" ? undefined : s;
}

export function requireNonEmptyString(
  issues: ValidationIssue[],
  field: string,
  value: unknown,
  label?: string
): string | undefined {
  const s = trimStr(value);
  if (s === undefined) {
    issues.push({ field, message: `${label ?? field} is required` });
    return undefined;
  }
  return s;
}

export function optionalNonEmptyString(value: unknown): string | undefined {
  return trimStr(value);
}

export function requirePositiveInt(
  issues: ValidationIssue[],
  field: string,
  value: unknown,
  label?: string
): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    issues.push({
      field,
      message: `${label ?? field} must be a positive integer`,
    });
    return undefined;
  }
  return n;
}

export function requireNonNegativeInt(
  issues: ValidationIssue[],
  field: string,
  value: unknown,
  label?: string
): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    issues.push({
      field,
      message: `${label ?? field} must be a non-negative integer`,
    });
    return undefined;
  }
  return n;
}

export function requireIntIn<T extends readonly number[]>(
  issues: ValidationIssue[],
  field: string,
  value: unknown,
  allowed: T,
  label?: string
): T[number] | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    issues.push({ field, message: `${label ?? field} must be an integer` });
    return undefined;
  }
  if (!allowed.includes(n as T[number])) {
    issues.push({ field, message: `${label ?? field} has an invalid value` });
    return undefined;
  }
  return n as T[number];
}

export function optionalIntIn<T extends readonly number[]>(
  issues: ValidationIssue[],
  field: string,
  value: unknown,
  allowed: T,
  label?: string
): T[number] | undefined | null {
  if (value === null || value === undefined || value === "") return undefined;
  return requireIntIn(issues, field, value, allowed, label);
}

export function paginationFromQuery(
  issues: ValidationIssue[],
  query: Record<string, unknown>,
  defaults: { page: number; limit: number } = { page: 1, limit: 10 }
): { page: number; limit: number } | null {
  const pageRaw = queryFirst(query, "page") ?? defaults.page;
  const limitRaw = queryFirst(query, "limit") ?? defaults.limit;
  const page = typeof pageRaw === "number" ? pageRaw : Number(pageRaw);
  const limit = typeof limitRaw === "number" ? limitRaw : Number(limitRaw);
  if (!Number.isFinite(page) || !Number.isInteger(page) || page < 1) {
    issues.push({ field: "page", message: "page must be an integer >= 1" });
    return null;
  }
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    issues.push({ field: "limit", message: "limit must be an integer between 1 and 100" });
    return null;
  }
  return { page, limit };
}

const PROVIDER_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

export function requireProvider(issues: ValidationIssue[], value: unknown, field = "provider"): string | undefined {
  const s = requireNonEmptyString(issues, field, value, "provider");
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (!PROVIDER_PATTERN.test(lower)) {
    issues.push({
      field,
      message: "provider must be a short lowercase identifier (e.g. paystack)",
    });
    return undefined;
  }
  return lower;
}

export function requireReference(issues: ValidationIssue[], value: unknown): string | undefined {
  const s = requireNonEmptyString(issues, "reference", value, "reference");
  if (!s) return undefined;
  if (s.length > 512) {
    issues.push({ field: "reference", message: "reference is too long" });
    return undefined;
  }
  return s;
}

export function requireIdempotencyKey(issues: ValidationIssue[], value: unknown): string | undefined {
  const s = requireNonEmptyString(issues, "idempotency_key", value, "idempotency_key");
  if (!s) return undefined;
  if (s.length > 256) {
    issues.push({ field: "idempotency_key", message: "idempotency_key must be at most 256 characters" });
    return undefined;
  }
  return s;
}
