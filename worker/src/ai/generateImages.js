import sharp from 'sharp';

const STYLES = [
  'futuristic',
  'ukrainian_ethno',
  'sport',
  'business',
  'cyberpunk',
  'minimal',
  'cinematic',
  'cartoon',
  'realistic_poster',
  'heroic',
];

function getStylePipeline(style, image) {
  switch (style) {
    case 'futuristic':
      return image.modulate({ brightness: 1.05, saturation: 1.2 }).tint('#7dd3fc');
    case 'ukrainian_ethno':
      return image.modulate({ brightness: 1.05, saturation: 1.25 }).tint('#f59e0b');
    case 'sport':
      return image.modulate({ brightness: 1.08, saturation: 1.35 }).sharpen();
    case 'business':
      return image.modulate({ brightness: 1.0, saturation: 0.9 }).sharpen();
    case 'cyberpunk':
      return image.modulate({ brightness: 1.0, saturation: 1.5 }).tint('#a855f7');
    case 'minimal':
      return image.modulate({ brightness: 1.08, saturation: 0.75 });
    case 'cinematic':
      return image.modulate({ brightness: 0.95, saturation: 1.1 }).gamma(1.15);
    case 'cartoon':
      return image.modulate({ brightness: 1.1, saturation: 1.45 }).sharpen();
    case 'realistic_poster':
      return image.modulate({ brightness: 1.04, saturation: 1.15 }).sharpen();
    case 'heroic':
      return image.modulate({ brightness: 1.02, saturation: 1.2 }).tint('#f97316');
    default:
      return image;
  }
}

export async function generateImagesFromAvatar({ avatarBuffer }) {
  if (!avatarBuffer || !Buffer.isBuffer(avatarBuffer)) {
    throw new Error('generateImagesFromAvatar: avatarBuffer is invalid');
  }

  const outputs = [];

  for (let i = 0; i < STYLES.length; i++) {
    const style = STYLES[i];

    const base = sharp(avatarBuffer)
      .rotate()
      .resize(1200, 1200, { fit: 'cover' });

    const styled = getStylePipeline(style, base);
    const buffer = await styled.png().toBuffer();

    outputs.push({
      index: i,
      code: style,
      title: style,
      buffer,
    });
  }

  return outputs;
}