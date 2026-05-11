import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { parseLocalDate } from '../utils/dates';

// Right-anchored drawer that lists every conflict cell so the admin can
// scan and jump to each one. `onNavigate(cellKey)` is invoked when the
// user clicks an entry -- the parent is expected to scroll the schedule
// grid to the corresponding row.
export default function ConflictsDrawer({
  open,
  onClose,
  conflictCells,
  conflictCellInfo,
  onNavigate,
}) {
  const items = [];
  conflictCells.forEach((cellKey) => {
    const parts = cellKey.split('|');
    if (parts.length !== 5) return;
    const [location, shiftType, date, startTime, shiftId] = parts;
    items.push({
      cellKey,
      location,
      shiftType,
      date,
      startTime,
      shiftId,
      info: conflictCellInfo.get(cellKey),
    });
  });

  items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.location !== b.location) return a.location.localeCompare(b.location);
    return a.shiftType.localeCompare(b.shiftType);
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 440 } }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberIcon color="error" />
            <Typography variant="h6">
              Conflicts ({items.length})
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {items.length === 0 ? (
          <Alert severity="success">No conflicts on this schedule.</Alert>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }}>
            {items.map((item) => {
              let dateLabel = item.date;
              try {
                dateLabel = format(parseLocalDate(item.date), 'EEE d MMM');
              } catch {
                // fall back to raw string
              }
              const employees = Array.from(item.info?.employees || []);
              const peerKeys = new Set();
              const peers = [];
              (item.info?.peers || []).forEach((p) => {
                const k = `${p.location}|${p.shiftType}|${p.startTime || ''}`;
                if (peerKeys.has(k)) return;
                peerKeys.add(k);
                peers.push(p);
              });

              return (
                <ListItem key={item.cellKey} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => onNavigate(item.cellKey)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'error.light',
                      borderRadius: 1,
                      backgroundColor: 'error.lighter',
                      '&:hover': { backgroundColor: 'error.light' },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          <Chip label={dateLabel} size="small" />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {item.location}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.shiftType.replaceAll('_', ' ')} @ {(item.startTime || '').slice(0, 5)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {employees.length > 0 && (
                            <Typography variant="body2" component="div">
                              {employees.join(', ')}
                            </Typography>
                          )}
                          {peers.length > 0 && (
                            <Typography variant="caption" color="text.secondary" component="div">
                              Clashes with: {peers
                                .map((p) => `${p.location} · ${(p.shiftType || '').replaceAll('_', ' ')} @ ${(p.startTime || '').slice(0, 5)}`)
                                .join('; ')}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Drawer>
  );
}
