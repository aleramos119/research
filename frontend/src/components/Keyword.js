import React from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@mui/material';

export default function Keyword({ label }) {
  return (
    <Chip
      component={Link}
      to={`/?q=${encodeURIComponent(label)}`}
      label={label}
      size="small"
      clickable
      sx={{
        bgcolor: 'grey.200',
        color: 'text.primary',
        fontWeight: 500,
        fontSize: '0.75rem',
        textDecoration: 'none',
        '&:hover': { bgcolor: 'grey.300' },
      }}
    />
  );
}
