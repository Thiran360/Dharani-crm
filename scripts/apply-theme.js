import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  ['#22c55e', '#A6533B'],
  ['#16a34a', '#8B442F'],
  ['#15803d', '#8B442F'],
  ['#10b981', '#A6533B'],
  ['#059669', '#8B442F'],
  ['#065f46', '#3B2922'],
  ['#064e3b', '#3B2922'],
  ['#34d399', '#C4715A'],
  ['#0e9f6e', '#A6533B'],
  ['#14b8a6', '#8B7355'],
  ['#6366f1', '#A6533B'],
  ['#8b5cf6', '#A6533B'],
  ['#4f46e5', '#A6533B'],
  ['#a855f7', '#8B7355'],
  ['#3b82f6', '#A6533B'],
  ['#0ea5e9', '#C49A52'],
  ['#4338ca', '#8B442F'],
  ['#0369a1', '#8B7355'],
  ['#f0fdf4', 'rgba(166, 83, 59, 0.08)'],
  ['#dcfce7', 'rgba(107, 143, 113, 0.15)'],
  ['#bbf7d0', 'rgba(196, 154, 82, 0.25)'],
  ['#86efac', 'rgba(196, 154, 82, 0.45)'],
  ['#ecfdf5', 'rgba(166, 83, 59, 0.08)'],
  ['#d1fae5', 'rgba(107, 143, 113, 0.12)'],
  ['#a7f3d0', 'rgba(107, 143, 113, 0.25)'],
  ['#eff6ff', 'rgba(166, 83, 59, 0.06)'],
  ['#e0e7ff', 'rgba(166, 83, 59, 0.08)'],
  ['#eef2ff', 'rgba(166, 83, 59, 0.06)'],
  ['#ede9fe', 'rgba(196, 154, 82, 0.1)'],
  ['#e0f2fe', 'rgba(196, 154, 82, 0.1)'],
  ['#faf5ff', 'rgba(139, 115, 85, 0.08)'],
  ['#f8fafc', '#F7F0E4'],
  ['#f4f7f6', '#F7F0E4'],
  ['#f1f5f9', '#EDE4D4'],
  ['#fafafa', '#FFFCF7'],
  ['#1e293b', '#3B2922'],
  ['#0f172a', '#3B2922'],
  ['#334155', '#3B2922'],
  ['#64748b', '#8A7568'],
  ['#475569', '#5C4A42'],
  ['#94a3b8', '#A89585'],
  ['#e2e8f0', 'rgba(59, 41, 34, 0.12)'],
  ['#cbd5e1', 'rgba(59, 41, 34, 0.18)'],
  ['rgba(34, 197, 94', 'rgba(166, 83, 59'],
  ['rgba(22, 163, 74', 'rgba(166, 83, 59'],
  ['rgba(16, 185, 129', 'rgba(166, 83, 59'],
  ['rgba(5, 150, 105', 'rgba(166, 83, 59'],
  ['rgba(14,159,110', 'rgba(166, 83, 59'],
  ['rgba(79, 70, 229', 'rgba(166, 83, 59'],
  ['rgba(99,102,241', 'rgba(166, 83, 59'],
  ['linear-gradient(135deg, #6366f1, #8b5cf6)', 'linear-gradient(135deg, #A6533B, #8B442F)'],
  ['linear-gradient(135deg, #16a34a, #15803d)', 'linear-gradient(135deg, #A6533B, #8B442F)'],
  ['linear-gradient(135deg, #22c55e 0%, #15803d 100%)', 'linear-gradient(135deg, #A6533B 0%, #8B442F 100%)'],
  ['linear-gradient(135deg, #15803d, #16a34a)', 'linear-gradient(135deg, #8B442F, #A6533B)'],
  ['linear-gradient(135deg, #22c55e, #15803d)', 'linear-gradient(135deg, #A6533B, #8B442F)'],
  ['linear-gradient(135deg, #22c55e, #16a34a)', 'linear-gradient(135deg, #A6533B, #8B442F)'],
  ['linear-gradient(135deg, #10b981, #047857)', 'linear-gradient(135deg, #A6533B, #8B442F)'],
  ['linear-gradient(135deg, #34d399, #059669)', 'linear-gradient(135deg, #C4715A, #8B442F)'],
  ['linear-gradient(135deg, #065f46 0%, #059669 100%)', 'linear-gradient(135deg, #8B442F 0%, #A6533B 100%)'],
  ['linear-gradient(135deg, #064e3b 0%, #16a34a 100%)', 'linear-gradient(135deg, #3B2922 0%, #A6533B 100%)'],
  ['linear-gradient(to right, #ffffff, #bbf7d0)', 'linear-gradient(to right, #FFFCF7, rgba(196, 154, 82, 0.5))'],
  ['linear-gradient(135deg, #1e293b, #0f172a)', 'linear-gradient(135deg, #3B2922, #2A1C17)'],
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

const cssFiles = walk(srcDir, ['.css']);
const jsxFiles = walk(srcDir, ['.jsx']);

let total = 0;
for (const file of [...cssFiles, ...jsxFiles]) {
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
