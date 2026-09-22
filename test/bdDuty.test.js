'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { bdDuty, tti, parseAssessableValue, MAX_ASSESSABLE_VALUE } = require('../src/bdDuty');

test('bdDuty positional form calculates correctly', () => {
  // Cascade check with illustrative rates (AV=1,000,000):
  // CD = 1,000,000 x 0.25 = 250,000
  // RD = 1,000,000 x 0.05 = 50,000
  // AIT = 1,000,000 x 0.05 = 50,000
  // SDbase = 1,000,000 + 250,000 + 50,000 = 1,300,000
  // SD = 1,300,000 x 0.10 = 130,000
  // VATbase = 1,300,000 + 130,000 = 1,430,000
  // VAT = 1,430,000 x 0.15 = 214,500
  // AT = 1,430,000 x 0.05 = 71,500
  // Total = 250,000 + 50,000 + 50,000 + 130,000 + 214,500 + 71,500 = 766,000
  // TotalPayable = 1,000,000 + 766,000 = 1,766,000

  const result = bdDuty(1000000, 25, 10, 15, 5, 5, 5);
  assert.strictEqual(result.assessableValue, 1000000);
  const cdLine = result.lines.find(l => l.code === 'CD');
  assert.strictEqual(cdLine.amount, 250000);
  const sdLine = result.lines.find(l => l.code === 'SD');
  assert.strictEqual(sdLine.base, 'AV + CD + RD');
  const totalDuty = result.totalDuty;
  assert.strictEqual(totalDuty > 2200000 && totalDuty < 2250000, false); // 766000, not 2.2M
  assert.strictEqual(result.totalDuty, 766000);
  assert.strictEqual(result.totalPayable, 1766000);
});

test('bdDuty object form works identically', () => {
  const r1 = bdDuty(100000, 25, 10, 15, 5, 5, 5);
  const r2 = bdDuty({ assessableValue: 100000, cd: 25, sd: 10, vat: 15, ait: 5, rd: 5, at: 5 });
  assert.strictEqual(r1.totalDuty, r2.totalDuty);
  assert.strictEqual(r1.totalPayable, r2.totalPayable);
});

test('bdDuty with zero rates returns correct values', () => {
  const result = bdDuty(100000, 0, 0, 0, 0, 0, 0);
  assert.strictEqual(result.totalDuty, 0);
  assert.strictEqual(result.totalPayable, 100000);
  assert.strictEqual(result.effectiveRate, 0);
});

test('bdDuty with only CD rate', () => {
  const result = bdDuty(100000, 25, 0, 0, 0, 0, 0);
  assert.strictEqual(result.totalDuty, 25000);
  assert.strictEqual(result.totalPayable, 125000);
  assert.strictEqual(result.effectiveRate, 25);
  assert.strictEqual(result.lines[0].amount, 25000);
});

test('bdDuty SD is charged on AV+CD+RD base', () => {
  // SD base = AV + CD + RD
  // CD = 100000 × 0.25 = 25000
  // RD = 100000 × 0.05 = 5000
  // SDbase = 100000 + 25000 + 5000 = 130000
  // SD = 130000 × 0.20 = 26000
  const result = bdDuty(100000, 25, 20, 0, 0, 5, 0);
  const sdLine = result.lines.find(l => l.code === 'SD');
  assert.strictEqual(sdLine.base, 'AV + CD + RD');
  assert.strictEqual(sdLine.baseValue, 130000);
  assert.strictEqual(sdLine.amount, 26000);
});

test('bdDuty VAT and AT are charged on SD-inclusive base', () => {
  // AV=100000, CD=25%, RD=5%, SD=20%, VAT=15%, AT=5%
  // CD=25000, RD=5000, SDbase=130000, SD=26000, VATbase=156000
  // VAT = 156000 × 0.15 = 23400
  // AT = 156000 × 0.05 = 7800
  const result = bdDuty(100000, 25, 20, 15, 0, 5, 5);
  const vatLine = result.lines.find(l => l.code === 'VAT');
  const atLine = result.lines.find(l => l.code === 'AT');
  assert.strictEqual(vatLine.base, 'AV + CD + RD + SD');
  assert.strictEqual(vatLine.baseValue, 156000);
  assert.strictEqual(vatLine.amount, 23400);
  assert.strictEqual(atLine.baseValue, 156000);
  assert.strictEqual(atLine.amount, 7800);
});

test('bdDuty throws on invalid assessable values', () => {
  assert.throws(() => bdDuty(0, 25, 0, 0, 0, 0, 0), RangeError);
  assert.throws(() => bdDuty(-100, 25, 0, 0, 0, 0, 0), RangeError);
  assert.throws(() => bdDuty(NaN, 25, 0, 0, 0, 0, 0), RangeError);
  assert.throws(() => bdDuty('abc', 25, 0, 0, 0, 0, 0), RangeError);
  assert.throws(() => bdDuty('', 25, 0, 0, 0, 0, 0), RangeError);
});

