import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  Restore as RestoreIcon,
  Compare as CompareIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../api/endpoint';

export default function VersionHistorySidebar({
  scheduleId,
  open,
  onClose,
  onVersionSelect,
  currentVersionId,
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackLoading, setRollbackLoading] = useState(false);

  useEffect(() => {
    if (open && scheduleId) {
      loadVersionHistory();
    }
  }, [open, scheduleId]);

  const loadVersionHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.scheduleVersions}/${scheduleId}/versions`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setVersions(response.data.versions || []);
    } catch (err) {
      console.error('Failed to load version history:', err);
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version) => {
    setSelectedVersion(version);
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };

  const handleRollback = async () => {
    if (!selectedVersion) return;

    setRollbackLoading(true);
    try {
      const response = await axiosInstance.post(
        `${API_ENDPOINTS.scheduleVersions}/${scheduleId}/versions/${selectedVersion.versionId}/rollback`,
        {
          reason: rollbackReason || 'Manual rollback',
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      // Reload version history
      await loadVersionHistory();
      
      // Select the new version (rollback creates a new version)
      if (response.data && response.data.version) {
        onVersionSelect(response.data.version);
      }

      setRollbackDialogOpen(false);
      setRollbackReason('');
    } catch (err) {
      console.error('Rollback failed:', err);
      setError('Rollback failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setRollbackLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              <Typography variant="h6">Version History</Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Version List */}
          {!loading && !error && (
            <>
              {versions.length === 0 ? (
                <Alert severity="info">
                  No versions saved yet. Save your first version to enable version history.
                </Alert>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {versions.length} version{versions.length !== 1 ? 's' : ''} found
                  </Typography>

                  <List sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
                    {versions.map((version) => (
                      <React.Fragment key={version.versionId}>
                        <ListItem
                          disablePadding
                          sx={{
                            border: version.versionId === currentVersionId ? 2 : 1,
                            borderColor: version.versionId === currentVersionId ? 'primary.main' : 'divider',
                            borderRadius: 1,
                            mb: 1,
                            backgroundColor: version.isCurrent ? 'action.selected' : 'background.paper',
                          }}
                        >
                          <ListItemButton
                            onClick={() => handleVersionClick(version)}
                            selected={version.versionId === selectedVersion?.versionId}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle1">
                                    {version.versionLabel || `Version ${version.versionNumber}`}
                                  </Typography>
                                  {version.isCurrent && (
                                    <Chip
                                      label="Current"
                                      size="small"
                                      color="success"
                                      icon={<CheckCircleIcon />}
                                      sx={{ height: 20 }}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" display="block">
                                    Version #{version.versionNumber}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {formatDate(version.createdAt)} by {version.createdBy}
                                  </Typography>
                                  {version.comment && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                      "{version.comment}"
                                    </Typography>
                                  )}
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Chip
                                      label={`${version.totalAssignments || 0} assignments`}
                                      size="small"
                                      variant="outlined"
                                    />
                                    {version.changesFromPrevious > 0 && (
                                      <Chip
                                        label={`${version.changesFromPrevious} changes`}
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                      />
                                    )}
                                  </Box>
                                </Box>
                              }
                            />
                          </ListItemButton>
                        </ListItem>

                        {/* Action Buttons for Selected Version */}
                        {version.versionId === selectedVersion?.versionId && !version.isCurrent && (
                          <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1 }}>
                            <Tooltip title="Rollback to this version (creates a new version)">
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<RestoreIcon />}
                                onClick={() => setRollbackDialogOpen(true)}
                                fullWidth
                              >
                                Rollback
                              </Button>
                            </Tooltip>
                          </Box>
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                </>
              )}
            </>
          )}

          {/* Reload Button */}
          {!loading && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={loadVersionHistory}
                disabled={loading}
              >
                Reload History
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Rollback Confirmation Dialog */}
      <Dialog
        open={rollbackDialogOpen}
        onClose={() => setRollbackDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Rollback</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to rollback to version{' '}
            <strong>{selectedVersion?.versionNumber}</strong>
            {' '}({selectedVersion?.versionLabel})?
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            This will create a new version with the state from version{' '}
            {selectedVersion?.versionNumber}. The current state will not be lost.
          </DialogContentText>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" gutterBottom>
              Reason (optional):
            </Typography>
            <input
              type="text"
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="Why are you rolling back?"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialogOpen(false)} disabled={rollbackLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRollback}
            variant="contained"
            color="primary"
            disabled={rollbackLoading}
            startIcon={rollbackLoading ? <CircularProgress size={16} /> : <RestoreIcon />}
          >
            {rollbackLoading ? 'Rolling back...' : 'Rollback'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}