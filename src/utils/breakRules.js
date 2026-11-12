// Live preview of the shift-template save checks (backend ShiftTemplateRules, V045).
// The server has the final say; these defaults match solver_tuning's
// statutoryBreakAfterMinutes / statutoryBreakMinutes.
export const BREAK_AFTER_MINUTES = 360;
export const MIN_BREAK_MINUTES = 20;

const toMins = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

// Minutes from start to end; an end at or before the start runs past midnight.
export function spanMinutes(start, end) {
  const s = toMins(start);
  const e = toMins(end);
  if (s == null || e == null) return 0;
  const d = e - s;
  return d <= 0 ? d + 24 * 60 : d;
}

export function workedMinutes(start, end, breakMinutes) {
  return Math.max(0, spanMinutes(start, end) - (Number(breakMinutes) || 0));
}

// 780 -> "13 h", 20 -> "20 min", 750 -> "12 h 30 min"
export function fmtHM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const label = (code) => (code ? code.replace(/_/g, ' ').toLowerCase() : 'this shift type');

// Problems that would stop the template being saved, in the server's words.
// `type` is the shift type row (countsAsWork, maxHoursPerDay); inactive templates pass.
export function breakProblems({ startTime, endTime, breakMinutes, shiftType, active = true }, type) {
  if (!active || !startTime || !endTime) return [];
  if (toMins(startTime) === toMins(endTime)) return ['Start and end are the same time.'];
  const span = spanMinutes(startTime, endTime);
  const brk = Number(breakMinutes) || 0;
  if (brk < 0) return ["The break can't be negative."];
  if (brk >= span) return [`The break (${fmtHM(brk)}) is as long as the shift (${fmtHM(span)}).`];
  const worked = span - brk;
  const out = [];
  if (type?.countsAsWork && worked > BREAK_AFTER_MINUTES && brk < MIN_BREAK_MINUTES) {
    out.push(`A ${fmtHM(span)} shift needs a break of at least ${fmtHM(MIN_BREAK_MINUTES)}`
      + ` (statutory break for more than ${fmtHM(BREAK_AFTER_MINUTES)} worked)`
      + (brk === 0 ? '.' : `; ${fmtHM(brk)} is entered.`));
  }
  const max = type?.maxHoursPerDay;
  if (max != null && worked > max * 60) {
    out.push(`${fmtHM(worked)} worked is over the ${max} h daily limit for ${label(shiftType)},`
      + ' so no carer could be given this shift. Shorten it or lengthen the break.');
  }
  return out;
}

// The server's refusal ({ error, problems }) as one readable message.
export function refusalText(err, fallback) {
  const data = err?.response?.data;
  if (data?.problems?.length > 1) return `${data.error} ${data.problems.join(' ')}`;
  return data?.error || data?.message || fallback;
}
