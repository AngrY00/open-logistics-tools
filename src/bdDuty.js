'use strict';

/**
 * Bangladesh Customs Duty Calculator.
 *
 * Implements the official Bangladesh Customs duty cascade formula:
 *
 *   - CD, RD, AIT  → charged on Assessable Value (AV)
 *   - SD            → charged on (AV + CD + RD)
 *   - VAT, AT       → charged on (AV + CD + RD + SD)
 *
 * NOTE: This module calculates the mathematical cascade only. Actual payable
 * duty must be verified against the current official operative tariff at
 * bangladeshcustoms.gov.bd and the applicable NBR SRO schedule before filing.
 *
 * RATE SOURCES (public):
 *   - Official operative tariff: bangladeshcustoms.gov.bd/search_operative_tariff
 *   - Statutory BCT schedule: Bangladesh Customs Tariff (NBR)
 *   - Regulatory notices: NBR SRO database
 *
 * RATE DISCLAIMER: This package does NOT bundle live tariff rates.
 * You must supply the current official CD, SD, VAT, AIT, RD, and AT rates
 * for each HS code from the official sources above.
 */

const MAX_ASSESSABLE_VALUE = 100_000_000_000; // 100 billion BDT

/**
 * Parse a value that may be a plain number, a BDT string with comma grouping,
 * or undefined/null (returns defaultValue).
 *
 * @param {unknown} value
 * @param {{ defaultValue?: number }} options
 * @returns {number|null}
 */
