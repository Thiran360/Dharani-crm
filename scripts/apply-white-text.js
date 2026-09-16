import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const TEXT_TO_WHITE = ['#000000', '#000', '#30372A', '#4A5240', '#6B7360', '#8A927E'];

function processCss(content) {
  return content.replace(/(?<![-\w])color\s*:\s*([^;}\n]+)/gi, (_, val) => {
    let v = val.trim();
    for (const hex of TEXT_TO_WHITE) {
      const re = new RegExp(hex.replace('#', '#'), 'gi');
      v = v.replace(re, '#FFFFFF');
    }
    if (/var\(--(?:color-brown|text-|color-primary|color-botanical|color-success|color-error|color-warning|color-info|color-gold|color-rose|color-navy|color-orange)/i.test(v)) {
      v = '#FFFFFF';
    }
    return `color: ${v}`;
  });
}

function processJsx(content) {
  content = content.replace(/(?<![-\w])color\s*:\s*['"](#[0-9a-fA-F]{3,8}|#000)['"]/gi, "color: '#FFFFFF'");
  content = content.replace(/(?<![-\w])color\s*:\s*#([0-9a-fA-F]{3,8})/gi, (match) => {
    if (/color:\s*#(fff|ffffff|FFF|FFFFFF)\b/i.test(match)) return match;
    return 'color:#FFFFFF';
  });
  return content;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') walk(full, files);
    else if (entry.isFile() && (entry.name.endsWith('.css') || entry.name.endsWith('.jsx'))) files.push(full);
  }
  return files;
}

let total = 0;
for (const file of walk(srcDir)) {
  const original = fs.readFileSync(file, 'utf8');
  const updated = file.endsWith('.css') ? processCss(original) : processJsx(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    total++;
    console.log('Updated:', path.relative(srcDir, file));
  }
}

console.log(`\nDone. Updated ${total} files.`);
