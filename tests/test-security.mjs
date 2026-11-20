#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const sec = await import('../src/security.js');

await test('security.js exports required functions and constants', () => {
  for (const k of [
    'initContentProtection',
    'getSessionFingerprint',
    'handleProtectedKeydown',
    'handleProtectedClipboard',
    'handleContextMenu',
    'handleDragStart',
    'checkFrameSecurity',
    'PROTECTION_NOTICE'
  ]) {
    assert.ok(sec[k], `Missing export ${k}`);
  }
});

await test('getSessionFingerprint returns stable KM-SEC-* token', () => {
  const fp1 = sec.getSessionFingerprint();
  const fp2 = sec.getSessionFingerprint();
  assert.ok(fp1.startsWith('KM-SEC-'), `Expected KM-SEC- prefix, got ${fp1}`);
  assert.equal(fp1, fp2);
});

await test('handleContextMenu blocks right-click outside inputs and allows inputs', () => {
  let blocked = false;
  sec.handleContextMenu({ target: { tagName: 'DIV' }, preventDefault: () => { blocked = true; } });
  assert.equal(blocked, true);

  let inputBlocked = false;
  sec.handleContextMenu({ target: { tagName: 'INPUT' }, preventDefault: () => { inputBlocked = true; } });
  assert.equal(inputBlocked, false);
});

await test('handleDragStart prevents dragging', () => {
  let prevented = false;
  sec.handleDragStart({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
});

await test('handleProtectedClipboard poisons copy outside inputs and allows inputs', () => {
  let prevented = false, copied = null;
  sec.handleProtectedClipboard({
    target: { tagName: 'DIV' },
    preventDefault: () => { prevented = true; },
    clipboardData: { setData: (_t, v) => { copied = v; } }
  });
  assert.equal(prevented, true);
  assert.equal(copied, sec.PROTECTION_NOTICE);

  let inputPrevented = false;
  sec.handleProtectedClipboard({
    target: { tagName: 'INPUT' },
    preventDefault: () => { inputPrevented = true; }
  });
  assert.equal(inputPrevented, false);
});

await test('handleProtectedKeydown blocks F12, Ctrl/Cmd+U/S/P/C, and DevTools shortcuts', () => {
  const cases = [
    { key: 'F12' },
    { ctrlKey: true, key: 'u' },
    { metaKey: true, key: 'u' },
    { metaKey: true, altKey: true, key: 'u' },
    { ctrlKey: true, key: 's' },
    { metaKey: true, key: 's' },
    { ctrlKey: true, key: 'p' },
    { ctrlKey: true, shiftKey: true, key: 'I' },
    { metaKey: true, shiftKey: true, key: 'I' },
    { metaKey: true, altKey: true, key: 'i' },
    { ctrlKey: true, shiftKey: true, key: 'J' },
    { metaKey: true, altKey: true, key: 'j' },
    { ctrlKey: true, shiftKey: true, key: 'C' },
    { metaKey: true, altKey: true, key: 'c' },
    { ctrlKey: true, key: 'c', target: { tagName: 'DIV' } }
  ];
  for (const tc of cases) {
    let prevented = false, stopped = false;
    const ok = sec.handleProtectedKeydown({
      target: { tagName: 'BODY' },
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
      ...tc
    });
    assert.equal(ok, true, `Should intercept ${JSON.stringify(tc)}`);
    assert.equal(prevented, true);
    assert.equal(stopped, true);
  }
  let normalPrevented = false;
  assert.equal(sec.handleProtectedKeydown({ key: '1', target: { tagName: 'BODY' }, preventDefault: () => { normalPrevented = true; } }), false);
  assert.equal(normalPrevented, false);
});

await test('style.css enforces selection lock, print shield, and security toast', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'src', 'style.css'), 'utf8');
  assert.ok(css.includes('user-select: none !important'));
  assert.ok(css.includes('-webkit-user-select: none !important'));
  assert.ok(css.includes('user-select: text !important'));
  assert.ok(css.includes('.security-toast'));
  assert.ok(css.includes('@media print'));
});

console.log(`All ${passed} security tests passed.`);
