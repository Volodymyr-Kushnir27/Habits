import 'dotenv/config';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORIGINALS_BUCKET = 'free-puzzle-originals';
const PIECES_BUCKET = 'avatar-puzzle-pieces';
const PREVIEW_BUCKET = 'avatar_generated';

const COLS = 6;
const ROWS = 5;
const PIECES_COUNT = COLS * ROWS;
const TAB_SIZE_RATIO = 0.22;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSign() {
  return Math.random() > 0.5 ? 1 : -1;
}

function buildEdgeMatrix(rows, cols) {
  const matrix = [];

  for (let r = 0; r < rows; r += 1) {
    matrix[r] = [];
    for (let c = 0; c < cols; c += 1) {
      const top = r === 0 ? 0 : -matrix[r - 1][c].bottom;
      const left = c === 0 ? 0 : -matrix[r][c - 1].right;
      const right = c === cols - 1 ? 0 : randomSign();
      const bottom = r === rows - 1 ? 0 : randomSign();

      matrix[r][c] = { top, right, bottom, left };
    }
  }

  return matrix;
}

function buildPiecePath({ w, h, tab, top, right, bottom, left }) {
  const midX = w / 2;
  const midY = h / 2;
  const neck = tab * 0.42;
  const knob = tab * 0.78;

  let d = `M 0 0 `;

  d += `L ${midX - neck} 0 `;
  if (top !== 0) {
    const dir = -top;
    d += `C ${midX - neck * 0.8} ${dir * knob * 0.15}, ${midX - knob} ${dir * knob}, ${midX} ${dir * knob} `;
    d += `C ${midX + knob} ${dir * knob}, ${midX + neck * 0.8} ${dir * knob * 0.15}, ${midX + neck} 0 `;
  }
  d += `L ${w} 0 `;

  d += `L ${w} ${midY - neck} `;
  if (right !== 0) {
    const dir = right;
    d += `C ${w + dir * knob * 0.15} ${midY - neck * 0.8}, ${w + dir * knob} ${midY - knob}, ${w + dir * knob} ${midY} `;
    d += `C ${w + dir * knob} ${midY + knob}, ${w + dir * knob * 0.15} ${midY + neck * 0.8}, ${w} ${midY + neck} `;
  }
  d += `L ${w} ${h} `;

  d += `L ${midX + neck} ${h} `;
  if (bottom !== 0) {
    const dir = bottom;
    d += `C ${midX + neck * 0.8} ${h + dir * knob * 0.15}, ${midX + knob} ${h + dir * knob}, ${midX} ${h + dir * knob} `;
    d += `C ${midX - knob} ${h + dir * knob}, ${midX - neck * 0.8} ${h + dir * knob * 0.15}, ${midX - neck} ${h} `;
  }
  d += `L 0 ${h} `;

  d += `L 0 ${midY + neck} `;
  if (left !== 0) {
    const dir = -left;
    d += `C ${dir * knob * 0.15} ${midY + neck * 0.8}, ${dir * knob} ${midY + knob}, ${dir * knob} ${midY} `;
    d += `C ${dir * knob} ${midY - knob}, ${dir * knob * 0.15} ${midY - neck * 0.8}, 0 ${midY - neck} `;
  }
  d += `L 0 0 Z`;

  return d;
}

