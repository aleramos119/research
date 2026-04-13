import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export default function Abstract({ text, id }) {
  if (!text) return null;
  return (
    <Card id={id}>
      <CardContent sx={{ p: 3.5 }}>
        <Typography variant="h6" fontWeight={700} color="text.primary" display="block" mb={1.5}>
          Abstract
        </Typography>
        <Typography variant="body1" color="text.primary" lineHeight={1.8} sx={{ whiteSpace: 'pre-wrap' }}>
          {text}
        </Typography>
      </CardContent>
    </Card>
  );
}
