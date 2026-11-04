// Self-check for lib/clinical.ts. Run: node scripts/check-clinical.mjs  (Node ≥ 22.6, uses type stripping)
import assert from 'node:assert/strict';
import * as c from '../lib/clinical.ts';

// Unit slips
assert.deepEqual(c.suggestUnitFix('anc', 1500), { value: 1.5, message: 'Looks like cells/µL. Convert to 1.5 ×10⁹/L?' });
assert.equal(c.suggestUnitFix('wbc', 8.2), null);
assert.equal(c.suggestUnitFix('hct', 0.23).value, 23);
assert.equal(c.suggestUnitFix('hct', 23), null);
assert.equal(c.suggestUnitFix('hgb', 0.5), null);

// ARC from retic: 2% × 3.0 ×10¹²/L × 10 = 60 ×10⁹/L
assert.equal(c.arcFromRetic(2, 3), 60);

// Parsing
assert.equal(c.parseNumber(''), null);
assert.equal(c.parseNumber('7,4'), 7.4);
assert.ok(Number.isNaN(c.parseNumber('7.4g')));

// Ranges
assert.equal(c.isOutOfRange(17, { min: 3, max: 16, unit: 'g/dL' }), true);
assert.equal(c.isOutOfRange(8, { min: 3, max: 16, unit: 'g/dL' }), false);
assert.equal(c.isOutOfRange(8, undefined), false);

// Age: birthday not yet reached this year
assert.equal(c.ageInYears('2010-06-15', '2026-06-14'), 15);
assert.equal(c.ageInYears('2010-06-15', '2026-06-15'), 16);

// Pregnancy required only for females 12–50
assert.equal(c.pregnancyRequired('female', '2010-01-01', '2026-11-03'), true);
assert.equal(c.pregnancyRequired('female', '2016-01-01', '2026-11-03'), false);
assert.equal(c.pregnancyRequired('male', '2000-01-01', '2026-11-03'), false);

// Display
assert.equal(c.roundTo5Percent(0.72), 70);
assert.equal(c.roundTo5Percent(0.725), 75);
assert.equal(c.formatDate('2027-02-12'), '12 Feb 2027');
assert.equal(c.formatDelta(1.4), '+1.4');
assert.equal(c.toIsoDate(new Date(2026, 0, 5)), '2026-01-05');

console.log('clinical helpers: all checks passed');