function buildJigsawManifest({ width, height, cols, rows }) {
  const cellW = Math.floor(width / cols);
  const cellH = Math.floor(height / rows);
  const tab = Math.round(Math.min(cellW, cellH) * TAB_SIZE_RATIO);

  const edges = buildEdgeMatrix(rows, cols);
  const manifest = [];
  let index = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const e = edges[row][col];

      const slotX = col * cellW;
      const slotY = row * cellH;
      const slotWidth = col === cols - 1 ? width - slotX : cellW;
      const slotHeight = row === rows - 1 ? height - slotY : cellH;

      const extraLeft = e.left === 1 ? tab : 0;
      const extraRight = e.right === 1 ? tab : 0;
      const extraTop = e.top === 1 ? tab : 0;
      const extraBottom = e.bottom === 1 ? tab : 0;

      const cutLeft = Math.max(0, slotX - extraLeft);
      const cutTop = Math.max(0, slotY - extraTop);
      const cutRight = Math.min(width, slotX + slotWidth + extraRight);
      const cutBottom = Math.min(height, slotY + slotHeight + extraBottom);

      const pieceWidth = cutRight - cutLeft;
      const pieceHeight = cutBottom - cutTop;

      const offsetX = slotX - cutLeft;
      const offsetY = slotY - cutTop;

      const path = buildPiecePath({
        w: slotWidth,
        h: slotHeight,
        tab,
        top: e.top,
        right: e.right,
        bottom: e.bottom,
        left: e.left,
      });

      manifest.push({
        index,
        file: '',
        path,
        slotX,
        slotY,
        slotWidth,
        slotHeight,
        offsetX,
        offsetY,
        pieceWidth,
        pieceHeight,
      });

      index += 1;
    }
  }

  return manifest;
}

function translatePath(path, dx, dy) {
  return path.replace(
    /([MLC])\s*(-?\d+(\.\d+)?)\s*(-?\d+(\.\d+)?)(?:,\s*(-?\d+(\.\d+)?)\s*(-?\d+(\.\d+)?))?(?:,\s*(-?\d+(\.\d+)?)\s*(-?\d+(\.\d+)?))?/g,
    (match, cmd, x1, _a, y1, _b, x2, _c, y2, _d, x3, _e, y3) => {
      if (cmd === 'M' || cmd === 'L') {
        return `${cmd} ${(Number(x1) + dx).toFixed(2)} ${(Number(y1) + dy).toFixed(2)}`;
      }

      if (cmd === 'C') {
        return `${cmd} ${(Number(x1) + dx).toFixed(2)} ${(Number(y1) + dy).toFixed(2)}, ${(Number(x2) + dx).toFixed(2)} ${(Number(y2) + dy).toFixed(2)}, ${(Number(x3) + dx).toFixed(2)} ${(Number(y3) + dy).toFixed(2)}`;
      }

      return match;
    }
  );
}

