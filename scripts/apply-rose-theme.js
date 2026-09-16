import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  /* Terracotta → Dusty Rose */
  ['#A6533B', '#A66A73'],
  ['#8B442F', '#8F5560'],
  ['#C4715A', '#B8828A'],
  ['#6E3526', '#7A4852'],
  ['#946068', '#8F5560'],
  ['rgba(166, 83, 59', 'rgba(166, 106, 115'],

  /* Cream/Ivory → New Ivory & Beige */
  ['#F7F0E4', '#FAF5EF'],
  ['#FFFCF7', '#FAF5EF'],
  ['#EDE4D4', '#E8DCD2'],
  ['#F0E8E2', '#F0E8E2'],
  ['#E2D6C4', '#DDD0C6'],

  /* Brown → Dark Brown */
  ['#3B2922', '#3D302D'],
  ['#5C4A42', '#5A4A47'],
  ['#8A7568', '#8A7B78'],
  ['#A89585', '#A89894'],
  ['rgba(59, 41, 34', 'rgba(61, 48, 45'],

  /* Gold accents → Rose light */
  ['#C49A52', '#B8828A'],
  ['rgba(196, 154, 82', 'rgba(166, 106, 115'],

  /* Remove stray greens */
  ['#047857', '#8F5560'],
  ['#6B8F71', '#7A8F7E'],
  ['rgba(107, 143, 113', 'rgba(122, 143, 126'],

  /* Gradients → flat rose (minimal) */
  ['linear-gradient(135deg, #A66A73, #8F5560)', '#A66A73'],
  ['linear-gradient(135deg, #8F5560, #A66A73)', '#A66A73'],
  ['linear-gradient(135deg, #A66A73 0%, #8F5560 100%)', '#A66A73'],
  ['linear-gradient(145deg, #3D302D 0%, #8F5560 55%, #A66A73 100%)', 'linear-gradient(160deg, #3D302D 0%, #7A4852 50%, #8F5560 100%)'],
  ['linear-gradient(135deg, rgba(166, 106, 115, 0.08) 0%, #FAF5EF 100%)', '#FAF5EF'],
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
