import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  ['#9AAE69', '#B3C58A'],
  ['#667744', '#6F8748'],
  ['#556633', '#5A7040'],
  ['#B0C285', '#A8B97A'],
  ['#F7F4EA', '#F5F7EC'],
  ['#EEE9D9', '#FAF9F1'],
  ['#E2DBC8', '#EDEAE0'],
  ['#34362B', '#30372A'],
  ['#4A4D3E', '#4A5240'],
  ['#6B6E5F', '#6B7360'],
  ['#8A8D7E', '#8A927E'],
  ['#B59A58', '#A8B97A'],
  ['#2bba7c', '#6F8748'],
  ['#239f69', '#5A7040'],
  ['rgba(154, 174, 105', 'rgba(179, 197, 138'],
  ['rgba(52, 54, 43', 'rgba(48, 55, 42'],
  ['rgba(102, 119, 68', 'rgba(111, 135, 72'],
  ['rgba(122, 144, 96', 'rgba(111, 135, 72'],
  ['rgba(247, 244, 234', 'rgba(250, 249, 241'],
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
  if (file.includes('theme.css') || file.includes('TransactionManager.css')) continue;
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
