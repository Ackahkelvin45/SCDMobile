// Pure clinical/unit helpers. No imports, so scripts/check-clinical.mjs can run this file with plain Node.
// Canonical units (spec §5): Hb g/dL · WBC, ANC, platelets, ARC ×10⁹/L · RBC ×10¹²/L · MCV fL · Hct %.

export type Range = { min: number; max: number; unit: string };

export type UnitSuggestion = { value: number; message: string } | null;

/**
 * Catch the common unit slips before the value reaches the server:
 * WBC/ANC typed as cells/µL (e.g. 1500 instead of 1.5) and Hct typed as a fraction (0.23 instead of 23).
 */
export function suggestUnitFix(lab: string, value: number): UnitSuggestion {
  if ((lab === 'wbc' || lab === 'anc') && value > 100) {
    const converted = round(value / 1000, 2);
    return { value: converted, message: `Looks like cells/µL. Convert to ${converted} ×10⁹/L?` };
  }
  if (lab === 'hct' && value > 0 && value <= 1) {
    const converted = round(value * 100, 1);
    return { value: converted, message: `Looks like a fraction. Convert to ${converted}%?` };
  }
  return null;
}

/** ARC (×10⁹/L) = retic % × RBC (×10¹²/L) × 10. */
export function arcFromRetic(reticPercent: number, rbc: number): number {
  return round(reticPercent * rbc * 10, 1);
}

export function isOutOfRange(value: number, range: Range | undefined): boolean {
  return !!range && (value < range.min || value > range.max);
}

/** Parses a typed number; '' → null, junk → NaN (caller shows "not a number"). Accepts a comma decimal. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}

/** Whole years between an ISO birth date and an ISO reference date (default today). */
export function ageInYears(dobIso: string, atIso: string = toIsoDate(new Date())): number {
  const [by, bm, bd] = dobIso.split('-').map(Number);
  const [ay, am, ad] = atIso.split('-').map(Number);
  let age = ay - by;
  if (am < bm || (am === bm && ad < bd)) age -= 1;
  return age;
}

/** Spec US4.1: pregnancy status is required for females aged 12–50 at the visit. */
export function pregnancyRequired(sex: string, dobIso: string, atIso?: string): boolean {
  if (sex !== 'female') return false;
  const age = ageInYears(dobIso, atIso);
  return age >= 12 && age <= 50;
}

/** Spec US5.2: show probabilities rounded to 5%. */
export function roundTo5Percent(probability: number): number {
  return Math.round((probability * 100) / 5) * 5;
}

/** Local calendar date as YYYY-MM-DD (not toISOString, which shifts to UTC). */
export function toIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Feb 2027" — unambiguous day/month for clinic use. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = fromIsoDate(iso.slice(0, 10));
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDelta(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return '—';
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}` : s;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
