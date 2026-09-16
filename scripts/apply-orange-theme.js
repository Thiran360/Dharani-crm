import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  /* Navy → Burnt Orange */
  ['#18344A', '#C56A3D'],
  ['#122A3D', '#A8562F'],
  ['#0D2030', '#8F4828'],
  ['#2A5472', '#5C4A42'],

  /* Sand/Off-white → Cream & White */
  ['#EDE3D1', '#F7F1E7'],
  ['#FAF8F2', '#FFFFFF'],
  ['#F5F0E6', '#F7F1E7'],
  ['#E2D6C0', '#E8D8C7'],

  /* Text blues → Brown */
  ['#6B8499', '#8A7568'],
  ['#8FA3B3', '#A89885'],

  /* Gold tweak */
  ['#C5A15A', '#C49A5A'],
  ['rgba(197, 161, 90', 'rgba(196, 154, 90'],

  /* Navy rgba → orange/brown rgba */
  ['rgba(24, 52, 74', 'rgba(59, 44, 38'],
  ['rgba(24, 52, 74, 0.08)', 'rgba(197, 106, 61, 0.08)'],
  ['rgba(24, 52, 74, 0.12)', 'rgba(59, 44, 38, 0.08)'],
  ['rgba(24, 52, 74, 0.15)', 'rgba(197, 106, 61, 0.12)'],
  ['rgba(24, 52, 74, 0.18)', 'rgba(197, 106, 61, 0.18)'],
  ['rgba(24, 52, 74, 0.22)', 'rgba(197, 106, 61, 0.22)'],
  ['rgba(24, 52, 74, 0.05)', 'rgba(59, 44, 38, 0.05)'],
  ['rgba(24, 52, 74, 0.06)', 'rgba(59, 44, 38, 0.06)'],
  ['rgba(24, 52, 74, 0.08)', 'rgba(59, 44, 38, 0.08)'],

  /* Sidebar text rgba */
  ['rgba(250, 248, 242', 'rgba(247, 241, 231'],

  /* Success color back to earthy */
  ['#4A7C6F', '#6B8F71'],
  ['rgba(74, 124, 111', 'rgba(107, 143, 113'],
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
