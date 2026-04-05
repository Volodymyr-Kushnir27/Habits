import { supabaseAdmin } from '../supabaseAdmin.js';
import { generateImagesFromAvatar } from '../ai/generateImages.js';

const GENERATED_BUCKET = 'avatar_generated';
const PIECES_COUNT = 16;

function nowIso() {
  return new Date().toISOString();
}

async function updateJob(jobId, patch) {
  const payload = {
    ...patch,
    updated_at: nowIso(),
  };

  const { error } = await supabaseAdmin
    .from('avatar_generation_jobs')
    .update(payload)
    .eq('id', jobId);

  if (error) {
    console.error('UPDATE JOB ERROR:', error);
    throw error;
  }
}

async function downloadAvatarBuffer(avatarPath) {
  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .download(avatarPath);

  if (error) {
    console.error('DOWNLOAD AVATAR ERROR:', error);
    throw error;
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadGeneratedImage(path, buffer) {
  const { error } = await supabaseAdmin.storage
    .from(GENERATED_BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error('UPLOAD GENERATED IMAGE ERROR:', error);
    throw error;
  }
}

async function insertVariant({ job, idx, prompt, generatedPath }) {
  const payload = {
    user_id: job.user_id,
    job_id: job.id,
    idx,
    prompt,
    generated_path: generatedPath,
    pieces_count: PIECES_COUNT,
    is_completed: false,
  };

  const { error } = await supabaseAdmin
    .from('avatar_variants')
    .insert(payload);

  if (error) {
    console.error('INSERT VARIANT ERROR:', error, payload);
    throw error;
  }
}

export async function processAvatarJob(job) {
  console.log('PROCESS JOB START:', job.id, job.avatar_path);

  try {
    await updateJob(job.id, {
      status: 'processing',
      progress_stage: 'downloading_avatar',
      progress_percent: 5,
      error_text: null,
    });

    const avatarBuffer = await downloadAvatarBuffer(job.avatar_path);

    await updateJob(job.id, {
      progress_stage: 'generating_ai_images',
      progress_percent: 15,
    });

    const generated = await generateImagesFromAvatar({
      avatarBuffer,
      userId: job.user_id,
    });

    console.log('GENERATED IMAGES RESULT:', Array.isArray(generated), generated?.length);

    if (!Array.isArray(generated) || generated.length === 0) {
      throw new Error('AI did not return any generated images');
    }

    for (let i = 0; i < generated.length; i += 1) {
      const item = generated[i];
      const title = item.title || `Variant ${i + 1}`;

      const imageBuffer = Buffer.isBuffer(item.buffer)
        ? item.buffer
        : Buffer.from(item.buffer);

      await updateJob(job.id, {
        progress_stage: `saving_variant_${i + 1}`,
        progress_percent: 20 + Math.round((i / generated.length) * 70),
      });

      const generatedPath = `${job.user_id}/${job.id}/${String(i + 1).padStart(2, '0')}.png`;

      await uploadGeneratedImage(generatedPath, imageBuffer);

      await insertVariant({
        job,
        idx: i,
        prompt: title,
        generatedPath,
      });

      console.log('VARIANT SAVED:', {
        jobId: job.id,
        idx: i,
        title,
        generatedPath,
      });
    }

    await updateJob(job.id, {
      status: 'done',
      progress_stage: 'done',
      progress_percent: 100,
    });

    console.log('PROCESS JOB DONE:', job.id);
  } catch (error) {
    console.error('PROCESS JOB ERROR:', error);

    try {
      await updateJob(job.id, {
        status: 'failed',
        progress_stage: 'failed',
        error_text: error?.message || String(error),
      });
    } catch (updateError) {
      console.error('FAILED TO MARK JOB FAILED:', updateError);
    }

    throw error;
  }
}