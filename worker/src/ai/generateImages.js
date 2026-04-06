import OpenAI from 'openai';
import { buildAvatarStylePrompts } from './prompts.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function detectMime(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return 'image/jpeg';

  const sig = buffer.subarray(0, 12).toString('hex');

  if (sig.startsWith('89504e47')) return 'image/png';
  if (sig.startsWith('ffd8ff')) return 'image/jpeg';
  if (sig.startsWith('52494646')) return 'image/webp';

  return 'image/jpeg';
}

function toDataUrl(buffer) {
  const mime = detectMime(buffer);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function safePreview(obj, maxLen = 4000) {
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > maxLen ? `${s.slice(0, maxLen)} ...[truncated]` : s;
  } catch {
    return '[unserializable]';
  }
}

function extractImageBase64(response) {
  const outputs = Array.isArray(response?.output) ? response.output : [];

  console.log(
    'OPENAI OUTPUT TYPES:',
    outputs.map((x) => ({
      type: x?.type,
      status: x?.status,
      hasResult: !!x?.result,
      revised_prompt: x?.revised_prompt || null,
    }))
  );

  const imageCalls = outputs.filter((x) => x?.type === 'image_generation_call');

  if (!imageCalls.length) {
    throw new Error(
      `OpenAI did not return image_generation_call. output=${safePreview(outputs)}`
    );
  }

  const completedWithResult = imageCalls.find(
    (x) => x?.status === 'completed' && typeof x?.result === 'string' && x.result.length > 0
  );

  if (completedWithResult) {
    return completedWithResult.result;
  }

  const firstWithResult = imageCalls.find(
    (x) => typeof x?.result === 'string' && x.result.length > 0
  );

  if (firstWithResult) {
    return firstWithResult.result;
  }

  throw new Error(
    `OpenAI image_generation_call found, but result is missing. imageCalls=${safePreview(imageCalls)}`
  );
}

function buildPrompt(stylePrompt) {
  return [
    'Transform the reference photo into a NEW premium portrait of the SAME person.',
    'Preserve identity strongly: same face shape, haircut, age, skin tone, expression, body proportions.',
    'Do not merely recolor the original.',
    'Create a fresh rendered portrait based on the reference image and style request.',
    'Keep the subject recognizable.',
    'Avoid extra fingers, duplicate body parts, distorted face, text artifacts, watermarks.',
    `Style request: ${stylePrompt}`,
  ].join(' ');
}

export async function generateImagesFromAvatar({ avatarBuffer }) {
  if (!avatarBuffer || !Buffer.isBuffer(avatarBuffer)) {
    throw new Error('generateImagesFromAvatar: avatarBuffer is invalid');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const prompts = buildAvatarStylePrompts();
  const inputImage = toDataUrl(avatarBuffer);

  console.log('OPENAI GENERATION TOTAL PROMPTS:', prompts.length);

  const outputs = [];

  for (let i = 0; i < prompts.length; i += 1) {
    const p = prompts[i];

    console.log('OPENAI REQUEST START:', {
      index: i,
      code: p.code,
      title: p.title,
    });

    const startedAt = Date.now();

    const response = await openai.responses.create({
      model: 'gpt-5',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPrompt(p.title),
            },
            {
              type: 'input_image',
              image_url: inputImage,
            },
          ],
        },
      ],
      tools: [
        {
          type: 'image_generation',
          action: 'edit',
          input_fidelity: 'high',
        },
      ],
    });

    console.log('OPENAI REQUEST DONE:', {
      index: i,
      code: p.code,
      tookMs: Date.now() - startedAt,
      responseId: response?.id || null,
    });

    const imageBase64 = extractImageBase64(response);
    const buffer = Buffer.from(imageBase64, 'base64');

    console.log('OPENAI IMAGE BUFFER READY:', {
      index: i,
      bytes: buffer.length,
    });

    outputs.push({
      index: i,
      code: p.code,
      title: p.title,
      buffer,
    });
  }

  return outputs;
}