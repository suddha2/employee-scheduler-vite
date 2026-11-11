// Parse a "YYYY-MM-DD" string as a Date at *local* midnight.
//
// Avoid `new Date("YYYY-MM-DD")` -- that's parsed as UTC midnight, which in
// any timezone behind UTC lands on the previous calendar day locally. The
// resulting weekday / week-number calculations then shift by one, and shifts
// end up rendered under the wrong day or week.
export function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// UK display formats used everywhere a date is shown: DD/MM/YYYY (Barnet, Nov 2026).
// Accept a "YYYY-MM-DD" string (read as a local date), an ISO date-time string or a Date.
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return parseLocalDate(v);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, '0');

/** 09/11/2026 */
export function fmtDate(v, fallback = '—') {
  const d = toDate(v);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : fallback;
}

/** 09/11/2026 14:05 */
export function fmtDateTime(v, fallback = '—') {
  const d = toDate(v);
  return d ? `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : fallback;
}

/** 09/11 (grid headers where the year is obvious) */
export function fmtDayMonth(v, fallback = '') {
  const d = toDate(v);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : fallback;
}

/** Mon 09/11/2026 */
export function fmtWeekdayDate(v, fallback = '—') {
  const d = toDate(v);
  return d ? `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${fmtDate(d)}` : fallback;
}
