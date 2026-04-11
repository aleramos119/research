import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
  Alert, Box, Button, Card, CardContent,
  CircularProgress, Container, TextField, Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Login failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="xs">
        <Box sx={{ pt: 10, pb: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Brand icon */}
          <Box sx={{
            width: 52, height: 52, borderRadius: '14px', mb: 2,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
          }}>
            <LockOutlinedIcon sx={{ color: 'white', fontSize: 24 }} />
          </Box>

          <Typography variant="h5" fontWeight={700} mb={0.5}>Welcome back</Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>Sign in to your ResearchHub account</Typography>

          <Card sx={{ width: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  name="username" label="Username"
                  value={form.username} onChange={handleChange}
                  required autoFocus fullWidth
                />
                <TextField
                  name="password" label="Password" type="password"
                  value={form.password} onChange={handleChange}
                  required fullWidth
                />
                <Button
                  type="submit" variant="contained" fullWidth
                  disabled={loading}
                  sx={{
                    mt: 0.5, py: 1.2,
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                    '&:hover': { boxShadow: '0 6px 20px rgba(37,99,235,0.45)' },
                  }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary" mt={3}>
            No account?{' '}
            <Typography component={Link} to="/register" variant="body2" color="primary" fontWeight={600} sx={{ textDecoration: 'none' }}>
              Create one
            </Typography>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
