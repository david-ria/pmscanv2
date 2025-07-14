#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function ensureTrailingNewline(file) {
  const buf = fs.readFileSync(file);
  if (buf.length === 0 || buf[buf.length - 1] !== 0x0a) {
    fs.appendFileSync(file, '\n');
  }
}

const rootFiles = [
  'components.json',
  'BACKGROUND_RECORDING_STATUS.md'
];

const directories = [
  path.join('src', 'contexts'),
  path.join('src', 'i18n')
];

for (const dir of directories) {
  for (const file of getFiles(dir)) {
    ensureTrailingNewline(file);
  }
}

for (const file of rootFiles) {
  if (fs.existsSync(file)) {
    ensureTrailingNewline(file);
  }
}
