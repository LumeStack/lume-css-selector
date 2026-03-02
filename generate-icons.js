/**
 * generate-icons.js
 * Redimensiona Lume-css-selector.png para os 3 tamanhos de ícone da extensão.
 * Execute com: node generate-icons.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SRC      = path.join(__dirname, 'Lume-css-selector.png');
const ICONS_DIR = path.join(__dirname, 'icons');
const SIZES    = [16, 48, 128];

if (!fs.existsSync(SRC)) {
  console.error('❌  Arquivo não encontrado: Lume-css-selector.png');
  process.exit(1);
}

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

(async () => {
  for (const size of SIZES) {
    const dest = path.join(ICONS_DIR, `icon${size}.png`);
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(dest);
    console.log(`✓  icons/icon${size}.png`);
  }
  console.log('\n✅  Ícones gerados com sucesso!');
})();
