import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreatePremiumJobBody = {
  sourceImagePath?: string;
  prompt?: string;
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

function addOneMonthISO(from = new Date()) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function normalizePrompt(input: string) {
  return input.trim().replace(/\s+/g, " ");
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

    const body = (await req.json()) as CreatePremiumJobBody;

    const sourceImagePath = body?.sourceImagePath?.trim();
    const prompt = normalizePrompt(body?.prompt || "");

    if (!sourceImagePath) {
      return jsonResponse({ error: "sourceImagePath is required" }, 400);
    }

    if (!prompt) {
      return jsonResponse({ error: "prompt is required" }, 400);
    }

    if (prompt.length > 500) {
      return jsonResponse({ error: "Prompt is too long. Max 500 chars." }, 400);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_premium, premium_expires_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }

    const now = new Date();
    const premiumExpiresAt = profile.premium_expires_at
      ? new Date(profile.premium_expires_at)
      : null;

    const premiumActive =
      profile.is_premium === true &&
      premiumExpiresAt !== null &&
      premiumExpiresAt.getTime() > now.getTime();

    if (!premiumActive) {
      return jsonResponse({ error: "Premium subscription is not active" }, 403);
    }

    const sourceBucket = Deno.env.get("PREMIUM_SOURCE_BUCKET") || "premium-source-images";

    const { data: sourceFile, error: sourceFileError } = await supabaseAdmin.storage
      .from(sourceBucket)
      .list(sourceImagePath.split("/").slice(0, -1).join("/"), {
        limit: 100,
        search: sourceImagePath.split("/").pop(),
      });

    if (sourceFileError) {
      return jsonResponse(
        { error: `Cannot verify source image: ${sourceFileError.message}` },
        400
      );
    }

    const exists = (sourceFile || []).some((x) => {
      const fullPath = `${sourceImagePath.split("/").slice(0, -1).join("/")}/${x.name}`;
      return fullPath === sourceImagePath;
    });

    if (!exists) {
      return jsonResponse({ error: "Source image not found in storage" }, 400);
    }

    const { data: limitRow, error: limitError } = await supabaseAdmin
      .from("premium_generation_limits")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (limitError) {
      return jsonResponse({ error: limitError.message }, 500);
    }

    if (limitRow?.next_allowed_at) {
      const nextAllowed = new Date(limitRow.next_allowed_at);
      if (nextAllowed.getTime() > now.getTime()) {
        return jsonResponse(
          {
            error: "Premium generation is on cooldown",
            nextAllowedAt: limitRow.next_allowed_at,
          },
          429
        );
      }
    }

    const { data: pendingJob, error: pendingJobError } = await supabaseAdmin
      .from("premium_generation_jobs")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingJobError) {
      return jsonResponse({ error: pendingJobError.message }, 500);
    }

    if (pendingJob) {
      return jsonResponse(
        {
          error: "You already have an active premium generation job",
          activeJobId: pendingJob.id,
          activeJobStatus: pendingJob.status,
        },
        409
      );
    }

    const nextAllowedAt = addOneMonthISO(now);

    const { data: job, error: jobError } = await supabaseAdmin
      .from("premium_generation_jobs")
      .insert({
        user_id: user.id,
        source_image_path: sourceImagePath,
        prompt,
        status: "pending",
        variants_to_generate: 5,
        progress_stage: "queued",
        progress_percent: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      return jsonResponse({ error: jobError?.message || "Failed to create job" }, 500);
    }

    const { error: limitUpsertError } = await supabaseAdmin
      .from("premium_generation_limits")
      .upsert({
        user_id: user.id,
        last_generated_at: now.toISOString(),
        next_allowed_at: nextAllowedAt,
        updated_at: now.toISOString(),
      });

    if (limitUpsertError) {
      return jsonResponse({ error: limitUpsertError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      jobId: job.id,
      nextAllowedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});