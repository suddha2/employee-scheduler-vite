import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import {
  Error as ErrorIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

export default function ConflictDialog({ 
  open, 
  onClose, 
  employee,
  targetShift,
  conflictingShifts = []
}) {
  if (!employee || !targetShift) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ErrorIcon color="error" />
        Schedule Conflict Detected
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>{employee.firstName} {employee.lastName}</strong> is already assigned 
          to {conflictingShifts.length} shift{conflictingShifts.length > 1 ? 's' : ''} on this day.
        </Alert>

        <DialogContentText sx={{ mb: 2 }}>
          An employee cannot be assigned to multiple shifts on the same day.
        </DialogContentText>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Attempted Assignment:
        </Typography>
        <Box sx={{ 
          p: 1.5, 
          bgcolor: 'grey.50', 
          borderRadius: 1, 
          mb: 2,
          border: '1px solid',
          borderColor: 'grey.300'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {format(new Date(targetShift.date), 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <ScheduleIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {targetShift.startTime} - {targetShift.endTime}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {targetShift.location} ({targetShift.shiftType.replace(/_/g, ' ')})
            </Typography>
          </Box>
        </Box>

        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Existing Assignment{conflictingShifts.length > 1 ? 's' : ''}:
        </Typography>
        {conflictingShifts.map((conflict, index) => (
          <Box 
            key={index}
            sx={{ 
              p: 1.5, 
              bgcolor: 'error.light', 
              borderRadius: 1, 
              mb: 1,
              border: '1px solid',
              borderColor: 'error.main'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ScheduleIcon fontSize="small" />
              <Typography variant="body2" fontWeight="bold">
                {conflict.startTime} - {conflict.endTime}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon fontSize="small" />
              <Typography variant="body2">
                {conflict.location} ({conflict.shiftType.replace(/_/g, ' ')})
              </Typography>
            </Box>
          </Box>
        ))}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          variant="contained"
          autoFocus
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}