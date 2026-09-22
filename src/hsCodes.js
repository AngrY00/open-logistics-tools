'use strict';

/**
 * HS Codes — validation, formatting, and reference utilities.
 *
 * Implements the WTO Harmonized Commodity Description and Coding System.
 * Chapter titles are the official WTO HS Nomenclature public reference data.
 */

const CHAPTERS = require('../data/hs-chapters');
const { ALL_HEADINGS, PRIORITY_HEADINGS, allHeadings } = require('../data/hs-headings');

/**
 * Normalize an HS code: strip dots, dashes, spaces, and truncate to 8 digits.
 * @param {string|number} code
 * @returns {string}
 */
function normCode(code) {
  return String(code || '').replace(/[.\-\s]/g, '').substring(0, 8);
}

/**
 * Returns true only for an 8-digit numeric HS code.
 * Does NOT validate that the code actually exists in any tariff schedule.
 * Codes longer than 8 digits are rejected (not silently truncated).
 * @param {string|number} code
 * @returns {boolean}
 */
function isValidHsCode(code) {
  const raw = String(code || '').replace(/[.\-\s]/g, '');
  return /^\d{8}$/.test(raw);
}

/**
 * Returns true for a valid chapter (2-digit), heading (4-digit), or subheading (6 or 8-digit) prefix.
 * Rejects non-numeric input, lengths outside 2–8 digits, and codes longer
 * than 8 digits (which normCode would otherwise truncate and mask as valid).
 * @param {string|number} code
 * @returns {boolean}
 */
function isValidHsPrefix(code) {
  const raw = String(code || '').replace(/[.\-\s]/g, '');
  if (!/^\d*$/.test(raw)) return false;
  return raw.length >= 2 && raw.length <= 8;
}

/**
 * Format an 8-digit HS code as "XXXX.XX.XX" for readability.
 * Returns the raw normalized code if it is not exactly 8 digits.
 * @param {string|number} code
 * @returns {string}
 */
function formatHsCode(code) {
  const c = normCode(code);
  if (c.length !== 8) return c;
  return `${c.slice(0, 4)}.${c.slice(4, 6)}.${c.slice(6, 8)}`;
}

/**
 * Extract the 2-digit HS chapter from an HS code.
 * Returns null for invalid input.
 * @param {string|number} code
 * @returns {string|null}
 */
function getChapter(code) {
  const c = normCode(code);
  if (c.length < 2) return null;
  return c.substring(0, 2);
}

/**
 * Extract the 4-digit HS heading from an HS code.
 * Returns null for invalid input.
 * @param {string|number} code
 * @returns {string|null}
 */
function getHeading(code) {
  const c = normCode(code);
  if (c.length < 4) return null;
  return c.substring(0, 4);
}

/**
 * Look up the WTO chapter title for an HS code or chapter number.
 * Returns null when the chapter is not found.
 * @param {string|number} code
 * @returns {string|null}
 */
function chapterTitle(code) {
  const ch = getChapter(code);
  return ch ? (CHAPTERS[ch] || null) : null;
}

/**
 * Validate an HS code and return a structured result object.
 * @param {string|number} code
 * @returns {{ valid: boolean, normalized: string, formatted: string, chapter: string|null, heading: string|null, chapterTitle: string|null, errors: string[] }}
 */
function validateHsCode(code) {
  const errors = [];
  const normalized = normCode(code);

  if (!normalized) {
    errors.push('HS code is required');
  } else if (!/^\d+$/.test(normalized)) {
    errors.push('HS code must contain only digits (after stripping dots, dashes, spaces)');
  } else if (normalized.length < 8) {
    errors.push(`HS code must be exactly 8 digits (got ${normalized.length}: "${normalized}")`);
  } else if (normalized.length > 8) {
    errors.push(`HS code must be at most 8 digits (got ${normalized.length})`);
  }

  const valid = errors.length === 0;
  const chapter = valid ? getChapter(normalized) : null;
  const heading = valid ? getHeading(normalized) : null;

  return {
    valid,
    normalized: valid ? normalized : normalized.substring(0, 8),
    formatted: valid ? formatHsCode(normalized) : normalized.substring(0, 8),
    chapter,
    heading,
    chapterTitle: chapter ? chapterTitle(chapter) : null,
    errors,
  };
}

module.exports = {
  normCode,
  isValidHsCode,
  isValidHsPrefix,
  formatHsCode,
  getChapter,
  getHeading,
  chapterTitle,
  validateHsCode,
  CHAPTERS,
  PRIORITY_HEADINGS,
  ALL_HEADINGS,
  allHeadings,
};