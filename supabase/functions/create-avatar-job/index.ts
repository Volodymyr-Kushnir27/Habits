// supabase/functions/avatar-generate-pack/index.ts
// Deno / Supabase Edge Function
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROMPTS: string[] = [
  "Create a high-quality square portrait avatar. Preserve the person’s facial identity. Style: cinematic soft light, natural skin tones.",
  "Square avatar portrait, preserve identity. Style: watercolor illustration, subtle paper texture.",
  "Square avatar portrait, preserve identity. Style: 3D stylized character, clean background, soft shadows.",
  "Square avatar portrait, preserve identity. Style: cyberpunk neon rim light, dark background, high contrast.",
  "Square avatar portrait, preserve identity. Style: anime-inspired, clean line art, soft shading.",
  "Square avatar portrait, preserve identity. Style: retro 90s photo, slight film grain, warm tones.",
  "Square avatar portrait, preserve identity. Style: minimal flat illustration, bold shapes, pastel palette.",
  "Square avatar portrait, preserve identity. Style: claymation look, studio lighting, gentle DOF.",
  "Square avatar portrait, preserve identity. Style: noir black-and-white, dramatic shadows, crisp.",
  "Square avatar portrait, preserve identity. Style: futuristic corporate headshot, bright background, sharp."
];

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { userId, sourceAvatarPath } = await req.json();

  // 1) Create job row
  const { data: job, error: jobErr } = await supabase
    .from("avatar_jobs")
    .insert({
      user_id: userId,
      source_avatar_path: sourceAvatarPath,
      status: "queued",
    })
    .select()
    .single();

  if (jobErr) return json({ error: jobErr.message }, 400);
  const jobId = job.id;

  // 2) Run generation in background (don’t block client)
  EdgeRuntime.waitUntil(runGeneration({ supabase, userId, jobId, sourceAvatarPath }));

  return json({ jobId }, 200);
});

async function runGeneration({
  supabase,
  userId,
  jobId,
  sourceAvatarPath,
}: {
  supabase: any;
  userId: string;
  jobId: string;
  sourceAvatarPath: string;
}) {
  try {
    await supabase.from("avatar_jobs").update({ status: "generating" }).eq("id", jobId);

    // Download source avatar from Storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("avatars")
      .download(sourceAvatarPath);

    if (dlErr) throw dlErr;

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const b64 = toBase64(bytes);
    const dataUrl = `data:image/jpeg;base64,${b64}`;

    for (let i = 0; i < PROMPTS.length; i++) {
      const prompt = PROMPTS[i];

      // OpenAI Images API: POST /images/edits (JSON) with images[].image_url = base64 data URL
      const imgB64 = await openaiEditImage({
        model: "gpt-image-1.5",
        prompt,
        inputDataUrl: dataUrl,
      });

      const outPath = `${userId}/${jobId}/${String(i).padStart(2, "0")}.png`;
      const outBytes = base64ToBytes(imgB64);

      const { error: upErr } = await supabase.storage
        .from("avatar_generated")
        .upload(outPath, outBytes, {
          contentType: "image/png",
          upsert: true,
          cacheControl: "3600",
        });

      if (upErr) throw upErr;

      const { error: variantErr } = await supabase
        .from("avatar_variants")
        .insert({
          job_id: jobId,
          idx: i,
          prompt,
          generated_path: outPath,
        });

      if (variantErr) throw variantErr;
    }

    await supabase.from("avatar_jobs").update({ status: "ready" }).eq("id", jobId);
  } catch (e: any) {
    await supabase
      .from("avatar_jobs")
      .update({ status: "failed", error: e?.message ?? String(e) })
      .eq("id", jobId);
  }
}

async function openaiEditImage({
  model,
  prompt,
  inputDataUrl,
}: {
  model: string;
  prompt: string;
  inputDataUrl: string;
}) {
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      images: [{ image_url: inputDataUrl }],
      // optional knobs you can expose later:
      // input_fidelity: "high",
      // size: "1024x1024",
      // quality: "medium",
      // output_format: "png",
      // background: "opaque",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI images/edits failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const b64_json = json?.data?.[0]?.b64_json;
  if (!b64_json) throw new Error("OpenAI response missing data[0].b64_json");
  return b64_json as string;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Deno helpers
function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
