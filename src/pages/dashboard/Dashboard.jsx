// src/pages/dashboard/Dashboard.jsx
import React from 'react';
import { Typography, Card, CardContent, Grid } from '@mui/material';

export default function Dashboard() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Total Employees</Typography>
            <Typography variant="h4">120</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Shifts Today</Typography>
            <Typography variant="h4">45</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
