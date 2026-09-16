import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

function toBlack(value) {
  let v = value.trim();
  if (/^#(fff|ffffff|FFF|FFFFFF)$/i.test(v) || /^white$/i.test(v)) return '#000000';
  if (/var\(--(?:color-brown|text-|color-primary|color-botanical|color-success|color-error|color-warning|color-info|color-gold|color-rose|color-navy|color-orange|color-white)/i.test(v)) {
    return '#000000';
  }
  return v;
}

function processCss(content) {
  return content.replace(/(?<![-\w])color\s*:\s*([^;}\n]+)/gi, (_, val) => `color: ${toBlack(val)}`);
}

function processJsx(content) {
  content = content.replace(/(?<![-\w])color\s*:\s*['"](#(?:fff|ffffff|FFF|FFFFFF)|white)['"]/gi, "color: '#000000'");
  content = content.replace(/(?<![-\w])color\s*:\s*#(?:fff|ffffff|FFF|FFFFFF)\b/gi, 'color:#000000');
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