function parseAssessableValue(value, { defaultValue = 100 } = {}) {
  if (value === undefined) return defaultValue;
  if (value === null) return null;
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value > 0 && value <= MAX_ASSESSABLE_VALUE) return value;
    return null;
  }
  const text = String(value).trim();
  if (!text || !/^(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(text)) return null;
  const num = Number(text.replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 && num <= MAX_ASSESSABLE_VALUE ? num : null;
}

/**
 * Bangladesh Customs duty cascade calculator.
 *
 * Given an assessable value (AV) and duty rates, returns a detailed breakdown
 * of each component and the total payable.
 *
 * Cascade formula:
 *   CD  = AV × (cdRate  / 100)
 *   RD  = AV × (rdRate  / 100)
 *   AIT = AV × (aitRate / 100)
 *   SDbase  = AV + CD + RD
 *   SD  = SDbase × (sdRate / 100)
 *   VATbase  = SDbase + SD
 *   VAT = VATbase × (vatRate / 100)
 *   AT  = VATbase × (atRate  / 100)
 *   TotalDuty   = CD + RD + SD + VAT + AIT + AT
 *   TotalPayable = AV + TotalDuty
 *
 * @param {number|string|object} inputOrAv  - Assessable value (BDT) or options object
 * @param {number} [cd]   - Customs Duty rate (%)
 * @param {number} [sd]   - Supplementary Duty rate (%)
 * @param {number} [vat]  - VAT rate (%)
 * @param {number} [ait]  - Advance Income Tax rate (%)
 * @param {number} [rd]   - Regulatory Duty rate (%)
 * @param {number} [at]   - Advance Trade VAT rate (%)
 * @returns {object}      - Full duty breakdown
 *
 * @example
 * bdDuty(100000, 25, 10, 15, 5, 5, 5)
 * // Returns { assessableValue: 100000, lines: [...], totalDuty: X, totalPayable: Y }
 */
function bdDuty(inputOrAv, cd, sd, vat, ait, rd, at) {
  let AV;
  let cdRate, sdRate, vatRate, aitRate, rdRate, atRate;

  if (typeof inputOrAv === 'object' && inputOrAv !== null) {
    // Object form: bdDuty({ assessableValue, cd, sd, vat, ait, rd, at })
    const opts = inputOrAv;
    AV = parseAssessableValue(opts.assessableValue, { defaultValue: 100 });
    cdRate  = opts.cd  ?? 0;
    sdRate  = opts.sd  ?? 0;
    vatRate = opts.vat ?? 0;
    aitRate = opts.ait ?? 0;
    rdRate  = opts.rd  ?? 0;
    atRate  = opts.at  ?? 0;
  } else {
    // Positional form: bdDuty(av, cd, sd, vat, ait, rd, at)
    // An omitted AV defaults to 100 (useful for computing TTI percentages);
    // an explicitly invalid AV (0, negative, NaN, bad string) still throws.
    AV      = parseAssessableValue(inputOrAv, { defaultValue: 100 });
    cdRate  = cd  ?? 0;
    sdRate  = sd  ?? 0;
    vatRate = vat ?? 0;
    aitRate = ait ?? 0;
    rdRate  = rd  ?? 0;
    atRate  = at  ?? 0;
  }

  if (AV === null) {
    const err = new RangeError('valid positive assessable value required (max 100 billion BDT)');
    err.code = 'INVALID_ASSESSABLE_VALUE';
    throw err;
  }

  const cdAmt  = AV * (cdRate  / 100);
  const rdAmt  = AV * (rdRate  / 100);
  const aitAmt = AV * (aitRate / 100);
  const sdBase = AV + cdAmt + rdAmt;
  const sdAmt   = sdBase * (sdRate / 100);
  const vatBase = sdBase + sdAmt;
  const vatAmt  = vatBase * (vatRate / 100);
  const atAmt   = vatBase * (atRate  / 100);

  const r2 = v => +v.toFixed(2);
  const totalDuty    = cdAmt + rdAmt + sdAmt + vatAmt + aitAmt + atAmt;
  const totalPayable = AV + totalDuty;

  return {
    assessableValue: r2(AV),
    totalDuty: r2(totalDuty),
    totalPayable: r2(totalPayable),
    effectiveRate: r2((totalDuty / AV) * 100),
    lines: [
      {
        code: 'CD',
        label: 'Customs Duty',
        rate: cdRate,
        base: 'Assessable Value (AV)',
        baseValue: r2(AV),
        amount: r2(cdAmt),
      },
      {
        code: 'RD',
        label: 'Regulatory Duty',
        rate: rdRate,
        base: 'Assessable Value (AV)',
        baseValue: r2(AV),
        amount: r2(rdAmt),
      },
      {
        code: 'AIT',
        label: 'Advance Income Tax',
        rate: aitRate,
        base: 'Assessable Value (AV)',
        baseValue: r2(AV),
        amount: r2(aitAmt),
      },
      {
        code: 'SD',
        label: 'Supplementary Duty',
        rate: sdRate,
        base: 'AV + CD + RD',
        baseValue: r2(sdBase),
        amount: r2(sdAmt),
      },
      {
        code: 'VAT',
        label: 'Value Added Tax',
        rate: vatRate,
        base: 'AV + CD + RD + SD',
        baseValue: r2(vatBase),
        amount: r2(vatAmt),
      },
      {
        code: 'AT',
        label: 'Advance Trade VAT',
        rate: atRate,
        base: 'AV + CD + RD + SD',
        baseValue: r2(vatBase),
        amount: r2(atAmt),
      },
    ],
  };
}

/**
 * Total Tax Incidence (TTI) as a percentage of Assessable Value.
 *
 * TTI = (Total Duty / AV) × 100 %
 *
 * When AV = 100 (the currency unit), the absolute duty amount equals the
 * percentage value numerically, so TTI(cd,sd,vat,ait,rd,at) = bdDuty(100,...).totalDuty.
 *
 * @param {number} [cd=0]  - Customs Duty rate (%)
 * @param {number} [sd=0]  - Supplementary Duty rate (%)
 * @param {number} [vat=0] - VAT rate (%)
 * @param {number} [ait=0] - Advance Income Tax rate (%)
 * @param {number} [rd=0]  - Regulatory Duty rate (%)
 * @param {number} [at=0]  - Advance Trade VAT rate (%)
 * @returns {number} TTI as a percentage (e.g. 25.5 means 25.5%)
 */
function tti(cd = 0, sd = 0, vat = 0, ait = 0, rd = 0, at = 0) {
  return bdDuty(100, cd, sd, vat, ait, rd, at).totalDuty;
}

module.exports = {
  bdDuty,
  tti,
  parseAssessableValue,
  MAX_ASSESSABLE_VALUE,
};