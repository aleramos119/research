import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Card, CardContent, Chip, IconButton,
  Stack, Tooltip, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import AuthorSmall from './AuthorSmall';

const TYPE_LABELS = {
  journal: 'Journal', conference: 'Conference', book: 'Book',
  chapter: 'Chapter', thesis: 'Thesis', preprint: 'Preprint', other: 'Other',
};
const TYPE_COLORS = {
  journal: 'primary', conference: 'secondary', book: 'success',
  chapter: 'success', thesis: 'warning', preprint: 'info', other: 'default',
};

export default function ArticleList({ pub, showActions = false, onDelete }) {
  return (
    <Card sx={{ transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 3 } }}>
      <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={0.5}>
              <Chip
                label={TYPE_LABELS[pub.publication_type] || pub.publication_type}
                color={TYPE_COLORS[pub.publication_type] || 'default'}
                size="small"
                sx={{ fontSize: '0.68rem', height: 20, fontWeight: 600 }}
              />
              <Typography variant="caption" color="text.secondary">{pub.year}</Typography>
              {pub.citations > 0 && (
                <Typography variant="caption" color="text.secondary">
                  · {pub.citations} citation{pub.citations !== 1 ? 's' : ''}
                </Typography>
              )}
            </Stack>

            <Typography
              component={Link}
              to={`/publications/${pub.id}`}
              variant="body1"
              fontWeight={600}
              color="text.primary"
              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block' }}
            >
              {pub.title}
            </Typography>

            {pub.authors?.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.75}>
                {pub.authors.map((a) => (
                  <AuthorSmall key={a.id} author={a} />
                ))}
              </Stack>
            )}
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} sx={{ ml: 'auto' }}>
            <Tooltip title="Download PDF">
              <IconButton
                component="a"
                href={`/api/publications/${pub.id}/file/`}
                target="_blank" rel="noreferrer"
                size="small" color="primary"
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {showActions && (
              <Tooltip title={pub.authors?.length > 1 ? 'Remove my authorship' : 'Delete publication'}>
                <IconButton size="small" color="error" onClick={() => onDelete?.(pub)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

        </Box>
      </CardContent>
    </Card>
  );
}
