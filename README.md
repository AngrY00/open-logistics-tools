# HS Codes — Validation, Reference & Bangladesh Customs Duty Utilities

Open-source utilities for logistics, shipping and customs workflows. No external
dependencies; ships only public WTO HS nomenclature data.

> **Source data contract**: This package bundles no live tariff rates. Supply the
> official CD/SD/VAT/AIT/RD/AT rates for your HS codes from
> [bangladeshcustoms.gov.bd](https://bangladeshcustoms.gov.bd) before filing.

---

## Installation

```bash
npm install hs-codes
```

Requires Node ≥ 18.

---

## Module overview

The package exports both HS code utilities and the Bangladesh duty calculator
from a single entry point.

```js
// Everything is exported from the package root:
const {
  // HS code utilities
  normCode, isValidHsCode, isValidHsPrefix, formatHsCode,
  getChapter, getHeading, chapterTitle, validateHsCode,
  CHAPTERS, ALL_HEADINGS, PRIORITY_HEADINGS,
  // Bangladesh duty calculator
  bdDuty, tti, parseAssessableValue,
} = require('hs-codes');

// Or access the sub-modules directly:
const { hsCodes }       = require('hs-codes');  // HS code utilities
const { bdDutyModule }  = require('hs-codes');  // { bdDuty, tti, parseAssessableValue }
```

---

## HS Code utilities

### `normCode(code)` → `string`

Strip dots, dashes and spaces; truncate to 8 characters.

```js
normCode('0901.21.00')   // → '09012100'
normCode('84713000')     // → '84713000'
normCode('84713')       // → '84713'     (truncated to available digits)
```

### `isValidHsCode(code)` → `boolean`

Returns `true` only for a valid 8-digit HS code.

```js
isValidHsCode('0901.21.00')   // → true
isValidHsCode('0901')         // → false  (only 4 digits)
isValidHsCode('0901ABCD')     // → false  (letters)
```

### `formatHsCode(code)` → `string`

Format an 8-digit code as `XXXX.XX.XX`.

```js
formatHsCode('09012100')    // → '0901.21.00'
formatHsCode('84713000')   // → '8471.30.00'
formatHsCode('0')          // → '0'     (unchanged — not 8 digits)
```

### `getChapter(code)` → `string | null`

Extract the 2-digit chapter from any HS code prefix.

```js
getChapter('0901.21.00')   // → '09'
getChapter('84713000')     // → '84'
getChapter('84')           // → '84'
```

### `getHeading(code)` → `string | null`

Extract the 4-digit heading.

```js
getHeading('0901.21.00')   // → '0901'
getHeading('84713000')     // → '8471'
```

### `chapterTitle(codeOrChapter)` → `string | null`

Look up the official WTO chapter title.

```js
chapterTitle('0901')       // → 'Coffee, tea, mate and spices'
chapterTitle('8471')       // → 'Nuclear reactors, boilers, machinery and mechanical appliances; parts thereof'
chapterTitle('8703')       // → 'Vehicles other than railway or tramway rolling-stock, and parts and accessories thereof'
chapterTitle('99')         // → null  (not in nomenclature)
```

### `validateHsCode(code)` → `{ valid, normalized, formatted, chapter, heading, chapterTitle, errors }`

Full validation result with structured errors.

```js
validateHsCode('0901.21.00')
// → {
//   valid: true,
//   normalized: '09012100',
//   formatted: '0901.21.00',
//   chapter: '09',
//   heading: '0901',
//   chapterTitle: 'Coffee, tea, mate and spices',
//   errors: []
// }

validateHsCode('0901')
// → { valid: false, errors: ['HS code must be exactly 8 digits (got 4: "0901")'], ... }
```

### `isValidHsPrefix(code)` → `boolean`

Returns `true` for a valid 2–8 digit chapter/heading prefix.

```js
isValidHsPrefix('09')      // → true  (chapter)
isValidHsPrefix('0901')    // → true  (heading)
isValidHsPrefix('847130')  // → true  (subheading)
```

### Reference data

```js
const { CHAPTERS } = require('hs-codes');
// 97 WTO HS chapters: { '01': 'Live animals', ..., '97': 'Works of art,...' }
Object.keys(CHAPTERS).length  // → 97

const { ALL_HEADINGS } = require('hs-codes');
// All 9,603 possible 4-digit heading codes (97 chapters x 99 headings)
ALL_HEADINGS.length           // → 9603
ALL_HEADINGS.includes('0901') // → true
ALL_HEADINGS.includes('8708') // → true

const { allHeadings } = require('hs-codes');
allHeadings()                 // → regenerate the 9,603-entry array

const { PRIORITY_HEADINGS } = require('hs-codes');
// 68 commonly traded headings (e.g. 0901 coffee, 8703 cars, 8471 computers)
```

---

## Bangladesh Customs duty calculator

Implements the official BD Customs cascade formula:

```
CD, RD, AIT  → charged on Assessable Value (AV)
SD           → charged on AV + CD + RD
VAT, AT      → charged on AV + CD + RD + SD
```

> **Public formula**: This is the standard published Bangladesh Customs duty
> cascade, not proprietary logic. You must still confirm current rates before filing.

### `bdDuty(assessableValue, cd, sd, vat, ait, rd, at)` → `object`

Positional arguments. All rates are percentages (e.g. 25 = 25%).

```js
// Example: AV = 1,000,000 BDT, CD=25%, RD=5%, SD=10%, VAT=15%, AIT=5%, AT=5%
const result = bdDuty(1000000, 25, 10, 15, 5, 5, 5);
// Returns:
// {
//   assessableValue: 1000000,
//   totalDuty:       766000,
//   totalPayable:   1766000,
//   effectiveRate:   76.6,
//   lines: [
//     { code: 'CD',  label: 'Customs Duty',       rate: 25, base: 'AV',                 baseValue: 1000000, amount: 250000 },
//     { code: 'RD',  label: 'Regulatory Duty',    rate: 5,  base: 'AV',                 baseValue: 1000000, amount: 50000  },
//     { code: 'AIT', label: 'Advance Income Tax', rate: 5,  base: 'AV',                 baseValue: 1000000, amount: 50000  },
//     { code: 'SD',  label: 'Supplementary Duty', rate: 10, base: 'AV + CD + RD',      baseValue: 1300000, amount: 130000 },
//     { code: 'VAT', label: 'Value Added Tax',    rate: 15, base: 'AV + CD + RD + SD', baseValue: 1430000, amount: 214500 },
//     { code: 'AT',  label: 'Advance Trade VAT',  rate: 5,  base: 'AV + CD + RD + SD', baseValue: 1430000, amount: 71500  },
//   ]
// }
```

### `bdDuty({ assessableValue, cd, sd, vat, ait, rd, at })` → `object`

Named-object form.

```js
bdDuty({
  assessableValue: 2923311.29,
  cd: 25, sd: 10, vat: 15, ait: 5, rd: 5, at: 5
})
```

### `bdDuty` — Assessable value parsing

Accepts plain numbers, comma-grouped BDT strings, or `undefined` (defaults to 100).

```js
bdDuty(1_000_000, 25, 0, 0, 0, 0, 0)              // ✓
bdDuty('1,000,000', 25, 0, 0, 0, 0, 0)            // ✓
bdDuty(2923311.29, 25, 10, 15, 5, 5, 5)           // ✓
bdDuty({ assessableValue: '2,923,311.29', cd: 25, sd: 10, vat: 15, ait: 5, rd: 5, at: 5 }) // ✓
bdDuty()                                            // → AV defaults to 100 (for TTI)
```

### `tti(cd, sd, vat, ait, rd, at)` → `number`

Total Tax Incidence as a percentage of AV. When AV = 100, the TTI% equals the
absolute duty amount — `tti(25, 10, 15, 5, 5, 5) = bdDuty(100, 25, 10, 15, 5, 5, 5).totalDuty`.

```js
tti(25, 10, 15, 5, 5, 5)   // → 76.6  (% of AV)
```

### `parseAssessableValue(value, { defaultValue })` → `number | null`

Parse a BDT assessable value that may be a plain number or a comma-grouped string.
Returns `null` for invalid input.

```js
parseAssessableValue('2,923,311.29')    // → 2923311.29
parseAssessableValue('1,000,000')       // → 1000000
parseAssessableValue('abc')             // → null
parseAssessableValue(0)                  // → null
```

---

## Running tests

```bash
npm install          # no production dependencies
npm test             # runs all test files with Node.js built-in test runner
```

---

## Rate sources (public)

| Source | URL |
|--------|-----|
| BD Customs operative tariff search | bangladeshcustoms.gov.bd/users/search_operative_tariff |
| Bangladesh Customs Tariff (BCT) statutory schedule | Available from NBR |
| NBR SRO database | Check current NBR website |

> **Important**: This package provides the **calculation engine only**. You must
> supply current official duty rates from the sources above before filing any
> Bill of Entry. Duty rates change with each fiscal year's budget and new SROs.

---

## License

MIT — see [LICENSE](./LICENSE).