import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') walk(full, files);
    else if (entry.isFile() && (entry.name.endsWith('.css') || entry.name.endsWith('.jsx'))) files.push(full);
  }
  return files;
}

function fixFile(content) {
  // Restore UI border accents accidentally changed by loose `color:` matching
  content = content.replace(/border-color:\s*#000000/gi, 'border-color: #B3C58A');
  content = content.replace(/border-top-color:\s*#000000/gi, 'border-top-color: #B3C58A');

  // Text color only — avoid border-color, background-color, etc.
  content = content.replace(/(?<![-\w])color\s*:\s*white\b/gi, 'color: #000000');
  content = content.replace(/(?<![-\w])color\s*:\s*#fff\b/gi, 'color: #000000');
  content = content.replace(/(?<![-\w])color\s*:\s*#ffffff\b/gi, 'color: #000000');

  // Inline / template literal text colors
  content = content.replace(/(?<![-\w])color:white\b/gi, 'color:#000000');
  content = content.replace(/(?<![-\w])color:#fff\b/gi, 'color:#000000');

  return content;
}

let total = 0;
for (const file of walk(srcDir)) {
  const original = fs.readFileSync(file, 'utf8');
  const updated = fixFile(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    total++;
    console.log('Fixed:', path.relative(srcDir, file));
  }
}

console.log(`\nDone. Fixed ${total} files.`);
