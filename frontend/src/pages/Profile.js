import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import {
  Avatar, Box, Button, Card, CardContent, Chip,
  Container, IconButton, Paper, Skeleton,
  Stack, Tooltip, Typography,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import ArticleIcon from '@mui/icons-material/Article';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import AuthorSmall from '../components/AuthorSmall';

const TYPE_LABELS = {
  journal: 'Journal', conference: 'Conference', book: 'Book',
  chapter: 'Chapter', thesis: 'Thesis', preprint: 'Preprint', other: 'Other',
};
const TYPE_COLORS = {
  journal: 'primary', conference: 'secondary', book: 'success',
  chapter: 'success', thesis: 'warning', preprint: 'info', other: 'default',
};

function StatCard({ value, label, icon }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1, minWidth: 90, p: 2, textAlign: 'center',
        border: '1px solid', borderColor: 'divider', borderRadius: 3,
      }}
    >
      {icon && <Box sx={{ color: 'primary.main', mb: 0.25, lineHeight: 1 }}>{icon}</Box>}
      <Typography variant="h4" fontWeight={800} color="text.primary">{value ?? 0}</Typography>
      <Typography variant="overline" color="text.secondary" fontSize="0.65rem" letterSpacing={1}>
        {label}
      </Typography>
    </Paper>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user: me, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [publications, setPublications] = useState([]);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isOwn = me?.username === username;

  useEffect(() => {
    setError('');
    setProfile(null);
    Promise.all([
      api.get(`/api/users/${username}/`),
      api.get(`/api/publications/?author=${username}`),
    ])
      .then(([profileRes, pubsRes]) => {
        setProfile(profileRes.data);
        setPublications(pubsRes.data.results ?? pubsRes.data);
      })
      .catch(() => setError('User not found.'));
  }, [username]);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch {
      setError('Could not delete account.');
      setDeleting(false);
    }
  };

  const handleDeletePublication = async (pub) => {
    const multipleAuthors = pub.authors && pub.authors.length > 1;
    const msg = multipleAuthors
      ? 'Remove yourself as an author of this publication?'
      : 'Delete this publication? This cannot be undone.';
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/api/publications/${pub.id}/`);
      setPublications((prev) => prev.filter((p) => p.id !== pub.id));
    } catch {
      setError('Could not delete publication.');
    }
  };

  const initials = profile
    ? ((profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')) || profile.username[0].toUpperCase()
    : '';

  // ── Loading skeleton ──
  if (!profile && !error) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 5 }}>
          <Card sx={{ mb: 3, overflow: 'visible' }}>
            <Skeleton variant="rectangular" height={90} sx={{ borderRadius: '12px 12px 0 0' }} />
            <CardContent sx={{ px: 4, pb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Skeleton variant="circular" width={88} height={88} sx={{ mt: -5 }} />
                <Box />
              </Stack>
              <Skeleton width="40%" height={32} sx={{ mt: 1 }} />
              <Skeleton width="22%" height={22} />
              <Skeleton width="50%" height={20} sx={{ mt: 0.5 }} />
            </CardContent>
          </Card>
          <Stack direction="row" spacing={2} mb={3}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ flex: 1, borderRadius: 3 }} />)}
          </Stack>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: 2 }} />)}
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
          <Typography color="error">{error}</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 5 }}>

        {/* ── Hero card ── */}
        <Card sx={{ mb: 3, overflow: 'visible' }}>
          <Box sx={{
            height: 90, borderRadius: '12px 12px 0 0',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          }} />
          <CardContent sx={{ px: 4, pb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Avatar
                src={profile.avatar_url || undefined}
                sx={{
                  width: 88, height: 88, mt: -5.5, mb: 1,
                  fontSize: '1.8rem', fontWeight: 800,
                  bgcolor: 'primary.dark',
                  border: '4px solid white',
                  boxShadow: 2,
                }}
              >
                {initials}
              </Avatar>

              {isOwn && (
                <Stack direction="row" spacing={1} mt={1}>
                  <Button
                    component={Link} to="/upload"
                    variant="contained" size="small"
                    startIcon={<UploadFileIcon />}
                    sx={{
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                    }}
                  >
                    Upload PDF
                  </Button>
                  <Button
                    variant="outlined" color="error" size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    sx={{ borderRadius: 2 }}
                  >
                    {deleting ? 'Deleting…' : 'Delete account'}
                  </Button>
                </Stack>
              )}
            </Stack>

            <Typography variant="h5" fontWeight={700}>
              {profile.first_name || profile.username} {profile.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={0.5}>@{profile.username}</Typography>

            {profile.university && (
              <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                <SchoolIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">{profile.university}</Typography>
              </Stack>
            )}
            {profile.bio && (
              <Typography variant="body2" color="text.primary" mt={1} sx={{ maxWidth: 560, lineHeight: 1.7 }}>
                {profile.bio}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* ── Stats ── */}
        <Stack direction="row" spacing={1.5} mb={4} flexWrap="wrap">
          <StatCard value={profile.pdfs_uploaded_count} label="Uploaded" />
          <StatCard value={profile.pdfs_authored_count} label="Authored" />
          <StatCard value={profile.total_citations} label="Citations" icon={<FormatQuoteIcon fontSize="small" />} />
          <StatCard value={profile.h_index} label="H-index" />
        </Stack>

        {/* ── Publications ── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={700}>Publications</Typography>
          <Typography variant="body2" color="text.secondary">{publications.length} total</Typography>
        </Stack>

        {publications.length === 0 ? (
          <Paper
            elevation={0}
            sx={{ p: 6, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}
          >
            <ArticleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" mb={isOwn ? 2 : 0}>No publications yet.</Typography>
            {isOwn && (
              <Button component={Link} to="/upload" variant="contained" size="small" sx={{ borderRadius: 2 }}>
                Upload your first PDF
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {publications.map((pub) => (
              <Card
                key={pub.id}
                sx={{ transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 3 } }}
              >
                <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box flex={1} minWidth={0}>
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

                      {pub.journal && (
                        <Typography variant="caption" color="text.secondary">{pub.journal}</Typography>
                      )}

                      {pub.authors?.length > 0 && (
                        <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.75}>
                          {pub.authors.map((a) => (
                            <AuthorSmall key={a.id} author={a} />
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
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
                      {isOwn && (
                        <Tooltip title={pub.authors?.length > 1 ? 'Remove my authorship' : 'Delete publication'}>
                          <IconButton size="small" color="error" onClick={() => handleDeletePublication(pub)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
