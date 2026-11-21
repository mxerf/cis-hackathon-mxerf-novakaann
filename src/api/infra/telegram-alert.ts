import type { DecoyReceipt, MuleArtifact } from "../../shared/mirage-types.ts";

export type TelegramAlertResult = {
  sent: boolean;
  reason?: "not_configured" | "http_error" | "network_error";
};

export type TrustedAlertPayload = {
  callerNumber: string;
  coercionScore: number;
  capturedMules: MuleArtifact[];
  receipt?: DecoyReceipt;
};

const TELEGRAM_TIMEOUT_MS = 8_000;

export async function sendTelegramAlert(
  payload: TrustedAlertPayload,
): Promise<TelegramAlertResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return { sent: false, reason: "not_configured" };
  }

  const muleLines = payload.capturedMules
    .map((m) => `• #${m.attemptNumber} [${m.kind.toUpperCase()}]: ${m.value}`)
    .join("\n");

  const receiptLine = payload.receipt
    ? `Decoy receipt: ${payload.receipt.refCode} (${payload.receipt.amount} ${payload.receipt.currency})`
    : "Decoy receipt: pending";

  const text = [
    "Mirage Shield — Coercion Trap Triggered",
    `Caller: ${payload.callerNumber} (score ${payload.coercionScore}/100)`,
    "Real customer funds: 100% LOCKED (0 debited)",
    receiptLine,
    muleLines ? `Captured mule accounts:\n${muleLines}` : "Captured mule accounts: none",
  ].join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { sent: false, reason: "http_error" };
    }

    return { sent: true };
  } catch {
    // Optional external notification must never fail banking mutations
    return { sent: false, reason: "network_error" };
  }
}
