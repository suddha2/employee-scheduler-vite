import React from 'react';
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Paper, Button
} from '@mui/material';

export default function ScheduleList({ requests,onView }) {
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
                        <TableRow key={idx}>
                            <TableCell>{req.startDate}</TableCell>
                            <TableCell>{req.endDate}</TableCell>
                            <TableCell>{req.region}</TableCell>
                            <TableCell><Button
                                variant="contained"
                                color={req.completed ? 'primary' : 'warning'}
                                disabled={!req.completed}
                                onClick={() => req.completed && onView(req)}
                            >
                                {req.completed ? 'View' : 'Pending'}
                            </Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
}
