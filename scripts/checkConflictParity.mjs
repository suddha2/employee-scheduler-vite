// Frontend half of the same-day-rule parity check. Runs the actual UI rule
// (isAllowedDayShiftTypes) against the shared fixtures and fails (exit 1) on any
// mismatch. The backend runs the SAME fixtures against ShiftOverlap.allowedSameDay
// in SameDayRuleParityTest.java. Keep the two fixtures files byte-identical.
//
//   npm run test:parity
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isAllowedDayShiftTypes } from '../src/utils/shiftConflicts.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(here, '../src/utils/__fixtures__/shift-conflict-fixtures.json');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));

const failures = [];
for (const c of fixtures.cases) {
  const shifts = c.shifts.map(([startTime, endTime]) => ({ startTime, endTime }));
  const actual = isAllowedDayShiftTypes(shifts);
  if (actual !== c.allowed) {
    failures.push(`'${c.name}' expected allowed=${c.allowed} but got ${actual}`);
  }
}

if (failures.length) {
  console.error('FE same-day rule disagrees with shared fixtures:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(`Conflict parity OK - ${fixtures.cases.length} cases match the shared fixtures.`);
