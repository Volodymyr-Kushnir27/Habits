import { supabaseAdmin } from '../supabaseAdmin.js';
import { generateImagesFromAvatar } from '../ai/generateImages.js';
import { slicePuzzleFromBuffer } from '../puzzles/slicePuzzleFromBuffer.js';

const GENERATED_BUCKET = 'avatar_generated';
const PIECES_BUCKET = 'avatar-puzzle-pieces';

function nowIso() {
  return new Date().toISOString();
}

async function updateJob(jobId, patch) {
  const payload = {
    ...patch,
    updated_at: nowIso(),
  };

  console.log('UPDATE JOB PATCH:', jobId, payload);

  const { error } = await supabaseAdmin
    .from('avatar_generation_jobs')
    .update(payload)
    .eq('id', jobId);

  if (error) {
    console.error('UPDATE JOB ERROR:', error);
    throw error;
  }
}

async function updateVariant(variantId, patch) {
  console.log('UPDATE VARIANT PATCH:', variantId, Object.keys(patch));

  const { error } = await supabaseAdmin
    .from('avatar_variants')
    .update(patch)
    .eq('id', variantId);

  if (error) {
    console.error('UPDATE VARIANT ERROR:', error);
    throw error;
  }
}

async function downloadAvatarBuffer(avatarPath) {
  console.log('DOWNLOAD AVATAR START:', avatarPath);

  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .download(avatarPath);

  if (error) {
    console.error('DOWNLOAD AVATAR ERROR:', error);
    throw error;
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log('DOWNLOAD AVATAR DONE:', {
    path: avatarPath,
    bytes: buffer.length,
  });

  return buffer;
}

async function uploadGeneratedImage(path, buffer) {
  console.log('UPLOAD GENERATED START:', path, buffer.length);

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

  console.log('UPLOAD GENERATED DONE:', path);
}

async function uploadPuzzlePiece(path, buffer) {
  const { error } = await supabaseAdmin.storage
    .from(PIECES_BUCKET)
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error('UPLOAD PUZZLE PIECE ERROR:', error);
    throw error;
  }
}

async function insertVariant({ job, idx, prompt, generatedPath, piecesCount }) {
  const payload = {
    user_id: job.user_id,
    job_id: job.id,
    idx,
    prompt,
    generated_path: generatedPath,
    pieces_count: piecesCount,
    is_completed: false,
  };

  console.log('INSERT VARIANT START:', payload);

  const { data, error } = await supabaseAdmin
    .from('avatar_variants')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('INSERT VARIANT ERROR:', error, payload);
    throw error;
  }

  console.log('INSERT VARIANT DONE:', data.id);

  return data;
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

    console.log('AI GENERATION START');

    const generated = await generateImagesFromAvatar({
      avatarBuffer,
    });

    console.log('AI GENERATION DONE:', {
      isArray: Array.isArray(generated),
      count: generated?.length,
    });

    if (!Array.isArray(generated) || generated.length === 0) {
      throw new Error('AI did not return generated images');
    }

    for (let i = 0; i < generated.length; i += 1) {
      const item = generated[i];
      const title = item.title || `Variant ${i + 1}`;

      const imageBuffer = Buffer.isBuffer(item.buffer)
        ? item.buffer
        : Buffer.from(item.buffer);

      const generatedPath = `${job.user_id}/${job.id}/${String(i + 1).padStart(2, '0')}.png`;

      console.log('VARIANT LOOP START:', {
        index: i,
        title,
        generatedPath,
        bytes: imageBuffer.length,
      });

      await updateJob(job.id, {
        progress_stage: `saving_variant_${i + 1}`,
        progress_percent: 20 + Math.round((i / generated.length) * 60),
      });

      await uploadGeneratedImage(generatedPath, imageBuffer);

      const variant = await insertVariant({
        job,
        idx: i,
        prompt: title,
        generatedPath,
        piecesCount: 30,
      });

      const piecesFolder = `${job.user_id}/${job.id}/${variant.id}`;

      console.log('SLICING START:', {
        variantId: variant.id,
        piecesFolder,
      });

      await updateJob(job.id, {
        progress_stage: `slicing_variant_${i + 1}`,
        progress_percent: 25 + Math.round((i / generated.length) * 65),
      });

      const sliceResult = await slicePuzzleFromBuffer({
        imageBuffer,
        piecesFolder,
        patternSeedKey: `${job.user_id}_${job.id}_${variant.id}`,
        uploadPieceFn: uploadPuzzlePiece,
      });

      console.log('SLICING DONE:', {
        variantId: variant.id,
        piecesCount: sliceResult.piecesCount,
        width: sliceResult.width,
        height: sliceResult.height,
      });

      await updateVariant(variant.id, {
        pieces_bucket: PIECES_BUCKET,
        pieces_folder: piecesFolder,
        board_cols: sliceResult.boardCols,
        board_rows: sliceResult.boardRows,
        image_width: sliceResult.width,
        image_height: sliceResult.height,
        piece_aspect_ratio: sliceResult.pieceAspectRatio,
        cut_pattern: sliceResult.cutPattern,
        piece_manifest: sliceResult.manifest,
        pieces_count: sliceResult.piecesCount,
      });

      console.log('VARIANT LOOP DONE:', {
        jobId: job.id,
        variantId: variant.id,
        idx: i,
        title,
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