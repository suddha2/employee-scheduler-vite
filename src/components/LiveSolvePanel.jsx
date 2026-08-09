import { Box, Button, Chip, CircularProgress, Tooltip } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import SaveIcon from '@mui/icons-material/Save';
import StopIcon from '@mui/icons-material/Stop';

/**
 * Toolbar control for continuous / live solving of the currently-viewed rota (P4).
 *
 * Controlled component: the parent (ViewSchedules) owns the single useLiveRota
 * instance and passes its state/actions down, so the same live session also
 * drives the grid reflection and live edits (P4b).
 *
 * "Go Live" starts a daemon solver; while running the grid updates in real time
 * from streamed best solutions. "Save" snapshots the current solution to the DB
 * (parent reloads the grid); "Stop" terminates the solver.
 */
export default function LiveSolvePanel({
  rotaId,
  live,
  connected,
  frame,
  busy,
  error,
  start,
  stop,
  snapshot,
  disabled = false,
  canControl = true,
  onSnapshotSaved,
  onStopped,
}) {
  if (!canControl) return null;

  const handleSnapshot = async () => {
    try {
      const res = await snapshot();
      onSnapshotSaved?.(res);
    } catch {
      /* error surfaced via hook state below */
    }
  };

  const handleStop = async () => {
    await stop();
    onStopped?.();
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
            onClick={handleStop}
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
