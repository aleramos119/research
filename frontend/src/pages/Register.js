import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  Container, Grid, TextField, Typography,
} from '@mui/material';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    first_name: '', last_name: '', university: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') setFieldErrors(data);
      else setError('Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const tf = (name, label, type = 'text', required = false, half = false) => (
    <Grid item xs={12} sm={half ? 6 : 12} key={name}>
      <TextField
        name={name} label={`${label}${required ? ' *' : ''}`} type={type}
        value={form[name]} onChange={handleChange}
        required={required}
        error={!!fieldErrors[name]}
        helperText={Array.isArray(fieldErrors[name]) ? fieldErrors[name][0] : fieldErrors[name]}
        fullWidth
      />
    </Grid>
  );

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="sm">
        <Box sx={{ pt: 8, pb: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          <Box sx={{
            width: 52, height: 52, borderRadius: '14px', mb: 2,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
          }}>
            <AutoStoriesOutlinedIcon sx={{ color: 'white', fontSize: 24 }} />
          </Box>

          <Typography variant="h5" fontWeight={700} mb={0.5}>Create your account</Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>Join the ResearchHub community</Typography>

          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  {tf('username', 'Username', 'text', true)}
                  {tf('email', 'Email', 'email')}
                  {tf('password', 'Password', 'password', true)}
                  {tf('first_name', 'First name', 'text', false, true)}
                  {tf('last_name', 'Last name', 'text', false, true)}
                  {tf('university', 'University / affiliation')}
                  <Grid item xs={12}>
                    <Button
                      type="submit" variant="contained" fullWidth
                      disabled={loading}
                      sx={{
                        py: 1.2,
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                        boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                        '&:hover': { boxShadow: '0 6px 20px rgba(37,99,235,0.45)' },
                      }}
                    >
                      {loading ? <CircularProgress size={20} color="inherit" /> : 'Create account'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary" mt={3}>
            Already have an account?{' '}
            <Typography component={Link} to="/login" variant="body2" color="primary" fontWeight={600} sx={{ textDecoration: 'none' }}>
              Sign in
            </Typography>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