test('bdDuty rejects values exceeding maximum', () => {
  const MAX = MAX_ASSESSABLE_VALUE;
  assert.throws(() => bdDuty(MAX + 1, 0, 0, 0, 0, 0, 0), RangeError);
});

test('bdDuty handles missing/undefined rates as zero', () => {
  // No rates provided at all
  const r1 = bdDuty(100000);
  assert.strictEqual(r1.totalDuty, 0);

  // Partial rates
  const r2 = bdDuty(100000, 25);
  assert.strictEqual(r2.totalDuty, 25000);
  assert.strictEqual(r2.lines.find(l => l.code === 'CD').amount, 25000);
  assert.strictEqual(r2.lines.find(l => l.code === 'VAT').amount, 0);
});

test('bdDuty returns all 6 duty lines', () => {
  const result = bdDuty(100000, 5, 5, 5, 5, 5, 5);
  assert.strictEqual(result.lines.length, 6);
  const codes = result.lines.map(l => l.code).sort();
  assert.deepStrictEqual(codes, ['AIT', 'AT', 'CD', 'RD', 'SD', 'VAT'].sort());
});

test('bdDuty line labels are descriptive', () => {
  const result = bdDuty(100000, 25, 0, 0, 0, 0, 0);
  const cdLine = result.lines.find(l => l.code === 'CD');
  assert.strictEqual(cdLine.label, 'Customs Duty');
  assert.strictEqual(cdLine.rate, 25);
  assert.strictEqual(typeof cdLine.amount, 'number');
});

test('tti calculates correctly at AV=100', () => {
  // When AV=100, the TTI percentage equals the absolute duty amount
  // e.g. tti(25,10,15,5,5,5) = duty(100,25,10,15,5,5,5).totalDuty
  const tti_val = tti(25, 10, 15, 5, 5, 5);
  assert.strictEqual(typeof tti_val, 'number');
  assert.strictEqual(tti_val > 0, true);
  // Verify: TTI is a percentage, so at AV=100 it should equal the absolute amount
  const duty = bdDuty(100, 25, 10, 15, 5, 5, 5);
  assert.strictEqual(tti_val, duty.totalDuty);
});

test('tti with zero rates returns 0', () => {
  assert.strictEqual(tti(0, 0, 0, 0, 0, 0), 0);
  assert.strictEqual(tti(), 0);
});

test('parseAssessableValue handles various inputs', () => {
  assert.strictEqual(parseAssessableValue(100000), 100000);
  assert.strictEqual(parseAssessableValue(100000.50), 100000.50);
  assert.strictEqual(parseAssessableValue('100000'), 100000);
  assert.strictEqual(parseAssessableValue('100,000'), 100000);
  assert.strictEqual(parseAssessableValue('1,000,000'), 1000000);
  assert.strictEqual(parseAssessableValue('2,923,311.29'), 2923311.29);
  assert.strictEqual(parseAssessableValue(), 100); // default
  assert.strictEqual(parseAssessableValue(undefined, { defaultValue: 500 }), 500);
  assert.strictEqual(parseAssessableValue(null), null);
  assert.strictEqual(parseAssessableValue('abc'), null);
  assert.strictEqual(parseAssessableValue(''), null);
  assert.strictEqual(parseAssessableValue(0), null);
  assert.strictEqual(parseAssessableValue(-100), null);
  assert.strictEqual(parseAssessableValue(MAX_ASSESSABLE_VALUE + 1), null);
});

test('bdDuty computes effective rate correctly', () => {
  // Total duty on AV=100 is the percentage
  const r = bdDuty(100, 25, 0, 0, 0, 0, 0);
  assert.strictEqual(r.effectiveRate, 25);
});

test('bdDuty AV can be a formatted BDT string', () => {
  const r = bdDuty('1,000,000', 25, 0, 0, 0, 0, 0);
  assert.strictEqual(r.assessableValue, 1000000);
  assert.strictEqual(r.totalDuty, 250000);
});

test('bdDuty amounts are rounded to 2 decimal places', () => {
  // 100/3 ≈ 33.3333...
  const r = bdDuty(100, 25, 0, 0, 0, 0, 0);
  const cdLine = r.lines.find(l => l.code === 'CD');
  assert.strictEqual(cdLine.amount, 25); // exact
  assert.strictEqual(r.totalDuty, 25);   // exact

  // Test with values that produce repeating decimals
  const r2 = bdDuty(100, 7, 3, 11, 2, 1.5, 0.5);
  r2.lines.forEach(line => {
    const str = String(line.amount);
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    assert.ok(decimals <= 2, `Expected ${line.amount} to have ≤2 decimal places, got ${decimals}`);
  });
});