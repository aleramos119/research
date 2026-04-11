import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import {
  Avatar, Box, Card, CardContent, Chip, CircularProgress,
  Container, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import ArticleIcon from '@mui/icons-material/Article';
import SchoolIcon from '@mui/icons-material/School';
import DownloadIcon from '@mui/icons-material/Download';

const TYPE_COLORS = {
  journal: 'primary', conference: 'secondary', book: 'success',
  chapter: 'success', thesis: 'warning', preprint: 'info', other: 'default',
};
const TYPE_LABELS = {
  journal: 'Journal', conference: 'Conference', book: 'Book',
  chapter: 'Chapter', thesis: 'Thesis', preprint: 'Preprint', other: 'Other',
};

function SectionLabel({ icon, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
      <Box sx={{ color: 'text.disabled' }}>{icon}</Box>
      <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1.2}>
        {label}
      </Typography>
    </Stack>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const res = await api.get(`/api/search/?q=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch {
      setResults(null);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(q), 300);
  };

  const noResults = results && results.users.length === 0 && results.publications.length === 0;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navbar />

      {/* ── Hero ── */}
      <Box
        sx={{
          background: 'linear-gradient(150deg, #eff6ff 0%, #f5f3ff 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 6, md: 9 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={800} letterSpacing="-0.03em" mb={1}>
            Discover research
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4}>
            Search millions of academic publications and researchers
          </Typography>
          <TextField
            fullWidth
            placeholder="Search authors or publications…"
            value={query}
            onChange={handleSearch}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searching
                    ? <CircularProgress size={18} />
                    : <SearchIcon sx={{ color: 'text.disabled' }} />
                  }
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 580, mx: 'auto',
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                borderRadius: 3,
                fontSize: '1rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: 'primary.main' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        </Container>
      </Box>

      {/* ── Results ── */}
      <Container maxWidth="md" sx={{ py: 5 }}>
        {noResults && (
          <Typography color="text.disabled" textAlign="center" mt={2}>
            No results for "{query}".
          </Typography>
        )}

        {results && !noResults && (
          <Stack spacing={5}>
            {/* Authors */}
            {results.users.length > 0 && (
              <Box>
                <SectionLabel icon={<PersonIcon fontSize="small" />} label="Authors" />
                <Stack spacing={1.5}>
                  {results.users.map((u) => (
                    <Card
                      key={u.id}
                      component={Link}
                      to={`/${u.username}`}
                      sx={{
                        textDecoration: 'none', display: 'block',
                        transition: 'box-shadow 0.15s, transform 0.15s',
                        '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
                      }}
                    >
                      <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontWeight: 700 }}>
                            {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                          </Avatar>
                          <Box flex={1} minWidth={0}>
                            <Typography variant="body1" fontWeight={600} color="text.primary">
                              {u.first_name || u.username} {u.last_name}
                              <Typography component="span" variant="body2" color="text.secondary" ml={1}>
                                @{u.username}
                              </Typography>
                            </Typography>
                            {u.university && (
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <SchoolIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.secondary">{u.university}</Typography>
                              </Stack>
                            )}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Publications */}
            {results.publications.length > 0 && (
              <Box>
                <SectionLabel icon={<ArticleIcon fontSize="small" />} label="Publications" />
                <Stack spacing={1.5}>
                  {results.publications.map((pub) => (
                    <Card
                      key={pub.id}
                      sx={{ transition: 'box-shadow 0.15s, transform 0.15s', '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' } }}
                    >
                      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                          <Box flex={1} minWidth={0}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
                              <Chip
                                label={TYPE_LABELS[pub.publication_type] || pub.publication_type}
                                color={TYPE_COLORS[pub.publication_type] || 'default'}
                                size="small"
                                sx={{ fontSize: '0.68rem', height: 20 }}
                              />
                              <Typography variant="caption" color="text.secondary">{pub.year}</Typography>
                              {pub.journal && <Typography variant="caption" color="text.secondary">· {pub.journal}</Typography>}
                            </Stack>

                            <Typography
                              component={Link}
                              to={`/publications/${pub.id}`}
                              variant="body1"
                              fontWeight={600}
                              color="text.primary"
                              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block', mb: 0.75 }}
                            >
                              {pub.title}
                            </Typography>

                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                              {pub.authors?.map((a) => (
                                <Chip
                                  key={a.id}
                                  component={Link}
                                  to={`/${a.username}`}
                                  label={`${a.first_name || a.username} ${a.last_name}`}
                                  size="small"
                                  clickable
                                  sx={{ fontSize: '0.72rem', bgcolor: '#eff6ff', color: 'primary.main', textDecoration: 'none' }}
                                />
                              ))}
                            </Stack>
                          </Box>

                          <Chip
                            component="a"
                            href={`/api/publications/${pub.id}/file/`}
                            target="_blank"
                            rel="noreferrer"
                            icon={<DownloadIcon sx={{ fontSize: '0.95rem !important' }} />}
                            label="PDF"
                            size="small"
                            clickable
                            color="primary"
                            variant="outlined"
                            sx={{ flexShrink: 0, textDecoration: 'none', fontWeight: 600 }}
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
