import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  /* Rose → Navy */
  ['#A66A73', '#18344A'],
  ['#8F5560', '#122A3D'],
  ['#7A4852', '#122A3D'],
  ['rgba(166, 106, 115', 'rgba(24, 52, 74'],

  /* Backgrounds → Sand & Off-White */
  ['#FAF5EF', '#EDE3D1'],
  ['#F0E8E2', '#FAF8F2'],
  ['#E8DCD2', '#EDE3D1'],
  ['#FDFBF8', '#FAF8F2'],
  ['#DDD0C6', '#E2D6C0'],

  /* Text → Navy tones */
  ['#3D302D', '#18344A'],
  ['#5A4A47', '#2A5472'],
  ['#8A7B78', '#6B8499'],
  ['#A89894', '#8FA3B3'],
  ['rgba(61, 48, 45', 'rgba(24, 52, 74'],

  /* Accent rose-light → Gold */
  ['#B8828A', '#C5A15A'],

  /* Success/error tune */
  ['#7A8F7E', '#4A7C6F'],
  ['#B56A6A', '#A85555'],
  ['rgba(122, 143, 126', 'rgba(74, 124, 111'],
  ['rgba(181, 106, 106', 'rgba(168, 85, 85'],

  /* Gradients → navy */
  ['linear-gradient(165deg, #18344A 0%, #122A3D 45%, #18344A 100%)', '#18344A'],
  ['linear-gradient(160deg, #18344A 0%, #122A3D 50%, #122A3D 100%)', '#18344A'],
];

function walk(dir, ext, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'styles') {
      walk(full, ext, files);
    } else if (entry.isFile() && ext.some(e => entry.name.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(srcDir, ['.css', '.jsx']);
let total = 0;

for (const file of files) {
  if (file.includes('theme.css')) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    total++;
    console.log('Updated:', path.relative(srcDir, file));
  }
}

console.log(`\nDone. Updated ${total} files.`);
