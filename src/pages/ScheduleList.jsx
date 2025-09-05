import React from 'react';
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Paper, Button, Box, Chip, Grid
} from '@mui/material';

export default function ScheduleList({ requests, onView }) {
    if (!requests.length) {
        return <Typography color="text.secondary">No requests submitted yet.</Typography>;
    }

    return (
        <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Submitted Requests
            </Typography>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Start Date</TableCell>
                        <TableCell>End Date</TableCell>
                        <TableCell>Region</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {requests.map((req, idx) => (
                        <React.Fragment key={idx}>
                            <TableRow >
                                <TableCell>{req.startDate}</TableCell>
                                <TableCell>{req.endDate}</TableCell>
                                <TableCell>{req.region}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="contained"
                                        color={req.completed ? 'primary' : 'warning'}
                                        disabled={!req.completed}
                                        onClick={() => req.completed && onView(req)}>
                                        {req.completed ? 'View' : 'Pending'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                            {req.completed === true && req.scheduleSummary && (
                                <TableRow>
                                    <TableCell colSpan={4} sx={{ padding: 0, backgroundColor: '#f5f5f5' }}>
                                        <Paper elevation={2} sx={{ padding: 2, margin: 1 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Shift Summary
                                                </Typography>

                                            </Box>

                                            {Object.entries(req.scheduleSummary).map(([type, stats]) => (
                                                <Grid container spacing={1} alignItems="center" key={type} sx={{ marginBottom: 0.5 }}>
                                                    <Grid item xs={3} sm={2}>
                                                        <Chip label={type} variant="outlined" size="small" sx={{ width: '100%' }} />
                                                    </Grid>
                                                    <Grid item xs={9} sm={10}>
                                                        <Typography variant="body2">
                                                            <Box component="span" sx={{ color: 'green', fontWeight: 500 }}>
                                                                {stats.assigned}
                                                            </Box>{' '}
                                                            assigned,&nbsp;
                                                            <Box component="span" sx={{ color: 'red', fontWeight: 500 }}>
                                                                {stats.unassigned}
                                                            </Box>{' '}
                                                            unassigned
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            ))}
                                        </Paper>
                                    </TableCell>
                                </TableRow>
                            )}
                        </React.Fragment>
                    ))}

                </TableBody>
            </Table>
        </Paper>
    );
}
