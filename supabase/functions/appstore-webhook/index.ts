import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function decodeJwsPayload<T = Record<string, unknown>>(jws: string): T | null {
  try {
    const parts = jws.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");

    const decoded = atob(payload);
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function parseAppleDate(value: unknown): string | null {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return null;
}

function isPremiumActive(notificationType?: string, subtype?: string) {
  const deactivateTypes = new Set([
    "EXPIRED",
    "REVOKE",
    "REFUND",
  ]);

  if (notificationType && deactivateTypes.has(notificationType)) {
    return false;
  }

  if (notificationType === "DID_FAIL_TO_RENEW" && subtype !== "GRACE_PERIOD") {
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const signedPayload = body?.signedPayload;

    if (!signedPayload || typeof signedPayload !== "string") {
      return jsonResponse({ error: "Missing signedPayload" }, 400);
    }

    const decoded = decodeJwsPayload<Record<string, any>>(signedPayload);
    if (!decoded) {
      return jsonResponse({ error: "Cannot decode signedPayload" }, 400);
    }

    const notificationType = decoded.notificationType || null;
    const subtype = decoded.subtype || null;
    const data = decoded.data || {};

    const signedTransactionInfo = data.signedTransactionInfo || null;
    const signedRenewalInfo = data.signedRenewalInfo || null;

    const tx = signedTransactionInfo
      ? decodeJwsPayload<Record<string, any>>(signedTransactionInfo)
      : null;

    const renewal = signedRenewalInfo
      ? decodeJwsPayload<Record<string, any>>(signedRenewalInfo)
      : null;

    const originalTransactionId =
      tx?.originalTransactionId ||
      renewal?.originalTransactionId ||
      null;

    const transactionId =
      tx?.transactionId ||
      tx?.webOrderLineItemId ||
      null;

    const productId =
      tx?.productId ||
      renewal?.autoRenewProductId ||
      null;

    const expiresAt =
      parseAppleDate(tx?.expiresDate) ||
      parseAppleDate(renewal?.gracePeriodExpiresDate) ||
      null;

    const status = `${notificationType || "UNKNOWN"}${subtype ? `:${subtype}` : ""}`;

    let userId: string | null = null;

    if (originalTransactionId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("premium_original_transaction_id", String(originalTransactionId))
        .maybeSingle();

      userId = profile?.id || null;
    }

    const { error: insertEventError } = await supabaseAdmin
      .from("subscription_events")
      .insert({
        user_id: userId,
        platform: "ios",
        product_id: productId,
        original_transaction_id: originalTransactionId,
        transaction_id: transactionId ? String(transactionId) : null,
        status,
        payload: body,
      });

    if (insertEventError) {
      return jsonResponse({ error: insertEventError.message }, 500);
    }

    if (userId) {
      const premiumActive = isPremiumActive(notificationType, subtype);

      const updatePayload: Record<string, unknown> = {
        is_premium: premiumActive,
        premium_platform: "ios",
        premium_last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (productId) {
        updatePayload.premium_product_id = String(productId);
      }

      if (originalTransactionId) {
        updatePayload.premium_original_transaction_id = String(originalTransactionId);
      }

      if (expiresAt) {
        updatePayload.premium_expires_at = expiresAt;
      }

      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (updateProfileError) {
        return jsonResponse({ error: updateProfileError.message }, 500);
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});