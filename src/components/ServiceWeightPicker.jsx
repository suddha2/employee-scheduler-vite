import {
  Box,
  Typography,
  Divider,
  Alert,
  Grid,
  Paper,
  TextField,
  IconButton,
  FormHelperText,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

export default function ServiceWeightPicker({
  serviceWeights,
  error,
  onWeightChange,
  onRemoveService,
}) {
  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Service Weights
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Services selected in "Preferred Services" above will appear here automatically. Set weight for each service (0-100, where 100 = dedicated).
        </Typography>

        {serviceWeights.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No services selected yet. Select services in "Preferred Services" field above.
          </Alert>
        ) : (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {serviceWeights.map((sw) => (
              <Grid item xs={12} md={6} key={sw.location}>
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ flexGrow: 1, fontWeight: 'medium' }}>
                    {sw.location}
                  </Typography>
                  <TextField
                    type="number"
                    label="Weight"
                    value={sw.weight}
                    onChange={(e) => onWeightChange(sw.location, e.target.value)}
                    inputProps={{ min: '0', max: '100', style: { width: '80px' } }}
                    size="small"
                    helperText={sw.weight === '100' ? 'Dedicated' : ''}
                  />
                  <IconButton
                    onClick={() => onRemoveService(sw.location)}
                    color="error"
                    size="small"
                    title="Remove service"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {error && (
          <FormHelperText error sx={{ mt: 2 }}>{error}</FormHelperText>
        )}
      </Box>
    </>
  );
}
