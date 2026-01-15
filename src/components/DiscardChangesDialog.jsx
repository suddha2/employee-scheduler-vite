// ✅ STEP 1: Create DiscardChangesDialog.jsx component

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
  Chip,
  Divider,
  Alert
} from '@mui/material';
import {
  Warning as WarningIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';

export default function DiscardChangesDialog({ 
  open, 
  onClose, 
  onConfirm, 
  pendingChanges = [] 
}) {
  const assignedCount = pendingChanges.filter(c => c.changeType === 'ASSIGNED').length;
  const unassignedCount = pendingChanges.filter(c => c.changeType === 'UNASSIGNED').length;
  const reassignedCount = pendingChanges.filter(c => c.changeType === 'REASSIGNED').length;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Discard Changes?
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          You have <strong>{pendingChanges.length} unsaved changes</strong>. 
          Are you sure you want to discard them?
        </DialogContentText>

        <Alert severity="warning" sx={{ mb: 2 }}>
          This action cannot be undone. All pending changes will be lost.
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Changes to be discarded:
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {assignedCount > 0 && (
            <Chip
              icon={<AddIcon />}
              label={`${assignedCount} assigned`}
              color="success"
              size="small"
              variant="outlined"
            />
          )}
          {unassignedCount > 0 && (
            <Chip
              icon={<RemoveIcon />}
              label={`${unassignedCount} removed`}
              color="default"
              size="small"
              variant="outlined"
            />
          )}
          {reassignedCount > 0 && (
            <Chip
              icon={<SwapIcon />}
              label={`${reassignedCount} reassigned`}
              color="info"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button 
          onClick={() => {
            onConfirm();
            onClose();
          }}
          variant="contained"
          color="error"
          autoFocus
        >
          Discard Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}