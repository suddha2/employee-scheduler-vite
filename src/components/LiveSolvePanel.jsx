import { Box, Button, Chip, CircularProgress, Tooltip } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import SaveIcon from '@mui/icons-material/Save';
import StopIcon from '@mui/icons-material/Stop';
import { useLiveRota } from '../hooks/useLiveRota';

/**
 * Toolbar control for continuous / live solving of the currently-viewed rota (P4).
 *
 * "Go Live" starts a daemon solver on the server; while running, best solutions
 * stream in and this panel shows the live score + assigned/total, updating in
 * real time. "Save" snapshots the current live solution back to the DB (then the
 * parent reloads the grid); "Stop" terminates the solver.
 *
 * Read-only for now: the streamed solution is summarised here rather than
 * re-rendered cell-by-cell into the editable grid (that + live drag/pin edits via
 * assign()/pin() is the next increment).
 */
export default function LiveSolvePanel({ rotaId, disabled = false, canControl = true, onSnapshotSaved }) {
  const { live, connected, frame, busy, error, start, stop, snapshot } = useLiveRota(rotaId);

  if (!canControl) return null;

  const handleSnapshot = async () => {
    try {
      const res = await snapshot();
      onSnapshotSaved?.(res);
    } catch {
      /* error surfaced via hook state below */
    }
  };

  if (!live) {
    return (
      <Tooltip title={rotaId ? 'Start continuous live solving' : 'Load a schedule first'}>
        <span>
          <Button
            size="small"
            variant="outlined"
            startIcon={busy ? <CircularProgress size={14} /> : <BoltIcon />}
            onClick={start}
            disabled={disabled || !rotaId || busy}
            sx={{ mr: 2 }}
          >
            Go Live
          </Button>
        </span>
      </Tooltip>
    );
  }

  const solving = frame?.status && frame.status !== 'NOT_SOLVING';
  const scoreLabel = frame?.score ? `score ${frame.score}` : connected ? 'starting…' : 'connecting…';
  const progress = frame ? ` · ${frame.assigned}/${frame.total}` : '';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
      <Chip
        color={solving ? 'success' : 'default'}
        size="small"
        icon={<BoltIcon />}
        label={`LIVE · ${scoreLabel}${progress}`}
      />
      <Tooltip title="Persist the current live solution (snapshot)">
        <span>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSnapshot}
            disabled={busy || !frame}
          >
            Save
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Stop live solving">
        <span>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={stop}
            disabled={busy}
          >
            Stop
          </Button>
        </span>
      </Tooltip>
      {error && <Chip color="error" size="small" label={String(error).slice(0, 48)} />}
    </Box>
  );
}
