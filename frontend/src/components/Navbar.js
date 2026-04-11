import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar, Avatar, Box, Button, Chip, Toolbar, Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar sx={{ maxWidth: 960, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 }, minHeight: 56 }}>
        <Typography
          component={Link}
          to="/"
          variant="h6"
          fontWeight={800}
          letterSpacing="-0.5px"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ResearchHub
        </Typography>

        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              component={Link}
              to={`/${user.username}`}
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24, fontSize: '0.7rem', fontWeight: 700 }}>
                  {user.username[0].toUpperCase()}
                </Avatar>
              }
              label={user.username}
              clickable
              size="small"
              sx={{ textDecoration: 'none', fontWeight: 500, bgcolor: 'grey.100' }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<LogoutIcon sx={{ fontSize: '1rem !important' }} />}
              onClick={handleLogout}
              sx={{ borderRadius: 2, fontSize: '0.8rem', px: 1.5, py: 0.5, color: 'text.secondary', borderColor: 'divider' }}
            >
              Sign out
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
