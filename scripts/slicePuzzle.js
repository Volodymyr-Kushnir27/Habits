import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
if (!supabaseKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

const GRID_COLS = 6;
const GRID_ROWS = 5;
const PIECES_COUNT = GRID_COLS * GRID_ROWS;

const PUZZLE_KEY = 'puzzle_2026_01';
const PUZZLE_TITLE = 'Puzzle 1';
const PUZZLE_YEAR = 2026;
const SORT_ORDER = 1;
const IMAGE_PATH = '2026/2.jpg';
const PIECES_FOLDER = `2026/${PUZZLE_KEY}`;
const CUT_PATTERN = 'classic_5x6';

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 1779033703;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function getPatternConfig(pattern) {
  switch (pattern) {
    case 'soft_round_5x6':
      return { knobScale: 0.22, neckScale: 0.11, jitter: 0.02, shadow: 8 };
    case 'deep_lock_5x6':
      return { knobScale: 0.32, neckScale: 0.10, jitter: 0.03, shadow: 10 };
    case 'micro_variation_5x6':
      return { knobScale: 0.27, neckScale: 0.11, jitter: 0.08, shadow: 9 };
    case 'wave_cut_5x6':
      return { knobScale: 0.25, neckScale: 0.10, jitter: 0.05, shadow: 9 };
    case 'mixed_irregular_5x6':
      return { knobScale: 0.29, neckScale: 0.10, jitter: 0.12, shadow: 10 };
    case 'classic_5x6':
    default:
      return { knobScale: 0.27, neckScale: 0.11, jitter: 0.00, shadow: 8 };
  }
}

function buildEdgeMap(cols, rows, pattern, seedBase) {
  const rng = mulberry32(hashString(`${pattern}_${seedBase}`));

  const vertical = Array.from({ length: rows }, () =>
    Array.from({ length: cols - 1 }, () => {
      const sign = rng() > 0.5 ? 1 : -1;
      const variance = 0.9 + rng() * 0.25;
      return { sign, variance };
    })
  );

  const horizontal = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: cols }, () => {
      const sign = rng() > 0.5 ? 1 : -1;
      const variance = 0.9 + rng() * 0.25;
      return { sign, variance };
    })
  );

  return { vertical, horizontal };
}

function lineTo(path, x, y) {
  path.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
}

function cubicTo(path, x1, y1, x2, y2, x, y) {
  path.push(
    `C ${x1.toFixed(2)} ${y1.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`
  );
}

function drawHorizontalEdge(path, x, y, length, direction, orientation, cfg, variance) {
  const absLen = Math.abs(length);
  const signLen = length >= 0 ? 1 : -1;
  const knob = absLen * cfg.knobScale * variance;
  const neck = absLen * cfg.neckScale * variance;

  if (direction === 0) {
    lineTo(path, x + length, y);
    return;
  }

  const start = x;
  const p1 = start + signLen * absLen * 0.22;
  const p2 = start + signLen * absLen * 0.38;
  const mid = start + signLen * absLen * 0.5;
  const p3 = start + signLen * absLen * 0.62;
  const p4 = start + signLen * absLen * 0.78;
  const out = y + direction * orientation * knob;

  lineTo(path, p1, y);
  cubicTo(path, p1, y, p2, out * 0.55 + y * 0.45, p2, out);
  cubicTo(path, p2, out, mid, out, mid, out);
  cubicTo(path, mid, out, p3, out, p3, out);
  cubicTo(path, p3, out * 0.55 + y * 0.45, p4, y, p4, y);
  lineTo(path, start + length, y);
}

function drawVerticalEdge(path, x, y, length, direction, orientation, cfg, variance) {
  const absLen = Math.abs(length);
  const signLen = length >= 0 ? 1 : -1;
  const knob = absLen * cfg.knobScale * variance;
  const neck = absLen * cfg.neckScale * variance;

  if (direction === 0) {
    lineTo(path, x, y + length);
    return;
  }

  const start = y;
  const p1 = start + signLen * absLen * 0.22;
  const p2 = start + signLen * absLen * 0.38;
  const mid = start + signLen * absLen * 0.5;
  const p3 = start + signLen * absLen * 0.62;
  const p4 = start + signLen * absLen * 0.78;
  const out = x + direction * orientation * knob;

  lineTo(path, x, p1);
  cubicTo(path, x, p1, out * 0.55 + x * 0.45, p2, out, p2);
  cubicTo(path, out, p2, out, mid, out, mid);
  cubicTo(path, out, mid, out, p3, out, p3);
  cubicTo(path, out * 0.55 + x * 0.45, p4, x, p4, x, start + length);
}

