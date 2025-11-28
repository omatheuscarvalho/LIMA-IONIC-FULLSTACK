#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Recursively find files named 'opencv.js' starting at workspace root
function findOpencvFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) {
      // skip node_modules and .git to keep runtime fast
      if (it.name === 'node_modules' || it.name === '.git') continue;
      results.push(...findOpencvFiles(p));
    } else if (it.isFile() && it.name.toLowerCase() === 'opencv.js') {
      results.push(p);
    }
  }
  return results;
}

function applyFixOnFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let changed = raw;

  // replace occurrences like: !err instanceof RangeError   OR  !err instanceof TypeError
  // handle whitespace and any identifier (err, e, ex)
  const re = /!\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*instanceof\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  changed = changed.replace(re, '!( $1 instanceof $2 )');

  // remove any accidental double spaces produced (cosmetic)
  changed = changed.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s{2,}/g, ' ');

  if (changed !== raw) {
    // make a backup copy just in case
    try {
      fs.copyFileSync(filePath, filePath + '.bak');
    } catch (err) {
      // ignore backup errors
    }
    fs.writeFileSync(filePath, changed, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const root = process.cwd();
  console.log('Scanning for opencv.js files under', root);
  const files = findOpencvFiles(root);
  if (!files.length) {
    console.log('No opencv.js files found.');
    return;
  }

  let updatedCount = 0;
  for (const f of files) {
    try {
      const changed = applyFixOnFile(f);
      if (changed) {
        console.log('Patched:', f);
        updatedCount++;
      } else {
        console.log('No change needed:', f);
      }
    } catch (err) {
      console.error('Error patching', f, err.message || err);
    }
  }

  console.log(`Done. Files updated: ${updatedCount}/${files.length}`);
}

main();
