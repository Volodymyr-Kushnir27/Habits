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
const YEAR = 2026;

const CUT_PATTERNS = ['classic', 'rounded', 'deep', 'wavy', 'irregular'];

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

function pickPattern(index) {
  const rng = mulberry32(hashString(`pattern_${YEAR}_${index}`));
  return CUT_PATTERNS[Math.floor(rng() * CUT_PATTERNS.length)];
}

function getPatternConfig(pattern) {
  switch (pattern) {
    case 'rounded':
      return {
        knobScale: 0.25,
        neckScale: 0.14,
        shoulderScale: 0.23,
        jitter: 0.015,
      };
    case 'deep':
      return {
        knobScale: 0.39,
        neckScale: 0.12,
        shoulderScale: 0.20,
        jitter: 0.02,
      };
    case 'wavy':
      return {
        knobScale: 0.31,
        neckScale: 0.13,
        shoulderScale: 0.21,
        jitter: 0.05,
      };
    case 'irregular':
      return {
        knobScale: 0.34,
        neckScale: 0.12,
        shoulderScale: 0.18,
        jitter: 0.09,
      };
    case 'classic':
    default:
      return {
        knobScale: 0.31,
        neckScale: 0.13,
        shoulderScale: 0.22,
        jitter: 0.02,
      };
  }
}

