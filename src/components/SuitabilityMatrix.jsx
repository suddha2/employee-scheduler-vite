import { Box, Typography, Tooltip, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const CRITERIA = [
  { key: 'service', label: 'Service' },
  { key: 'day', label: 'Day' },
  { key: 'shiftType', label: 'Type' },
  { key: 'gender', label: 'Gender' },
  { key: 'skills', label: 'Skills' },
  { key: 'region', label: 'Region' },
];

const TOOLTIP_PREFIX = {
  service: 'Service preference',
  day: 'Day preference',
  shiftType: 'Shift type preference',
  gender: 'Required gender vs employee',
  skills: 'Required skills vs employee',
  region: 'Employee region',
};

const STATE_LABEL = {
  MATCH: 'matches',
  NEUTRAL: 'neutral',
  MISMATCH: 'mismatch',
};

function CriterionMark({ state }) {
  if (state === 'MATCH') {
    return <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: 'success.main' }} />;
  }
  if (state === 'NEUTRAL') {
    return (
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: 'grey.500',
          boxSizing: 'border-box',
        }}
      />
    );
  }
  if (state === 'MISMATCH') {
    return <CloseIcon sx={{ fontSize: 16, color: 'error.main' }} />;
  }
  return (
    <Typography variant="caption" color="text.disabled">—</Typography>
  );
}

function HoursBar({ hoursImpact }) {
  const { currentHours, afterApprovalHours, minHrs, maxHrs, state } = hoursImpact;
  const max = Math.max(
    maxHrs ?? 0,
    afterApprovalHours ?? 0,
    currentHours ?? 0,
    1
  );
  const pct = (n) => Math.max(0, Math.min(100, (n / max) * 100));
  const currentPct = pct(currentHours ?? 0);
  const afterPct = pct(afterApprovalHours ?? currentHours ?? 0);
  const minPct = minHrs != null ? pct(minHrs) : null;
  const maxPct = maxHrs != null ? pct(maxHrs) : null;

  const extColor =
    state === 'MATCH' ? 'success.main' :
      state === 'MISMATCH' ? 'error.main' :
        'warning.main';

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 10, bgcolor: 'grey.200', borderRadius: 1, mt: 0.5 }}>
      <Box
        sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${currentPct}%`, bgcolor: 'primary.main',
          borderRadius: '4px 0 0 4px',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: `${currentPct}%`,
          top: 0,
          bottom: 0,
          width: `${Math.max(0, afterPct - currentPct)}%`,
          bgcolor: extColor,
        }}
      />
      {minPct != null && (
        <Tooltip title={`min ${minHrs}h`}>
          <Box
            sx={{
              position: 'absolute', left: `${minPct}%`, top: -3, bottom: -3,
              width: 2, bgcolor: 'text.secondary',
            }}
          />
        </Tooltip>
      )}
      {maxPct != null && (
        <Tooltip title={`max ${maxHrs}h`}>
          <Box
            sx={{
              position: 'absolute', left: `${maxPct}%`, top: -3, bottom: -3,
              width: 2, bgcolor: 'text.secondary',
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}

export function SummaryBadge({ summary }) {
  if (!summary) {
    return <Chip label="—" size="small" variant="outlined" />;
  }
  const color = summary === 'STRONG' ? 'success' : summary === 'WEAK' ? 'warning' : 'default';
  return <Chip label={`Fit: ${summary}`} size="small" color={color} />;
}

export default function SuitabilityMatrix({ fit }) {
  if (!fit) {
    return (
      <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Suitability info not available for this request.
        </Typography>
      </Box>
    );
  }

  const { criteria = {}, hoursImpact, notes } = fit;
  const hasBounds = hoursImpact && (hoursImpact.minHrs != null || hoursImpact.maxHrs != null);

  return (
    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {CRITERIA.map(({ key, label }) => {
          const state = criteria[key];
          const tooltip = state
            ? `${TOOLTIP_PREFIX[key]}: ${STATE_LABEL[state]}`
            : `${TOOLTIP_PREFIX[key]}: not evaluated`;
          return (
            <Tooltip key={key} title={tooltip}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                <Box sx={{ height: 18, display: 'flex', alignItems: 'center' }}>
                  <CriterionMark state={state} />
                </Box>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {hoursImpact && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Week {hoursImpact.weekNumber} · {hoursImpact.currentHours}h → {hoursImpact.afterApprovalHours}h
            {hasBounds && (
              <> · range {hoursImpact.minHrs ?? '—'}–{hoursImpact.maxHrs ?? '—'}h</>
            )}
          </Typography>
          {hasBounds && <HoursBar hoursImpact={hoursImpact} />}
        </Box>
      )}

      {Array.isArray(notes) && notes.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {notes.map((note, i) => (
            <Typography key={i} variant="caption" color="warning.main" display="block">
              ⚠ {note}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
