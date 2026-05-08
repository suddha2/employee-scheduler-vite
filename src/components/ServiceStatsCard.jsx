import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  Button,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CampaignIcon from '@mui/icons-material/Campaign';
import { publishUnallocatedShiftsForService } from '../api/stats';

function aggregateByShiftType(allStats) {
  const map = new Map();
  for (const stat of allStats) {
    const existing = map.get(stat.shiftType) || {
      shiftType: stat.shiftType,
      totalHours: 0,
      allocatedHours: 0,
      unallocatedHours: 0,
      shiftCount: 0,
      allocationCount: 0,
    };
    existing.totalHours += stat.totalHours;
    existing.allocatedHours += stat.allocatedHours;
    existing.unallocatedHours += stat.unallocatedHours;
    existing.shiftCount += stat.shiftCount;
    existing.allocationCount += stat.allocationCount;
    map.set(stat.shiftType, existing);
  }
  return Array.from(map.values());
}

function coverageStyle(percent) {
  if (percent >= 80) return { chip: 'success', headerBg: 'transparent' };
  if (percent >= 50) return { chip: 'warning', headerBg: 'warning.light' };
  return { chip: 'error', headerBg: 'error.light' };
}

function CoverageBar({ percent }) {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 120 }}>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 15,
          borderRadius: 5,
          bgcolor: 'error.main',
          '& .MuiLinearProgress-bar': {
            backgroundColor: percent === 100 ? 'success.main' : 'error.main',
          },
        }}
      />
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 500,
          fontSize: '0.75rem',
        }}
      >
        {percent}%
      </Typography>
    </Box>
  );
}

export default function ServiceStatsCard({ region, service, rotaId, onToast }) {
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!rotaId || publishing) return;
    setPublishing(true);
    try {
      const result = await publishUnallocatedShiftsForService(rotaId, service.location);
      const message = result?.message ||
        (result?.broadcastSent
          ? `Broadcast sent for ${service.location}`
          : `No unallocated shifts at ${service.location} to publish`);
      onToast?.({
        message,
        severity: result?.broadcastSent ? 'success' : 'info',
      });
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;
      if (status === 401 || status === 403) {
        onToast?.({ message: 'Session expired — please log in again', severity: 'error' });
      } else {
        onToast?.({
          message: serverMsg || `Failed to publish for ${service.location}`,
          severity: 'error',
        });
      }
    } finally {
      setPublishing(false);
    }
  };

  const summary = useMemo(() => {
    const allStats = service.weeks?.flatMap(w => w.shiftStats ?? []) ?? [];
    const totalsByType = aggregateByShiftType(allStats);
    const totalShifts = allStats.reduce((sum, s) => sum + s.shiftCount, 0);
    const allocatedShifts = allStats.reduce((sum, s) => sum + s.allocationCount, 0);
    const coverage = totalShifts > 0 ? Math.round((allocatedShifts / totalShifts) * 100) : 0;
    const hasUnallocated = totalsByType.some(s => s.unallocatedHours > 0);
    return { totalsByType, totalShifts, allocatedShifts, coverage, hasUnallocated };
  }, [service.weeks]);

  const { totalsByType, totalShifts, allocatedShifts, coverage, hasUnallocated } = summary;
  const style = coverageStyle(coverage);
  const weekCount = service.weeks?.length ?? 0;
  const grandTotalLabel = weekCount > 0
    ? `Grand Total (${weekCount} Week${weekCount === 1 ? '' : 's'})`
    : 'Grand Total';

  return (
    <Card
      variant="outlined"
      sx={{
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'scale(1.01)', boxShadow: 4 },
        borderLeft: '6px solid',
        borderColor: hasUnallocated ? 'error.main' : 'success.main',
      }}
    >
      <CardContent>
        <Box
          sx={{
            bgcolor: style.headerBg,
            px: 2,
            py: 1.5,
            borderRadius: 1,
            mb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{service.location}</Typography>
            <Chip
              label={`Coverage: ${coverage}%`}
              color={style.chip}
              size="small"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Region: {region.region} | Period: {region.period}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2">Total Shifts: {totalShifts}</Typography>
          <Typography variant="body2">Allocated: {allocatedShifts}</Typography>
          <Typography variant="body2">Unallocated: {totalShifts - allocatedShifts}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">{grandTotalLabel}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Shift Type</TableCell>
                <TableCell>Alloc Count</TableCell>
                <TableCell>Unalloc Count</TableCell>
                <TableCell>Shift Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {totalsByType.map((stat) => (
                <TableRow key={stat.shiftType}>
                  <TableCell>{stat.shiftType}</TableCell>
                  <TableCell>{stat.allocationCount}</TableCell>
                  <TableCell>{stat.shiftCount - stat.allocationCount}</TableCell>
                  <TableCell>{stat.shiftCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {service.weeks?.map((week) => {
          const hasIncompleteCoverage = week.shiftStats?.some(
            stat => stat.shiftCount > 0 && stat.allocationCount < stat.shiftCount
          );
          return (
            <Accordion key={week.weekNumber} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">
                    Week {week.weekNumber} ({week.start} → {week.end})
                  </Typography>
                  {hasIncompleteCoverage && (
                    <Tooltip title="Incomplete coverage">
                      <WarningAmberIcon sx={{ color: 'error.main' }} />
                    </Tooltip>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Shift Type</TableCell>
                      <TableCell>Alloc Count</TableCell>
                      <TableCell>Unalloc Count</TableCell>
                      <TableCell>Shift Count</TableCell>
                      <TableCell>Coverage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {week.shiftStats?.map((stat) => {
                      const percent = stat.shiftCount > 0
                        ? Math.round((stat.allocationCount / stat.shiftCount) * 100)
                        : 0;
                      return (
                        <TableRow key={stat.shiftType}>
                          <TableCell>{stat.shiftType}</TableCell>
                          <TableCell>{stat.allocationCount}</TableCell>
                          <TableCell>{stat.shiftCount - stat.allocationCount}</TableCell>
                          <TableCell>{stat.shiftCount}</TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <CoverageBar percent={percent} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </CardContent>
      {hasUnallocated && (
        <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={publishing ? <CircularProgress size={14} /> : <CampaignIcon />}
            onClick={handlePublish}
            disabled={publishing || !rotaId}
          >
            {publishing ? 'Publishing…' : 'Publish unallocated'}
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
