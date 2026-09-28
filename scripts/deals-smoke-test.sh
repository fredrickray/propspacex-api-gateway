#!/usr/bin/env bash
set -euo pipefail

# Minimal end-to-end smoke test for deal + quote lifecycle.
# Requires jq and running gateway/user/payment services.

BASE_URL="${BASE_URL:-http://localhost:9099/api/v1}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
CONVERSATION_ID="${CONVERSATION_ID:-}"
DEAL_ID="${DEAL_ID:-}"

if [[ -z "${AUTH_TOKEN}" ]]; then
  echo "AUTH_TOKEN is required"
  exit 1
fi

auth_header=(-H "Authorization: Bearer ${AUTH_TOKEN}" -H "Content-Type: application/json")

if [[ -n "${CONVERSATION_ID}" ]]; then
  echo "Creating/getting deal from conversation..."
  create_payload="$(jq -n --arg conversationId "${CONVERSATION_ID}" '{conversationId: $conversationId}')"
  curl -sS -X POST "${BASE_URL}/deals" "${auth_header[@]}" -d "${create_payload}" | jq .
fi

echo "Listing deals..."
curl -sS "${BASE_URL}/deals?page=1&limit=20" "${auth_header[@]}" | jq .

if [[ -n "${DEAL_ID}" ]]; then
  echo "Fetching deal detail..."
  curl -sS "${BASE_URL}/deals/${DEAL_ID}" "${auth_header[@]}" | jq .
fi

echo "Done."
