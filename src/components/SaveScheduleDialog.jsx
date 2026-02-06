import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  FormControlLabel,
  Checkbox,
  Paper,
} from '@mui/material';
import {
  Save as SaveIcon,
  Warning as WarningIcon,
  PushPin as PinIcon,
} from '@mui/icons-material';
import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

export default function SaveScheduleDialog({
  open,
  onClose,
  scheduleId,
  pendingChanges,
  assignmentMap,
  onSaveComplete,
}) {
  const [versionLabel, setVersionLabel] = useState('');
  const [comment, setComment] = useState('');
  const [pinAllChanges, setPinAllChanges] = useState(false);  // ✅ NEW STATE
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (!saving) {
      setVersionLabel('');
      setComment('');
      setPinAllChanges(false);  // ✅ RESET
      setError(null);
      onClose();
    }
  };

  const formatChangesForBackend = (changes) => {
    return changes.map(change => ({
      shiftId: change.shiftId,
      oldEmployeeId: change.oldEmployeeId || null,
      newEmployeeId: change.newEmployeeId || null,
      changeReason: change.changeReason || 'MANUAL_ASSIGN',
    }));
  };

  const handleSave = async () => {
    if (!versionLabel.trim()) {
      setError('Version label is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formattedChanges = formatChangesForBackend(pendingChanges);

      console.log('Saving version with changes:', {
        scheduleId,
        versionLabel,
        comment,
        pinAllChanges,  // ✅ LOG PIN STATUS
        changesCount: formattedChanges.length,
        changes: formattedChanges,
      });

      const response = await axiosInstance.post(
        `${API_ENDPOINTS.scheduleVersions}/${scheduleId}/versions`,
        {
          versionLabel: versionLabel.trim(),
          comment: comment.trim() || null,
          changes: formattedChanges,
          pinAllChanges: pinAllChanges,  // ✅ SEND TO BACKEND
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      console.log('Save response:', response.data);

      // Call success callback
      if (onSaveComplete) {
        onSaveComplete(response.data);
      }

      // Reset form and close
      setVersionLabel('');
      setComment('');
      setPinAllChanges(false);  // ✅ RESET
      onClose();
    } catch (err) {
      console.error('Failed to save version:', err);

      // ✅ HANDLE CONFLICT ERROR (409)
      if (err.response?.status === 409) {
        const conflicts = err.response?.data?.conflicts || [];
        setError(`Pin validation failed: ${conflicts.length} conflict(s) detected. Please fix conflicting shift assignments before saving.`);
      } else {
        const errorMsg = err.response?.data?.message || 'Failed to save version';
        setError(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Group changes by type
  const assignedCount = pendingChanges.filter(c => c.changeType === 'ASSIGNED').length;
  const unassignedCount = pendingChanges.filter(c => c.changeType === 'UNASSIGNED').length;
  const reassignedCount = pendingChanges.filter(c => c.changeType === 'REASSIGNED').length;

  // ✅ Count changes that will be pinned (exclude unassigned)
  //const pinnableChanges = pendingChanges.filter(c => c.changeType !== 'UNASSIGNED').length;

  // Generate default label if empty
  const suggestedLabel = versionLabel ||
    `Manual Edit - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SaveIcon />
          Save Schedule Version
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Summary of Changes */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Changes Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip
              label={`${pendingChanges.length} total changes`}
              color="primary"
              size="small"
            />
            {assignedCount > 0 && (
              <Chip
                label={`${assignedCount} assigned`}
                color="success"
                size="small"
              />
            )}
            {unassignedCount > 0 && (
              <Chip
                label={`${unassignedCount} unassigned`}
                color="error"
                size="small"
              />
            )}
            {reassignedCount > 0 && (
              <Chip
                label={`${reassignedCount} reassigned`}
                color="info"
                size="small"
              />
            )}
          </Box>
        </Alert>

        {/* Version Label */}
        <TextField
          label="Version Label *"
          fullWidth
          value={versionLabel}
          onChange={(e) => setVersionLabel(e.target.value)}
          placeholder={suggestedLabel}
          helperText="Give this version a descriptive name"
          sx={{ mb: 2 }}
          autoFocus
          disabled={saving}
        />

        {/* Comment */}
        <TextField
          label="Comment (Optional)"
          fullWidth
          multiline
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe what changed and why..."
          helperText="Add details about this version"
          sx={{ mb: 2 }}
          disabled={saving}
        />

        {/* ✅ PIN CHECKBOX - NEW SECTION */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: pinAllChanges ? 'action.hover' : 'background.paper',
            transition: 'background-color 0.3s'
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={pinAllChanges}
                onChange={(e) => setPinAllChanges(e.target.checked)}
                disabled={saving}
                icon={<PinIcon />}
                checkedIcon={<PinIcon />}
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  Pin all current assignments
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pins ALL assignments in this schedule (not just your changes).
                  Solver will preserve these in future periods.
                </Typography>
              </Box>
            }
          />

          {pinAllChanges && (
            <Alert severity="info" sx={{ mt: 2 }} icon={<PinIcon />}>
              <Typography variant="body2">
                All current assignments in this schedule will be pinned.
                When generating future schedules, the solver will preserve these assignments.
              </Typography>
            </Alert>
          )}
        </Paper>

        <Divider sx={{ my: 2 }} />

        {/* Changes Preview */}
        <Typography variant="subtitle2" gutterBottom>
          Changes to Save ({pendingChanges.length})
        </Typography>
        <Box
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
          }}
        >
          {pendingChanges.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No changes to save
            </Typography>
          ) : (
            <List dense>
              {pendingChanges.map((change, index) => {
                const getChangeDescription = () => {
                  if (change.changeType === 'ASSIGNED') {
                    return `Assigned ${change.employee?.firstName} ${change.employee?.lastName || ''}`;
                  } else if (change.changeType === 'UNASSIGNED') {
                    return `Unassigned ${change.employee?.firstName} ${change.employee?.lastName || ''}`;
                  } else if (change.changeType === 'REASSIGNED') {
                    return `Reassigned from ${change.oldEmployee?.firstName || 'Unknown'} to ${change.newEmployee?.firstName || 'Unknown'}`;
                  }
                  return 'Unknown change';
                };

                // ✅ Show pin indicator
                //const willBePinned = pinAllChanges && change.changeType !== 'UNASSIGNED';

                return (
                  <ListItem key={index} divider={index < pendingChanges.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getChangeDescription()}
                          {/* {willBePinned && (
                            <PinIcon fontSize="small" color="action" />
                          )} */}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={change.changeType}
                            size="small"
                            color={
                              change.changeType === 'ASSIGNED' ? 'success' :
                                change.changeType === 'UNASSIGNED' ? 'error' : 'info'
                            }
                            sx={{ height: 18, fontSize: '0.7rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Shift ID: {change.shiftId || 'Unknown'}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Warning about no changes */}
        {pendingChanges.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }} icon={<WarningIcon />}>
            No changes detected. Make some changes before saving a new version.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || pendingChanges.length === 0 || !versionLabel.trim()}
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save Version'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}