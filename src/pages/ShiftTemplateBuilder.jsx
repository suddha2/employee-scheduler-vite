import { Box, Paper, Typography, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ShiftTemplateGrid from '../components/ShiftTemplateGrid';

// Standalone "Bulk Create" page — the type × Mon–Sun grid for a whole service.
// The grid itself is the shared ShiftTemplateGrid component (also embedded as a
// toggle inside the create/edit form).
export default function ShiftTemplateBuilder() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 1250, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton onClick={() => navigate('/shift-templates')}><ArrowBackIcon /></IconButton>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>Service templates — grid</Typography>
        </Box>
        <ShiftTemplateGrid onSaved={() => { /* stay on the page so more edits can be made */ }} />
      </Paper>
    </Box>
  );
}
