import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  /* Orange → Botanical */
  ['#C56A3D', '#9AAE69'],
  ['#A8562F', '#667744'],
  ['#8F4828', '#556633'],
  ['#D4825A', '#B0C285'],
  ['rgba(197, 106, 61', 'rgba(154, 174, 105'],

  /* Cream/Ivory → Warm Ivory & Soft Cream */
  ['#F7F1E7', '#F7F4EA'],
  ['#FFFFFF', '#EEE9D9'],
  ['#FAF6F0', '#EEE9D9'],
  ['#E8D8C7', '#EEE9D9'],
  ['#DDD0BC', '#E2DBC8'],

  /* Brown → Dark Brown */
  ['#3B2C26', '#34362B'],
  ['#5C4A42', '#4A4D3E'],
  ['#8A7568', '#6B6E5F'],
  ['#A89885', '#8A8D7E'],
  ['rgba(59, 44, 38', 'rgba(52, 54, 43'],

  /* Gold */
  ['#C49A5A', '#B59A58'],
  ['rgba(196, 154, 90', 'rgba(181, 154, 88'],

  /* Sidebar text */
  ['rgba(247, 241, 231', 'rgba(247, 244, 234'],

  /* Success */
  ['#6B8F71', '#7A9060'],
  ['rgba(107, 143, 113', 'rgba(122, 144, 96'],
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
