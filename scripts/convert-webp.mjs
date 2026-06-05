import sharp from 'sharp';
import { resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GALERIA = resolve(__dirname, '../src/assets/images/galeria');

const IMAGES = [
  { file: 'escales-1.jpg', sizes: [480, 960, 1440] },
  { file: 'escales-2.jpg', sizes: [480, 960, 1440] },
  { file: 'foto-trail-3.jpg', sizes: [480, 960, 1440] },
  { file: 'foto-trail-4.jpg', sizes: [480, 960, 1440] },
  { file: 'plaça-1.jpg', sizes: [480, 960, 1440] },
  { file: 'plaça-2.jpg', sizes: [480, 960, 1440] },
];

for (const { file, sizes } of IMAGES) {
  const input = resolve(GALERIA, file);
  const name = basename(file, extname(file));

  for (const width of sizes) {
    const output = resolve(GALERIA, `${name}-${width}.webp`);
    try {
      await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(output);
      console.log(`✅  ${name}-${width}.webp`);
    } catch (err) {
      console.error(`❌  ${name}-${width}.webp — ${err.message}`);
    }
  }
}

console.log('\nDone.');
