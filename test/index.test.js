'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

// Verify the package entry point re-exports both modules correctly
const pkg = require('../src/index.js');

test('index re-exports hsCodes functions at root', () => {
  assert.strictEqual(typeof pkg.normCode, 'function');
  assert.strictEqual(typeof pkg.isValidHsCode, 'function');
  assert.strictEqual(typeof pkg.formatHsCode, 'function');
  assert.strictEqual(typeof pkg.validateHsCode, 'function');
  assert.strictEqual(typeof pkg.chapterTitle, 'function');
  assert.strictEqual(pkg.isValidHsCode('09012100'), true);
  assert.strictEqual(pkg.formatHsCode('09012100'), '0901.21.00');
});

test('index re-exports bdDuty functions at root', () => {
  assert.strictEqual(typeof pkg.bdDuty, 'function');
  assert.strictEqual(typeof pkg.tti, 'function');
  assert.strictEqual(typeof pkg.parseAssessableValue, 'function');
  const r = pkg.bdDuty(1000000, 25, 10, 15, 5, 5, 5);
  assert.strictEqual(r.totalDuty, 766000);
  assert.strictEqual(pkg.tti(25, 10, 15, 5, 5, 5), 76.6);
  assert.strictEqual(pkg.parseAssessableValue('1,000,000'), 1000000);
});

test('index exposes named sub-modules without shadowing the functions', () => {
  assert.strictEqual(typeof pkg.hsCodes.chapterTitle, 'function');
  assert.strictEqual(typeof pkg.hsCodes.isValidHsCode, 'function');
  assert.strictEqual(typeof pkg.bdDutyModule.bdDuty, 'function');
  assert.strictEqual(typeof pkg.bdDutyModule.tti, 'function');
  // The root-level bdDuty must remain the callable function, not the module
  assert.strictEqual(pkg.bdDuty(100000, 25, 0, 0, 0, 0, 0).totalDuty, 25000);
});

test('index exposes reference data', () => {
  assert.strictEqual(Object.keys(pkg.CHAPTERS).length, 97);
  assert.strictEqual(pkg.ALL_HEADINGS.length, 9603);
  assert.strictEqual(pkg.PRIORITY_HEADINGS.includes('0901'), true);
});