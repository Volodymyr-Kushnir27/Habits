import { supabaseAdmin } from '../supabaseAdmin.js';
import { downloadAvatar } from '../storage/downloadFromBucket.js';
import { uploadOriginal } from '../storage/uploadToBucket.js';
import { generateImagesFromAvatar } from '../ai/generateImages.js';
import { slicePuzzleFromBuffer } from '../puzzles/slicePuzzleFromBuffer.js';

async function uploadPieceFn(piecePath, pieceBuffer) {
  const { error } = await supabaseAdmin.storage
    .from('puzzles-pieces')
    .upload(piecePath, pieceBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;
}

export async function processAvatarJob(job) {
  const setId = crypto.randomUUID();

  try {
    console.log('PROCESS JOB', job.id);

    await supabaseAdmin
      .from('avatar_generation_jobs')
      .update({
        status: 'processing',
        progress_stage: 'downloading',
        progress_percent: 5,
        error_text: null,
      })
      .eq('id', job.id);

    const avatarBuffer = await downloadAvatar(job.avatar_path);

    await supabaseAdmin
      .from('avatar_generation_jobs')
      .update({
        progress_stage: 'generating_ai',
        progress_percent: 15,
      })
      .eq('id', job.id);

    const generatedImages = await generateImagesFromAvatar({
      avatarBuffer,
    });

    const { error: setInsertError } = await supabaseAdmin
      .from('user_puzzle_sets')
      .insert({
        id: setId,
        user_id: job.user_id,
        avatar_path: job.avatar_path,
        originals_folder: `${job.user_id}/${setId}`,
        pieces_folder: `${job.user_id}/${setId}`,
        status: 'processing',
      });

    if (setInsertError) throw setInsertError;

    for (let i = 0; i < generatedImages.length; i++) {
      const item = generatedImages[i];
      const buffer = item.buffer;

      console.log('BUFFER CHECK', {
        isBuffer: Buffer.isBuffer(buffer),
        length: buffer?.length,
        title: item.title,
      });

      const originalPath = `${job.user_id}/${setId}/${i}.png`;

      await uploadOriginal({
        buffer,
        path: originalPath,
      });

      const piecesFolder = `${job.user_id}/${setId}/${i}`;
      const patternSeedKey = `${job.user_id}_${setId}_${i}_${item.code || item.title || 'style'}`;

      const sliced = await slicePuzzleFromBuffer({
        imageBuffer: buffer,
        piecesFolder,
        patternSeedKey,
        uploadPieceFn,
      });

      const { error: puzzleInsertError } = await supabaseAdmin
        .from('puzzles')
        .insert({
          user_id: job.user_id,
          set_id: setId,
          puzzle_key: `${job.user_id}_${setId}_${i}`,
          title: item.title || `Puzzle ${i + 1}`,
          year: 2026,
          sort_order: i + 1,
          original_image_url: originalPath,
          preview_image_url: originalPath,
          pieces_folder: piecesFolder,
          pieces_count: sliced.piecesCount,
          cut_pattern: sliced.cutPattern,
          is_active: i === 0,
          image_width: sliced.width,
          image_height: sliced.height,
          piece_aspect_ratio: sliced.pieceAspectRatio,
          board_cols: sliced.boardCols,
          board_rows: sliced.boardRows,
          piece_manifest: sliced.manifest,
        });

      if (puzzleInsertError) throw puzzleInsertError;

      const progress = 20 + Math.round(((i + 1) / generatedImages.length) * 70);

      await supabaseAdmin
        .from('avatar_generation_jobs')
        .update({
          progress_stage: 'slicing_uploading',
          progress_percent: progress,
        })
        .eq('id', job.id);
    }

    await supabaseAdmin
      .from('user_puzzle_sets')
      .update({
        status: 'done',
      })
      .eq('id', setId);

    await supabaseAdmin
      .from('avatar_generation_jobs')
      .update({
        status: 'done',
        progress_stage: 'completed',
        progress_percent: 100,
        result_set_id: setId,
      })
      .eq('id', job.id);

    console.log('JOB DONE', job.id);
  } catch (error) {
    console.error('PROCESS JOB ERROR', error);

    await supabaseAdmin
      .from('avatar_generation_jobs')
      .update({
        status: 'failed',
        progress_stage: 'failed',
        error_text: error.message || 'Unknown error',
      })
      .eq('id', job.id);

    throw error;
  }
}