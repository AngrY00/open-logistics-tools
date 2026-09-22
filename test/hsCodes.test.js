'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

// Import the module under test
const hsCodes = require('../src/hsCodes');

test('normCode strips dots, dashes, spaces', () => {
  assert.strictEqual(hsCodes.normCode('0901.21.00'), '09012100');
  assert.strictEqual(hsCodes.normCode('0901-21-00'), '09012100');
  assert.strictEqual(hsCodes.normCode('0901 21 00'), '09012100');
  assert.strictEqual(hsCodes.normCode('09012100'), '09012100');
  assert.strictEqual(hsCodes.normCode(9012100), '9012100'); // numbers carry no leading zeros
  assert.strictEqual(hsCodes.normCode(''), '');
  assert.strictEqual(hsCodes.normCode(null), '');
  assert.strictEqual(hsCodes.normCode(undefined), '');
});

test('normCode truncates to 8 digits', () => {
  assert.strictEqual(hsCodes.normCode('09012100123'), '09012100');
  assert.strictEqual(hsCodes.normCode('12345678901234'), '12345678');
});

test('isValidHsCode validates correctly', () => {
  // Valid 8-digit codes
  assert.strictEqual(hsCodes.isValidHsCode('09012100'), true);
  assert.strictEqual(hsCodes.isValidHsCode('0901.21.00'), true);
  assert.strictEqual(hsCodes.isValidHsCode('84713000'), true);
  assert.strictEqual(hsCodes.isValidHsCode(87032100), true);

  // Invalid
  assert.strictEqual(hsCodes.isValidHsCode('0901210'), false);  // only 7 digits
  assert.strictEqual(hsCodes.isValidHsCode('090121000'), false); // 9 digits
  assert.strictEqual(hsCodes.isValidHsCode('8471300000'), false); // 10 digits — not truncated
  assert.strictEqual(hsCodes.isValidHsCode('0901ABCD'), false);  // letters
  assert.strictEqual(hsCodes.isValidHsCode(''), false);
  assert.strictEqual(hsCodes.isValidHsCode('ABCDEFGH'), false);
});

test('isValidHsPrefix validates prefixes', () => {
  assert.strictEqual(hsCodes.isValidHsPrefix('09'), true);
  assert.strictEqual(hsCodes.isValidHsPrefix('0901'), true);
  assert.strictEqual(hsCodes.isValidHsPrefix('847130'), true);
  assert.strictEqual(hsCodes.isValidHsPrefix('090000'), true); // 8-digit numeric
  assert.strictEqual(hsCodes.isValidHsPrefix('1'), false); // single digit
  assert.strictEqual(hsCodes.isValidHsPrefix('090121000'), false); // 9 digits
  assert.strictEqual(hsCodes.isValidHsPrefix('09AB'), false); // letters
});

test('formatHsCode formats correctly', () => {
  assert.strictEqual(hsCodes.formatHsCode('09012100'), '0901.21.00');
  assert.strictEqual(hsCodes.formatHsCode('0901.21.00'), '0901.21.00');
  assert.strictEqual(hsCodes.formatHsCode('84713000'), '8471.30.00');
  assert.strictEqual(hsCodes.formatHsCode('87032100'), '8703.21.00');
  assert.strictEqual(hsCodes.formatHsCode('0101'), '0101'); // only 4 digits → no formatting
  assert.strictEqual(hsCodes.formatHsCode('010121000'), '0101.21.00'); // truncated
});

test('getChapter extracts correctly', () => {
  assert.strictEqual(hsCodes.getChapter('09012100'), '09');
  assert.strictEqual(hsCodes.getChapter('8471300000'), '84');
  assert.strictEqual(hsCodes.getChapter('01'), '01');
  assert.strictEqual(hsCodes.getChapter('1'), null); // too short
  assert.strictEqual(hsCodes.getChapter(''), null);
});

