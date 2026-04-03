import OpenAI from 'openai';
import { supabaseAdmin } from '../supabaseAdmin.js';
import { buildAvatarStylePrompts } from '../ai/prompts.js';
import { generateFallbackVariants } from '../ai/stylizeFallback.js';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function nowIso() {
  return new Date().toISOString();
}

async function updateJob(jobId, patch) {
  const { error } = await supabaseAdmin
    .from('avatar_generation_jobs')
    .update({
      ...patch,
      updated_at: nowIso(),
    })
    .eq('id', jobId);

  if (error) throw error;
}

async function downloadAvatarBuffer(avatarPath) {
  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .download(avatarPath);

  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function uploadGeneratedImage({ path, buffer }) {
  const { error } = await supabaseAdmin.storage
    .from('avatar_generated')
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;
}

async function insertVariant({ job, idx, prompt, generatedPath }) {
  const { error } = await supabaseAdmin
    .from('avatar_variants')
    .insert({
      user_id: job.user_id,
      job_id: job.id,
      idx,
      prompt,
      generated_path: generatedPath,
      pieces_count: 16,
      is_completed: false,
    });

  if (error) throw error;
}

async function generateWithOpenAI({ avatarBuffer, prompts }) {
  if (!openai) return null;

  const variants = [];

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];

    const result = await openai.images.edit({
      model: 'gpt-image-1',
      image: avatarBuffer,
      prompt: `Preserve facial identity and make a square avatar portrait. Style: ${p.title}.`,
      size: '1024x1024',
    });

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(`OpenAI did not return image for prompt ${p.code}`);
    }

    variants.push({
      index: i,
      code: p.code,
      title: p.title,
      imageBuffer: Buffer.from(b64, 'base64'),
    });
  }

  return variants;
}

export async function processAvatarJob(job) {
  try {
    await updateJob(job.id, {
      status: 'processing',
      progress_stage: 'downloading_avatar',
      progress_percent: 5,
      error_text: null,
    });

    const avatarBuffer = await downloadAvatarBuffer(job.avatar_path);

    await updateJob(job.id, {
      progress_stage: 'preparing_prompts',
      progress_percent: 10,
    });

    const prompts = buildAvatarStylePrompts();

    await updateJob(job.id, {
      progress_stage: 'generating_images',
      progress_percent: 20,
    });

    let generatedVariants;

    try {
      generatedVariants = await generateWithOpenAI({
        avatarBuffer,
        prompts,
      });
    } catch (e) {
      console.error('OPENAI GENERATION FAILED, FALLBACK ENABLED:', e);
      generatedVariants = await generateFallbackVariants(avatarBuffer, prompts);
    }

    for (let i = 0; i < generatedVariants.length; i++) {
      const item = generatedVariants[i];
      const path = `${job.user_id}/${job.id}/${String(i).padStart(2, '0')}.png`;

      await updateJob(job.id, {
        progress_stage: `saving_variant_${i + 1}`,
        progress_percent: 25 + Math.round((i / generatedVariants.length) * 70),
      });

      await uploadGeneratedImage({
        path,
        buffer: item.imageBuffer,
      });

      await insertVariant({
        job,
        idx: i,
        prompt: item.title,
        generatedPath: path,
      });
    }

    await updateJob(job.id, {
      status: 'done',
      progress_stage: 'done',
      progress_percent: 100,
    });

    console.log('JOB DONE:', job.id);
  } catch (error) {
    console.error('PROCESS JOB ERROR:', error);

    await updateJob(job.id, {
      status: 'failed',
      progress_stage: 'failed',
      error_text: error?.message || String(error),
    });

    throw error;
  }
}