function buildEdgeMap(cols, rows, pattern, seedBase) {
  const rng = mulberry32(hashString(`${pattern}_${seedBase}`));

  const vertical = Array.from({ length: rows }, () =>
    Array.from({ length: cols - 1 }, () => {
      const sign = rng() > 0.5 ? 1 : -1;
      const variance = 0.88 + rng() * 0.28;
      return { sign, variance };
    })
  );

  const horizontal = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: cols }, () => {
      const sign = rng() > 0.5 ? 1 : -1;
      const variance = 0.88 + rng() * 0.28;
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

function getEdgeMetrics(length, variance, cfg, rng) {
  const jitter = 1 + (rng() * 2 - 1) * cfg.jitter;
  const knob = length * cfg.knobScale * variance * jitter;
  const neck = length * cfg.neckScale * variance * jitter;
  const shoulder = length * cfg.shoulderScale * variance * jitter;

  return { knob, neck, shoulder };
}

function drawTopEdge(path, x, y, width, type, metrics) {
  if (type === 0) {
    lineTo(path, x + width, y);
    return;
  }

  const { knob, neck, shoulder } = metrics;
  const center = x + width / 2;
  const leftShoulder = center - shoulder;
  const rightShoulder = center + shoulder;
  const leftNeck = center - neck;
  const rightNeck = center + neck;
  const outY = y - type * knob;

  lineTo(path, leftShoulder, y);
  cubicTo(path, leftShoulder + width * 0.05, y, leftNeck, outY, center, outY);
  cubicTo(path, rightNeck, outY, rightShoulder - width * 0.05, y, rightShoulder, y);
  lineTo(path, x + width, y);
}

function drawRightEdge(path, x, y, height, type, metrics) {
  if (type === 0) {
    lineTo(path, x, y + height);
    return;
  }

  const { knob, neck, shoulder } = metrics;
  const center = y + height / 2;
  const topShoulder = center - shoulder;
  const bottomShoulder = center + shoulder;
  const topNeck = center - neck;
  const bottomNeck = center + neck;
  const outX = x + type * knob;

  lineTo(path, x, topShoulder);
  cubicTo(path, x, topShoulder + height * 0.05, outX, topNeck, outX, center);
  cubicTo(path, outX, bottomNeck, x, bottomShoulder - height * 0.05, x, bottomShoulder);
  lineTo(path, x, y + height);
}

function drawBottomEdge(path, x, y, width, type, metrics) {
  if (type === 0) {
    lineTo(path, x - width, y);
    return;
  }

  const { knob, neck, shoulder } = metrics;
  const center = x - width / 2;
  const rightShoulder = center + shoulder;
  const leftShoulder = center - shoulder;
  const rightNeck = center + neck;
  const leftNeck = center - neck;
  const outY = y + type * knob;

  lineTo(path, rightShoulder, y);
  cubicTo(path, rightShoulder - width * 0.05, y, rightNeck, outY, center, outY);
  cubicTo(path, leftNeck, outY, leftShoulder + width * 0.05, y, leftShoulder, y);
  lineTo(path, x - width, y);
}

function drawLeftEdge(path, x, y, height, type, metrics) {
  if (type === 0) {
    lineTo(path, x, y - height);
    return;
  }

  const { knob, neck, shoulder } = metrics;
  const center = y - height / 2;
  const bottomShoulder = center + shoulder;
  const topShoulder = center - shoulder;
  const bottomNeck = center + neck;
  const topNeck = center - neck;
  const outX = x - type * knob;

  lineTo(path, x, bottomShoulder);
  cubicTo(path, x, bottomShoulder - height * 0.05, outX, bottomNeck, outX, center);
  cubicTo(path, outX, topNeck, x, topShoulder + height * 0.05, x, topShoulder);
  lineTo(path, x, y - height);
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
  rng,
}) {
  const left = offsetX;
  const top = offsetY;
  const right = offsetX + cellWidth;
  const bottom = offsetY + cellHeight;

  const topEdge = row === 0
    ? { sign: 0, variance: 1 }
    : { sign: -edgeMap.horizontal[row - 1][col].sign, variance: edgeMap.horizontal[row - 1][col].variance };

  const rightEdge = col === GRID_COLS - 1
    ? { sign: 0, variance: 1 }
    : edgeMap.vertical[row][col];

  const bottomEdge = row === GRID_ROWS - 1
    ? { sign: 0, variance: 1 }
    : edgeMap.horizontal[row][col];

  const leftEdge = col === 0
    ? { sign: 0, variance: 1 }
    : { sign: -edgeMap.vertical[row][col - 1].sign, variance: edgeMap.vertical[row][col - 1].variance };

  const path = [`M ${left.toFixed(2)} ${top.toFixed(2)}`];

  drawTopEdge(
    path,
    left,
    top,
    cellWidth,
    topEdge.sign,
    getEdgeMetrics(cellWidth, topEdge.variance, cfg, rng)
  );

  drawRightEdge(
    path,
    right,
    top,
    cellHeight,
    rightEdge.sign,
    getEdgeMetrics(cellHeight, rightEdge.variance, cfg, rng)
  );

  drawBottomEdge(
    path,
    right,
    bottom,
    cellWidth,
    bottomEdge.sign,
    getEdgeMetrics(cellWidth, bottomEdge.variance, cfg, rng)
  );

  drawLeftEdge(
    path,
    left,
    bottom,
    cellHeight,
    leftEdge.sign,
    getEdgeMetrics(cellHeight, leftEdge.variance, cfg, rng)
  );

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

async function downloadImage(imagePath) {
  const { data, error } = await supabase.storage
    .from('puzzles-originals')
    .download(imagePath);

  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function uploadPiece(folder, buffer, index) {
  const path = `${folder}/${index}.png`;

  const { error } = await supabase.storage
    .from('puzzles-pieces')
    .upload(path, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;
}

async function buildOnePuzzle(index) {
  const fileName = `${index}.jpg`;
  const imagePath = `${YEAR}/${fileName}`;
  const puzzleKey = `puzzle_${YEAR}_${String(index).padStart(2, '0')}`;
  const puzzleTitle = `Puzzle ${index}`;
  const piecesFolder = `${YEAR}/${puzzleKey}`;
  const cutPattern = pickPattern(index);

  console.log(`Building ${puzzleKey} from ${imagePath} with ${cutPattern}`);

  const imageBuffer = await downloadImage(imagePath);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Не вдалося визначити розміри картинки ${imagePath}`);
  }

  const width = metadata.width;
  const height = metadata.height;

  const cellWidth = Math.round(width / GRID_COLS);
  const cellHeight = Math.round(height / GRID_ROWS);

  const cfg = getPatternConfig(cutPattern);
  const edgeMap = buildEdgeMap(GRID_COLS, GRID_ROWS, cutPattern, puzzleKey);
  const rng = mulberry32(hashString(`piece_rng_${puzzleKey}`));

  const bleedX = Math.ceil(cellWidth * 0.45);
  const bleedY = Math.ceil(cellHeight * 0.45);

  const manifest = [];
  let pieceIndex = 0;

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
        rng,
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

      await uploadPiece(piecesFolder, piece, pieceIndex);

      manifest.push({
        index: pieceIndex,
        row,
        col,
        slotX: Number(slotX.toFixed(4)),
        slotY: Number(slotY.toFixed(4)),
        slotWidth: Number(cellWidth.toFixed(4)),
        slotHeight: Number(cellHeight.toFixed(4)),
        pieceWidth: Number(extractWidth.toFixed(4)),
        pieceHeight: Number(extractHeight.toFixed(4)),
        offsetX: Number(offsetX.toFixed(4)),
        offsetY: Number(offsetY.toFixed(4)),
        file: `${piecesFolder}/${pieceIndex}.png`,
        path: pathData,
      });

      pieceIndex++;
    }
  }

  const pieceAspectRatio = Number((cellWidth / cellHeight).toFixed(4));

  const { error } = await supabase.from('puzzles').upsert(
    {
      puzzle_key: puzzleKey,
      title: puzzleTitle,
      year: YEAR,
      sort_order: index,
      original_image_url: imagePath,
      preview_image_url: imagePath,
      pieces_folder: piecesFolder,
      pieces_count: PIECES_COUNT,
      cut_pattern: cutPattern,
      is_active: true,
      image_width: width,
      image_height: height,
      piece_aspect_ratio: pieceAspectRatio,
      board_cols: GRID_COLS,
      board_rows: GRID_ROWS,
      piece_manifest: manifest,
    },
    {
      onConflict: 'puzzle_key',
    }
  );

  if (error) throw error;

  console.log(`Saved ${puzzleKey}`);
}

async function main() {
  for (let i = 1; i <= 24; i++) {
    await buildOnePuzzle(i);
  }

  console.log('ALL DONE 🚀');
}

main().catch((error) => {
  console.error('BUILD ALL FAILED:', error);
});