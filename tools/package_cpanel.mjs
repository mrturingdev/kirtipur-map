#!/usr/bin/env node
// Package Our Kirtipur map diorama for cPanel hosting.
//
// Creates a clean production-ready `dist/` folder and `kirtipur-map-cpanel.zip`
// containing only the assets required for web hosting, leaving behind dev
// tools, test harnesses, and internal documentation.

import { existsSync, mkdirSync, cpSync, rmSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..');
const DIST = join(ROOT, 'dist');
const ZIP_PATH = join(ROOT, 'kirtipur-map-cpanel.zip');

console.log('📦 Packaging Our Kirtipur for cPanel...');

// Step 1: Rebuild index.html if _engine is available
const engineBuild = resolve(ROOT, '../_engine/scripts/build.mjs');
if (existsSync(engineBuild)) {
  try {
    console.log('⚙️  Validating & compiling latest index.html via engine...');
    execSync(`node "${engineBuild}" "${ROOT}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️  Could not run engine build, using existing index.html:', err.message);
  }
}

// Step 2: Ensure clean dist folder
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true, force: true });
}
mkdirSync(DIST, { recursive: true });

// Step 3: Production files to copy
const filesToCopy = [
  'index.html',
  'favicon.ico',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  '.htaccess'
];

for (const file of filesToCopy) {
  const srcPath = join(ROOT, file);
  if (existsSync(srcPath)) {
    cpSync(srcPath, join(DIST, file));
  } else {
    console.warn(`⚠️  Warning: Expected file ${file} not found in root.`);
  }
}

// Copy images
const imgSource = join(ROOT, 'img');
if (existsSync(imgSource)) {
  cpSync(imgSource, join(DIST, 'img'), { recursive: true });
}

// Step 4: Calculate stats
const indexRaw = readFileSync(join(DIST, 'index.html'));
const indexGzip = gzipSync(indexRaw);
const rawKb = (indexRaw.length / 1024).toFixed(1);
const gzipKb = (indexGzip.length / 1024).toFixed(1);
const savings = (100 - (indexGzip.length / indexRaw.length) * 100).toFixed(1);

console.log(`\n📄 index.html size: ${rawKb} KB (gzipped: ${gzipKb} KB, ~${savings}% reduction with .htaccess mod_deflate)`);

// Step 5: Create ZIP file
try {
  if (existsSync(ZIP_PATH)) rmSync(ZIP_PATH);
  // Zip contents of dist directly into root zip
  execSync(`cd "${DIST}" && zip -r "${ZIP_PATH}" .`, { stdio: 'ignore' });
  const zipStat = statSync(ZIP_PATH);
  const zipMb = (zipStat.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Created cPanel upload archive: kirtipur-map-cpanel.zip (${zipMb} MB)`);
} catch (err) {
  console.warn('⚠️  Could not create zip archive (zip command missing?):', err.message);
}

console.log(`\n✨ Successfully prepared dist/ folder!`);
console.log(`📂 Location: ${DIST}`);
console.log(`\n🚀 cPanel Deployment options:`);
console.log(`  1. cPanel Git Version Control: Push changes and deploy via .cpanel.yml`);
console.log(`  2. cPanel File Manager: Upload kirtipur-map-cpanel.zip to public_html/ and click 'Extract'`);
console.log(`  3. FTP / SFTP: Upload the contents of dist/ directly to public_html/ (or subdomain root)\n`);
