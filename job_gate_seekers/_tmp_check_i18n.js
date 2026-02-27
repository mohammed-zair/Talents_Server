const fs = require('fs');
const path = require('path');
const srcRoot = 'job_gate_seekers/src';
const ctxPath = path.join(srcRoot, 'contexts', 'LanguageContext.tsx');
const ctx = fs.readFileSync(ctxPath, 'utf8');
const dictRegex = /const\s+(en|ar)\s*:\s*Dict\s*=\s*\{([\s\S]*?)\n\};/g;
const dicts = {};
let m;
while ((m = dictRegex.exec(ctx))) {
  const name = m[1];
  const body = m[2];
  const keyRegex = /\n\s*([a-zA-Z0-9_]+)\s*:\s*"/g;
  let km;
  const keys = new Set();
  while ((km = keyRegex.exec(body))) {
    keys.add(km[1]);
  }
  dicts[name] = keys;
}
const ar = dicts.ar || new Set();
const en = dicts.en || new Set();
const allDictKeys = new Set([...ar, ...en]);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
  }
}
walk(srcRoot);
const used = new Set();
const tRegex = /\bt\(\s*['\"]([a-zA-Z0-9_]+)['\"]\s*\)/g;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let tm;
  while ((tm = tRegex.exec(text))) {
    used.add(tm[1]);
  }
}
const missingInAr = [...used].filter(k => !ar.has(k)).sort();
const missingInEn = [...used].filter(k => !en.has(k)).sort();
const unused = [...allDictKeys].filter(k => !used.has(k)).sort();
console.log('Used keys:', used.size);
console.log('Missing in ar:', missingInAr.length);
console.log('Missing in en:', missingInEn.length);
console.log('Unused dict keys:', unused.length);
if (missingInAr.length) console.log('Missing in ar keys:', missingInAr.join(', '));
if (missingInEn.length) console.log('Missing in en keys:', missingInEn.join(', '));
