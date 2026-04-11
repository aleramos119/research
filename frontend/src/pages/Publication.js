import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import {
  Alert, Box, Button, Card, CardContent, Chip,
  Container, Divider, Skeleton, Stack, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const TYPE_LABELS = {
  journal: 'Journal Article', conference: 'Conference Paper', book: 'Book',
  chapter: 'Book Chapter', thesis: 'Thesis', preprint: 'Preprint', other: 'Other',
};
const TYPE_COLORS = {
  journal: 'primary', conference: 'secondary', book: 'success',
  chapter: 'success', thesis: 'warning', preprint: 'info', other: 'default',
};

function MetaItem({ label, value }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="overline" color="text.disabled" fontSize="0.65rem" letterSpacing={1}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  );
}

export default function Publication() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pub, setPub] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/api/publications/${id}/`)
      .then((res) => setPub(res.data))
      .catch(() => setError('Publication not found.'));
  }, [id]);

  const handleDelete = async () => {
    const multipleAuthors = pub.authors && pub.authors.length > 1;
    const msg = multipleAuthors
      ? 'Remove yourself as an author of this publication?'
      : 'Delete this publication? This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/publications/${id}/`);
      navigate('/');
    } catch {
      setError('Could not delete publication.');
      setDeleting(false);
    }
  };

  // ── Loading ──
  if (!pub && !error) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 5 }}>
          <Skeleton width="60%" height={40} sx={{ mb: 1 }} />
          <Skeleton width="80%" height={60} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
        </Container>
      </Box>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 5 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        </Container>
      </Box>
    );
  }

  const isAuthor = pub.authors.some((a) => a.id === user?.id);
  const keywords = pub.keywords ? pub.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [];
  const metaItems = [
    { label: 'Journal / Conference', value: pub.journal },
    { label: 'Year', value: pub.year },
    { label: 'Volume', value: pub.volume ? `Vol. ${pub.volume}${pub.issue ? `, No. ${pub.issue}` : ''}` : null },
    { label: 'Pages', value: pub.pages ? `pp. ${pub.pages}` : null },
    { label: 'Publisher', value: pub.publisher },
  ].filter((m) => m.value);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Stack spacing={3}>

          {/* ── Header card ── */}
          <Card>
            {/* Accent bar */}
            <Box sx={{ height: 5, background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)' }} />
            <CardContent sx={{ p: 3.5 }}>

              {/* Type + citations */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Chip
                  label={TYPE_LABELS[pub.publication_type] || pub.publication_type}
                  color={TYPE_COLORS[pub.publication_type] || 'default'}
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                />
                {pub.citations > 0 && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <FormatQuoteIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {pub.citations} citation{pub.citations !== 1 ? 's' : ''}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {/* Title */}
              <Typography variant="h5" fontWeight={700} lineHeight={1.3} mb={2}>
                {pub.title}
              </Typography>

              {/* Authors */}
              <Stack direction="row" flexWrap="wrap" gap={0.75} mb={2}>
                {pub.authors.map((a) => (
                  <Chip
                    key={a.id}
                    component={Link}
                    to={`/${a.username}`}
                    label={`${a.first_name || a.username} ${a.last_name}`}
                    size="small"
                    clickable
                    sx={{ bgcolor: '#eff6ff', color: 'primary.main', fontWeight: 500, textDecoration: 'none', fontSize: '0.78rem' }}
                  />
                ))}
              </Stack>

              {/* Meta grid */}
              {metaItems.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={3} mb={2}>
                  {metaItems.map(({ label, value }) => (
                    <MetaItem key={label} label={label} value={value} />
                  ))}
                </Stack>
              )}

              {/* Identifiers */}
              {(pub.doi || pub.isbn || pub.url) && (
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  {pub.doi && (
                    <Typography variant="body2" color="text.secondary">
                      DOI:{' '}
                      <Typography
                        component="a"
                        href={`https://doi.org/${pub.doi}`}
                        target="_blank" rel="noreferrer"
                        variant="body2" color="primary"
                        sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {pub.doi}
                      </Typography>
                    </Typography>
                  )}
                  {pub.isbn && <Typography variant="body2" color="text.secondary">ISBN: {pub.isbn}</Typography>}
                  {pub.url && (
                    <Typography
                      component="a" href={pub.url} target="_blank" rel="noreferrer"
                      variant="body2" color="primary"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      External link <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* ── Abstract ── */}
          {pub.abstract && (
            <Card>
              <CardContent sx={{ p: 3.5 }}>
                <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1.2} display="block" mb={1.5}>
                  Abstract
                </Typography>
                <Typography variant="body1" color="text.primary" lineHeight={1.8} sx={{ whiteSpace: 'pre-wrap' }}>
                  {pub.abstract}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* ── Keywords ── */}
          {keywords.length > 0 && (
            <Card>
              <CardContent sx={{ p: 3.5 }}>
                <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1.2} display="block" mb={1.5}>
                  Keywords
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {keywords.map((k) => (
                    <Chip
                      key={k} label={k} size="small"
                      sx={{ bgcolor: 'grey.100', color: 'text.primary', fontWeight: 500 }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* ── Actions ── */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {pub.pdf && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                component="a"
                href={`/api/publications/${pub.id}/file/`}
                target="_blank" rel="noreferrer"
                sx={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(37,99,235,0.4)' },
                }}
              >
                Download PDF
              </Button>
            )}
            {isAuthor && (
              <Button
                variant="outlined" color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Removing…' : pub.authors.length > 1 ? 'Remove my authorship' : 'Delete publication'}
              </Button>
            )}
          </Stack>

          {/* ── Footer ── */}
          <Divider />
          <Typography variant="caption" color="text.disabled">
            Uploaded by{' '}
            {pub.uploaded_by
              ? <Typography component={Link} to={`/${pub.uploaded_by.username}`} variant="caption" color="primary" sx={{ textDecoration: 'none' }}>@{pub.uploaded_by.username}</Typography>
              : 'a deleted user'
            }
            {pub.created_at && ` · ${new Date(pub.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
          </Typography>

        </Stack>
      </Container>
    </Box>
  );
}
