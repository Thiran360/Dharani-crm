import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  ['#6F8748', '#B3C58A'],
  ['#5A7040', '#B3C58A'],
  ['#A8B97A', '#B3C58A'],
  ['#C8D4A8', '#B3C58A'],
  ['#9AAE69', '#B3C58A'],
  ['#667744', '#B3C58A'],
  ['#556633', '#B3C58A'],
  ['#ea580c', '#B3C58A'],
  ['#8B7355', '#B3C58A'],
  ['#2563eb', '#B3C58A'],
  ['#7c3aed', '#B3C58A'],
  ['#dc2626', '#30372A'],
  ['#A85555', '#30372A'],
  ['#ef4444', '#30372A'],
  ['#1f4268', '#30372A'],
  ['#00234b', '#30372A'],
  ['#c7d2fe', 'rgba(179, 197, 138, 0.35)'],
  ['#bae6fd', 'rgba(179, 197, 138, 0.35)'],
  ['rgba(111, 135, 72', 'rgba(179, 197, 138'],
  ['rgba(168, 185, 122', 'rgba(179, 197, 138'],
  ['rgba(122, 144, 96', 'rgba(179, 197, 138'],
  ['linear-gradient(135deg, #6F8748 0%, #B3C58A 100%)', '#B3C58A'],
  ['linear-gradient(135deg, #6F8748 0%, #B3C58A 100%)', '#B3C58A'],
  ['linear-gradient(135deg, #B3C58A 0%, #6F8748 100%)', '#B3C58A'],
  ['linear-gradient(135deg, #6F8748, #B3C58A)', '#B3C58A'],
  ['linear-gradient(135deg, #B3C58A, #6F8748)', '#B3C58A'],
  ['linear-gradient(135deg, #A8B97A, #6F8748)', '#B3C58A'],
  ['linear-gradient(135deg, #A8B97A, #B3C58A)', '#B3C58A'],
  ['linear-gradient(135deg, #6F8748, #6F8748)', '#B3C58A'],
  ['linear-gradient(135deg, #A85555, #dc2626)', '#30372A'],
  ['linear-gradient(135deg, #B3C58A, #9AAE69)', '#B3C58A'],
  ['linear-gradient(135deg, #9AAE69, #9AAE69)', '#B3C58A'],
  ['linear-gradient(135deg, #B3C58A, #B3C58A)', '#B3C58A'],
];

function walk(dir, ext, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
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
  if (file.endsWith('theme.css')) continue;
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
