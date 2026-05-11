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
