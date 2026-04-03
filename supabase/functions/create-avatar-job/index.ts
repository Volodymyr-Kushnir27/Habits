import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRole) {
      return json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    // Service role for DB writes; auth header for getUser()
    const supabase = createClient(supabaseUrl, serviceRole, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const avatarPath = body?.avatarPath;

    if (!avatarPath || typeof avatarPath !== "string") {
      return json({ ok: false, error: "avatarPath is required (string)" }, 400);
    }

    // 1) Create set row
    const setId = crypto.randomUUID();
    const originalsFolder = `users/${user.id}/${setId}`;
    const piecesFolder = `users/${user.id}/${setId}`;

    const { error: setError } = await supabase.from("user_puzzle_sets").insert({
      id: setId,
      user_id: user.id,
      title: "Avatar Puzzle Pack",
      avatar_path: avatarPath,
      originals_folder: originalsFolder,
      pieces_folder: piecesFolder,
      images_count: 10,
      status: "pending",
    });

    if (setError) throw setError;

    // 2) Create job row
    const { data: jobRow, error: jobError } = await supabase
      .from("avatar_generation_jobs")
      .insert({
        user_id: user.id,
        avatar_path: avatarPath,
        status: "pending",
        progress_stage: "queued",
        progress_percent: 0,
        result_set_id: setId,
      })
      .select("*")
      .single();

    if (jobError) throw jobError;

    // 3) Link set -> job
    const { error: linkError } = await supabase
      .from("user_puzzle_sets")
      .update({ job_id: jobRow.id })
      .eq("id", setId);

    if (linkError) throw linkError;

    return json({
      ok: true,
      job: jobRow,
      set: {
        id: setId,
        originals_folder: originalsFolder,
        pieces_folder: piecesFolder,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: message }, 500);
  }
});
