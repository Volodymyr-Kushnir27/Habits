import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RestoreBody = {
  productId?: string;
  originalTransactionId?: string;
  expiresAt?: string;
  isPremium?: boolean;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid user session" }, 401);
    }

    const body = (await req.json()) as RestoreBody;

    const productId = body?.productId?.trim();
    const originalTransactionId = body?.originalTransactionId?.trim();
    const expiresAtRaw = body?.expiresAt?.trim();
    const isPremium = body?.isPremium === true;

    if (!productId) {
      return jsonResponse({ error: "productId is required" }, 400);
    }

    if (!originalTransactionId) {
      return jsonResponse({ error: "originalTransactionId is required" }, 400);
    }

    if (!expiresAtRaw) {
      return jsonResponse({ error: "expiresAt is required" }, 400);
    }

    const expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) {
      return jsonResponse({ error: "Invalid expiresAt" }, 400);
    }

    const now = new Date();
    const premiumActive = isPremium && expiresAt.getTime() > now.getTime();

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_premium: premiumActive,
        premium_expires_at: expiresAt.toISOString(),
        premium_plan: "premium_monthly",
        premium_product_id: productId,
        premium_platform: "ios",
        premium_last_verified_at: now.toISOString(),
        premium_original_transaction_id: originalTransactionId,
        updated_at: now.toISOString(),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      return jsonResponse({ error: profileUpdateError.message }, 500);
    }

    const { error: eventInsertError } = await supabaseAdmin
      .from("subscription_events")
      .insert({
        user_id: user.id,
        platform: "ios",
        product_id: productId,
        original_transaction_id: originalTransactionId,
        status: premiumActive ? "RESTORE_ACTIVE" : "RESTORE_INACTIVE",
        payload: {
          source: "restore-premium-status",
          userId: user.id,
          productId,
          originalTransactionId,
          expiresAt: expiresAt.toISOString(),
          isPremium: premiumActive,
        },
      });

    if (eventInsertError) {
      return jsonResponse({ error: eventInsertError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      isPremium: premiumActive,
      premiumExpiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});