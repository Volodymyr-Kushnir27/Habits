import sharp from 'sharp';

export async function generateFallbackVariants(avatarBuffer, prompts) {
  const base = sharp(avatarBuffer).ensureAlpha();

  const variants = [];

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    const idx = i + 1;

    let img = base.clone();

    // прості стилізації (НЕ AI), але дають 10 різних картинок,
    // щоб перевірити upload + slicing + puzzles table.
    switch (p.code) {
      case 'futuristic':
        img = img.modulate({ saturation: 1.4, brightness: 1.05, hue: 120 }).sharpen();
        break;
      case 'ukrainian_ethno':
        img = img.modulate({ saturation: 1.2, brightness: 1.05 }).tint({ r: 255, g: 215, b: 128 });
        break;
      case 'sport':
        img = img.modulate({ saturation: 1.3, brightness: 1.05 }).sharpen(2);
        break;
      case 'business':
        img = img.grayscale().modulate({ brightness: 1.05 });
        break;
      case 'cyberpunk':
        img = img.modulate({ saturation: 1.6, hue: 310 }).sharpen();
        break;
      case 'minimal_portrait':
        img = img.modulate({ saturation: 0.9, brightness: 1.12 });
        break;
      case 'cinematic':
        img = img.modulate({ saturation: 1.1, brightness: 0.98 }).gamma(1.15);
        break;
      case 'cartoon':
        img = img.sharpen(3).modulate({ saturation: 1.5 }).gamma(1.2);
        break;
      case 'realistic_poster':
        img = img.modulate({ saturation: 1.2, brightness: 1.02 }).sharpen(1.5);
        break;
      case 'heroic':
        img = img.modulate({ saturation: 1.25, brightness: 1.03 }).tint({ r: 255, g: 200, b: 160 });
        break;
      default:
        break;
    }

    const buffer = await img.png().toBuffer();

    variants.push({
      index: idx,
      code: p.code,
      title: p.title,
      imageBuffer: buffer,
    });
  }

  return variants;
}
