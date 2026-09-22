'use strict';

/**
 * All possible 4-digit HS headings (01.01 through 97.99).
 *
 * The WTO Harmonized System has 97 chapters, each containing up to 99 headings.
 * This module generates all 9,703 possible 4-digit codes (01 × 01 – 97 × 99).
 *
 * Source: WTO HS Nomenclature (public domain).
 * See: https://www.wcoomd.org/
 *
 * NOTE: Not all heading numbers are assigned in practice. Only a fraction of
 * the 9,703 possible headings are actually used in the official tariff schedules.
 * The PRIORITY_HEADINGS list covers the most commonly traded commodity headings.
 */

/** All 4-digit heading codes (01.01 through 97.99). */
function allHeadings() {
  const out = [];
  for (let ch = 1; ch <= 97; ch++) {
    const p = String(ch).padStart(2, '0');
    for (let h = 1; h <= 99; h++) {
      out.push(`${p}${String(h).padStart(2, '0')}`);
    }
  }
  return out;
}

/** Common trade-commodity headings frequently used in customs workflows. */
const PRIORITY_HEADINGS = [
  '0201', '0202', '0302', '0303', '0401', '0402', '0406',
  '0701', '0805', '0901', '0902',
  '1001', '1006', '1101',
  '1507', '1511',
  '1604',
  '1701',
  '1901',
  '2204',
  '2402',
  '2710',
  '2915',
  '3002', '3003', '3004',
  '3102',
  '3208', '3305', '3401',
  '3901', '3904', '3920',
  '4011',
  '4407',
  '4802', '4901',
  '5205', '5208',
  '6109', '6203', '6204', '6402',
  '6907',
  '7208', '7213',
  '7312',
  '7601',
  '8418', '8419', '8422', '8443', '8471', '8473',
  '8502', '8517', '8518', '8528', '8536', '8544',
  '8703', '8704', '8708',
  '9018', '9027',
  '9401', '9403',
  '9503',
];

const ALL_HEADINGS = allHeadings();

module.exports = { PRIORITY_HEADINGS, ALL_HEADINGS, allHeadings };