function buildPiecePath({
  row,
  col,
  cellWidth,
  cellHeight,
  offsetX,
  offsetY,
  edgeMap,
  cfg,
}) {
  const left = offsetX;
  const top = offsetY;
  const right = offsetX + cellWidth;
  const bottom = offsetY + cellHeight;

  const topEdge =
    row === 0 ? { sign: 0, variance: 1 } : edgeMap.horizontal[row - 1][col];
  const rightEdge =
    col === GRID_COLS - 1 ? { sign: 0, variance: 1 } : edgeMap.vertical[row][col];
  const bottomEdge =
    row === GRID_ROWS - 1 ? { sign: 0, variance: 1 } : edgeMap.horizontal[row][col];
  const leftEdge =
    col === 0 ? { sign: 0, variance: 1 } : edgeMap.vertical[row][col - 1];

  const path = [`M ${left.toFixed(2)} ${top.toFixed(2)}`];

  drawHorizontalEdge(path, left, top, cellWidth, topEdge.sign, -1, cfg, topEdge.variance);
  drawVerticalEdge(path, right, top, cellHeight, rightEdge.sign, 1, cfg, rightEdge.variance);
  drawHorizontalEdge(path, right, bottom, -cellWidth, bottomEdge.sign, 1, cfg, bottomEdge.variance);
  drawVerticalEdge(path, left, bottom, -cellHeight, leftEdge.sign, -1, cfg, leftEdge.variance);

  path.push('Z');
  return path.join(' ');
}

function createMaskSvg(width, height, pathData) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="black"/>
      <path d="${pathData}" fill="white"/>
    </svg>
  `;
}

async function downloadImage() {
  const { data, error } = await supabase.storage
    .from('puzzles-originals')
    .download(IMAGE_PATH);

  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function uploadPiece(buffer, index) {
  const path = `${PIECES_FOLDER}/${index}.png`;

  const { error } = await supabase.storage
    .from('puzzles-pieces')
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;
  console.log('uploaded:', path);
}

async function upsertPuzzleRecord(payload) {
  const { data, error } = await supabase
    .from('puzzles')
    .upsert(payload, { onConflict: 'puzzle_key' })
    .select()
    .single();

  if (error) throw error;
  console.log('puzzle saved:', data.puzzle_key);
}

async function slice() {
  const imageBuffer = await downloadImage();
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Не вдалося визначити розміри картинки');
  }

  const width = metadata.width;
  const height = metadata.height;

  const cellWidth = Math.round(width / GRID_COLS);
  const cellHeight = Math.round(height / GRID_ROWS);

  const cfg = getPatternConfig(CUT_PATTERN);
  const edgeMap = buildEdgeMap(GRID_COLS, GRID_ROWS, CUT_PATTERN, PUZZLE_KEY);

  const bleedX = Math.ceil(cellWidth * 0.34);
  const bleedY = Math.ceil(cellHeight * 0.34);

  const manifest = [];
  let index = 0;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const slotX = col * cellWidth;
      const slotY = row * cellHeight;

      const left = Math.max(slotX - bleedX, 0);
      const top = Math.max(slotY - bleedY, 0);
      const right = Math.min(slotX + cellWidth + bleedX, width);
      const bottom = Math.min(slotY + cellHeight + bleedY, height);

      const extractWidth = right - left;
      const extractHeight = bottom - top;

      const offsetX = slotX - left;
      const offsetY = slotY - top;

      const pathData = buildPiecePath({
        row,
        col,
        cellWidth,
        cellHeight,
        offsetX,
        offsetY,
        edgeMap,
        cfg,
      });

      const maskSvg = createMaskSvg(extractWidth, extractHeight, pathData);

      const piece = await image
        .clone()
        .extract({
          left,
          top,
          width: extractWidth,
          height: extractHeight,
        })
        .ensureAlpha()
        .composite([
          {
            input: Buffer.from(maskSvg),
            blend: 'dest-in',
          },
        ])
        .png()
        .toBuffer();

      await uploadPiece(piece, index);

      manifest.push({
        index,
        row,
        col,
        slotX,
        slotY,
        slotWidth: cellWidth,
        slotHeight: cellHeight,
        pieceWidth: extractWidth,
        pieceHeight: extractHeight,
        offsetX,
        offsetY,
        file: `${PIECES_FOLDER}/${index}.png`,
      });

      index++;
    }
  }

  const pieceAspectRatio = Number((cellWidth / cellHeight).toFixed(4));

  await upsertPuzzleRecord({
    puzzle_key: PUZZLE_KEY,
    title: PUZZLE_TITLE,
    year: PUZZLE_YEAR,
    sort_order: SORT_ORDER,
    original_image_url: IMAGE_PATH,
    preview_image_url: IMAGE_PATH,
    pieces_folder: PIECES_FOLDER,
    pieces_count: PIECES_COUNT,
    cut_pattern: CUT_PATTERN,
    is_active: true,
    image_width: width,
    image_height: height,
    piece_aspect_ratio: pieceAspectRatio,
    board_cols: GRID_COLS,
    board_rows: GRID_ROWS,
    piece_manifest: manifest,
  });

  console.log('DONE 🚀');
}

slice().catch((error) => {
  console.error('SCRIPT FAILED:', error);
});