test('getHeading extracts correctly', () => {
  assert.strictEqual(hsCodes.getHeading('09012100'), '0901');
  assert.strictEqual(hsCodes.getHeading('8471300000'), '8471');
  assert.strictEqual(hsCodes.getHeading('0901'), '0901');
  assert.strictEqual(hsCodes.getHeading('090'), null); // too short
});

test('chapterTitle returns correct WTO titles', () => {
  assert.strictEqual(hsCodes.chapterTitle('0901'), 'Coffee, tea, mate and spices');
  assert.strictEqual(hsCodes.chapterTitle('8471'), 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof');
  assert.strictEqual(hsCodes.chapterTitle('8703'), 'Vehicles other than railway or tramway rolling-stock, and parts and accessories thereof');
  assert.strictEqual(hsCodes.chapterTitle('9701'), 'Works of art, collectors\' pieces and antiques');
  assert.strictEqual(hsCodes.chapterTitle('99'), null);  // not a real chapter
  assert.strictEqual(hsCodes.chapterTitle('84'), 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof');
});

test('validateHsCode returns structured results', () => {
  const result = hsCodes.validateHsCode('0901.21.00');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.normalized, '09012100');
  assert.strictEqual(result.formatted, '0901.21.00');
  assert.strictEqual(result.chapter, '09');
  assert.strictEqual(result.heading, '0901');
  assert.strictEqual(result.errors.length, 0);

  const invalid = hsCodes.validateHsCode('0901');
  assert.strictEqual(invalid.valid, false);
  assert.strictEqual(invalid.errors.length, 1);
  assert.match(invalid.errors[0], /8 digits/);

  const letters = hsCodes.validateHsCode('0901ABCD');
  assert.strictEqual(letters.valid, false);
  assert.match(letters.errors[0], /digits/);
});

test('CHAPTERS contains all 97 WTO chapters', () => {
  assert.strictEqual(Object.keys(hsCodes.CHAPTERS).length, 97);
  assert.strictEqual(hsCodes.CHAPTERS['01'], 'Live animals');
  assert.strictEqual(hsCodes.CHAPTERS['97'], 'Works of art, collectors\' pieces and antiques');
  assert.strictEqual(hsCodes.CHAPTERS['84'].length > 0, true);
});

test('allHeadings generates correct count', () => {
  const headings = hsCodes.ALL_HEADINGS;
  assert.strictEqual(Array.isArray(headings), true);
  assert.strictEqual(headings.length, 9603); // 97 chapters x 99 headings
  assert.strictEqual(headings[0], '0101');
  assert.strictEqual(headings.includes('0901'), true);
  assert.strictEqual(headings.includes('8708'), true);
  // All entries are 4 digits
  headings.forEach(h => assert.strictEqual(/^\d{4}$/.test(h), true, `Expected ${h} to be 4 digits`));
});

test('allHeadings() function regenerates the list', () => {
  const regenerated = hsCodes.allHeadings();
  assert.strictEqual(Array.isArray(regenerated), true);
  assert.strictEqual(regenerated.length, hsCodes.ALL_HEADINGS.length);
  assert.strictEqual(regenerated[0], '0101');
});

test('PRIORITY_HEADINGS contains known common headings', () => {
  const { PRIORITY_HEADINGS } = hsCodes;
  assert.strictEqual(Array.isArray(PRIORITY_HEADINGS), true);
  assert.strictEqual(PRIORITY_HEADINGS.length > 30, true);
  assert.strictEqual(PRIORITY_HEADINGS.includes('0901'), true);
  assert.strictEqual(PRIORITY_HEADINGS.includes('8471'), true);
});

test('chapterTitle is case-insensitive in lookup', () => {
  assert.strictEqual(hsCodes.chapterTitle('09'), 'Coffee, tea, mate and spices');
});

test('formatHsCode preserves leading zeros', () => {
  assert.strictEqual(hsCodes.formatHsCode('01010000'), '0101.00.00');
  assert.strictEqual(hsCodes.formatHsCode('04060000'), '0406.00.00');
});