function buildMaskSvg(piece) {
  const width = piece.pieceWidth;
  const height = piece.pieceHeight;
  const translatedPath = translatePath(piece.path, piece.offsetX, piece.offsetY);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="black"/>
      <path d="${translatedPath}" fill="white"/>
    </svg>
  `;
}

async function downloadOriginal(path) {
  const { data, error } = await supabase.storage
    .from(ORIGINALS_BUCKET)
    .download(path);

  if (error) throw error;

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadBuffer(bucket, path, buffer, contentType = 'image/png') {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw error;
}

async function insertVariantRow(payload) {
  const { data, error } = await supabase
    .from('avatar_variants')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function existsVariantBySourceImagePath(originalPath) {
  const { data, error } = await supabase
    .from('avatar_variants')
    .select('id, display_title, source_image_path')
    .eq('variant_type', 'free_catalog')
    .eq('source_image_path', originalPath)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function addFreeCatalogPuzzle({
  originalPath,
  title,
  prompt = '',
  sortOrder = 1,
  skipIfExists = true,
}) {
  console.log('START:', { originalPath, title, sortOrder });

  if (skipIfExists) {
    const existing = await existsVariantBySourceImagePath(originalPath);
    if (existing) {
      console.log('SKIP EXISTS:', originalPath, '->', existing.id);
      return existing;
    }
  }

  const originalBuffer = await downloadOriginal(originalPath);

  const image = sharp(originalBuffer).rotate();
  const meta = await image.metadata();

  if (!meta.width || !meta.height) {
    throw new Error(`Не вдалося визначити розмір картинки: ${originalPath}`);
  }

  const width = meta.width;
  const height = meta.height;

  const slug = slugify(title);
  const previewPath = `catalog/free/${slug}/full.png`;
  const piecesFolder = `catalog/free/${slug}`;
  const manifest = buildJigsawManifest({
    width,
    height,
    cols: COLS,
    rows: ROWS,
  });

  const fullPng = await image.png().toBuffer();
  await uploadBuffer(PREVIEW_BUCKET, previewPath, fullPng, 'image/png');
  console.log('PREVIEW UPLOADED:', previewPath);

  for (const piece of manifest) {
    const extractLeft = piece.slotX - piece.offsetX;
    const extractTop = piece.slotY - piece.offsetY;

    const cropped = await sharp(originalBuffer)
      .extract({
        left: extractLeft,
        top: extractTop,
        width: piece.pieceWidth,
        height: piece.pieceHeight,
      })
      .png()
      .toBuffer();

    const maskSvg = buildMaskSvg(piece);

    const pieceBuffer = await sharp(cropped)
      .composite([
        {
          input: Buffer.from(maskSvg),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    const piecePath = `${piecesFolder}/${piece.index}.png`;
    await uploadBuffer(PIECES_BUCKET, piecePath, pieceBuffer, 'image/png');

    piece.file = piecePath;
    console.log('PIECE UPLOADED:', piecePath);
  }

  const row = await insertVariantRow({
    user_id: null,
    job_id: null,
    idx: 0,
    prompt: prompt || title,
    display_title: title,
    generated_path: previewPath,
    pieces_bucket: PIECES_BUCKET,
    pieces_folder: piecesFolder,
    board_cols: COLS,
    board_rows: ROWS,
    image_width: width,
    image_height: height,
    piece_aspect_ratio: width / height,
    cut_pattern: 'jigsaw-basic',
    piece_manifest: manifest,
    pieces_count: PIECES_COUNT,
    variant_type: 'free_catalog',
    is_public: true,
    is_premium: false,
    sort_order: sortOrder,
    preview_bucket: PREVIEW_BUCKET,
    preview_path: previewPath,
    source_type: 'free_catalog',
    source_prompt: prompt || title,
    source_image_path: originalPath,
    download_bucket: PREVIEW_BUCKET,
    download_path: previewPath,
  });

  console.log('DONE. VARIANT CREATED:', row.id);
  return row;
}

function buildDefaultItems(from, to) {
  const items = [];

  for (let i = from; i <= to; i += 1) {
    items.push({
      originalPath: `${i}.png`,
      title: `Puzzle ${i}`,
      prompt: `free catalog puzzle ${i}`,
      sortOrder: i,
    });
  }

  return items;
}

async function runBatch(from, to) {
  const items = buildDefaultItems(from, to);

  console.log(`BATCH START: ${from}.png -> ${to}.png`);
  console.log(`TOTAL: ${items.length}`);

  const results = [];

  for (const item of items) {
    try {
      const row = await addFreeCatalogPuzzle(item);
      results.push({
        ok: true,
        originalPath: item.originalPath,
        id: row?.id || null,
        title: item.title,
      });
    } catch (error) {
      console.error(`FAILED: ${item.originalPath}`, error.message);
      results.push({
        ok: false,
        originalPath: item.originalPath,
        error: error.message,
      });
    }
  }

  console.log('\n===== BATCH RESULT =====');
  for (const result of results) {
    if (result.ok) {
      console.log(`OK  - ${result.originalPath} -> ${result.title} (${result.id})`);
    } else {
      console.log(`ERR - ${result.originalPath} -> ${result.error}`);
    }
  }

  const successCount = results.filter((x) => x.ok).length;
  const failedCount = results.filter((x) => !x.ok).length;

  console.log(`\nSUCCESS: ${successCount}`);
  console.log(`FAILED : ${failedCount}`);
}

const from = Number(process.argv[2] || 1);
const to = Number(process.argv[3] || 20);

if (Number.isNaN(from) || Number.isNaN(to) || from < 1 || to < from) {
  console.log(`
Використання:
node scripts/addManyFreeCatalogPuzzles.js 1 20
`);
  process.exit(1);
}

runBatch(from, to)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('BATCH ERROR:', error);
    process.exit(1);
  });