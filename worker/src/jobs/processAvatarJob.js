import crypto from 'node:crypto';
import sharp from 'sharp';
import { supabaseAdmin } from '../supabaseAdmin.js';
import { generateImagesFromAvatar } from '../ai/generateImages.js';

const ORIGINALS_BUCKET = 'puzzles-originals';
const PIECES_BUCKET = 'puzzles-pieces';

const BOARD_COLS = 5;
const BOARD_ROWS = 6;
const PIECES_COUNT = BOARD_COLS * BOARD_ROWS;

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

  if (error) {
    console.error('UPDATE JOB ERROR:', error);
    throw error;
  }
}

async function upsertSet(setId, patch) {
  const { error } = await supabaseAdmin
    .from('user_puzzle_sets')
    .upsert({
      id: setId,
      ...patch,
      updated_at: nowIso(),
    });

  if (error) {
    console.error('UPSERT SET ERROR:', error);
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

async function uploadBufferToBucket(bucket, path, buffer, contentType = 'image/png') {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`UPLOAD ERROR [${bucket}]`, error);
    throw error;
  }

  return path;
}

function getPublicUrl(bucket, path) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function sliceImageToPieces({
  sourceBuffer,
  setId,
  puzzleKey,
}) {
  const image = sharp(sourceBuffer);
  const metadata = await image.metadata();

  const width = metadata.width || 1080;
  const height = metadata.height || 1080;

  const pieceWidth = Math.floor(width / BOARD_COLS);
  const pieceHeight = Math.floor(height / BOARD_ROWS);

  const manifest = [];

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const pieceIndex = row * BOARD_COLS + col;
      const left = col * pieceWidth;
      const top = row * pieceHeight;

      const actualWidth =
        col === BOARD_COLS - 1 ? width - left : pieceWidth;
      const actualHeight =
        row === BOARD_ROWS - 1 ? height - top : pieceHeight;

      const pieceBuffer = await sharp(sourceBuffer)
        .extract({
          left,
          top,
          width: actualWidth,
          height: actualHeight,
        })
        .png()
        .toBuffer();

      const piecePath = `${setId}/${puzzleKey}/${pieceIndex}.png`;

      await uploadBufferToBucket(
        PIECES_BUCKET,
        piecePath,
        pieceBuffer,
        'image/png'
      );

      manifest.push({
        index: pieceIndex,
        row,
        col,
        x: left,
        y: top,
        width: actualWidth,
        height: actualHeight,
        file: piecePath,
      });
    }
  }

  return {
    width,
    height,
    boardCols: BOARD_COLS,
    boardRows: BOARD_ROWS,
    piecesCount: PIECES_COUNT,
    cutPattern: 'grid',
    pieceAspectRatio: Number((pieceWidth / pieceHeight).toFixed(4)),
    manifest,
    piecesFolder: `${setId}/`,
  };
}

async function savePuzzleRecord({
  job,
  setId,
  item,
  index,
  originalPath,
  sliced,
}) {
  const puzzleKey = `${job.user_id}_${setId}_${index + 1}`;

  const payload = {
    user_id: job.user_id,
    set_id: setId,
    puzzle_key: puzzleKey,
    title: item.title || `Puzzle ${index + 1}`,
    style_code: item.code || null,
    year: null,
    sort_order: index + 1,
    original_image_url: originalPath,
    preview_image_url: originalPath,
    pieces_folder: sliced.piecesFolder,
    pieces_count: sliced.piecesCount,
    cut_pattern: sliced.cutPattern,
    is_active: true,
    image_width: sliced.width,
    image_height: sliced.height,
    piece_aspect_ratio: sliced.pieceAspectRatio,
    board_cols: sliced.boardCols,
    board_rows: sliced.boardRows,
    piece_manifest: sliced.manifest,
  };

  const { error } = await supabaseAdmin
    .from('puzzles')
    .upsert(payload, {
      onConflict: 'puzzle_key',
    });

  if (error) {
    console.error('PUZZLE UPSERT ERROR:', error);
    throw error;
  }
}

export async function processAvatarJob(job) {
  const setId = crypto.randomUUID();

  try {
    await updateJob(job.id, {
      status: 'processing',
      progress_stage: 'downloading_avatar',
      progress_percent: 5,
      error_text: null,
    });

    await upsertSet(setId, {
      user_id: job.user_id,
      avatar_path: job.avatar_path,
      originals_folder: setId,
      pieces_folder: setId,
      status: 'processing',
      created_at: nowIso(),
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

    if (!Array.isArray(generated) || generated.length === 0) {
      throw new Error('AI did not return any generated images');
    }

    for (let i = 0; i < generated.length; i += 1) {
      const item = generated[i];
      const puzzleKey = `${job.user_id}_${setId}_${i + 1}`;
      const title = item.title || `Puzzle ${i + 1}`;
      const imageBuffer = Buffer.isBuffer(item.imageBuffer)
        ? item.imageBuffer
        : Buffer.from(item.imageBuffer);

      await updateJob(job.id, {
        progress_stage: `processing_${title}`,
        progress_percent: 20 + Math.round((i / generated.length) * 60),
      });

      const originalPath = `${setId}/${puzzleKey}.png`;

      await uploadBufferToBucket(
        ORIGINALS_BUCKET,
        originalPath,
        imageBuffer,
        'image/png'
      );

      const originalPublicUrl = getPublicUrl(ORIGINALS_BUCKET, originalPath);

      const sliced = await sliceImageToPieces({
        sourceBuffer: imageBuffer,
        setId,
        puzzleKey,
      });

      await savePuzzleRecord({
        job,
        setId,
        item,
        index: i,
        originalPath: originalPublicUrl,
        sliced,
      });
    }

    await upsertSet(setId, {
      user_id: job.user_id,
      avatar_path: job.avatar_path,
      originals_folder: setId,
      pieces_folder: setId,
      status: 'done',
    });

    await updateJob(job.id, {
      status: 'done',
      progress_stage: 'done',
      progress_percent: 100,
      result_set_id: setId,
    });

    console.log('JOB DONE:', job.id, 'SET:', setId);
  } catch (error) {
    console.error('PROCESS JOB ERROR:', error);

    try {
      await upsertSet(setId, {
        user_id: job.user_id,
        avatar_path: job.avatar_path,
        originals_folder: setId,
        pieces_folder: setId,
        status: 'failed',
      });
    } catch (setError) {
      console.error('SET FAIL UPDATE ERROR:', setError);
    }

    await updateJob(job.id, {
      status: 'failed',
      progress_stage: 'failed',
      error_text: error?.message || String(error),
    });

    throw error;
  }
}