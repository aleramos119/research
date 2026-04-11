import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Grid, InputAdornment, LinearProgress, MenuItem,
  Stack, TextField, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const PUBLICATION_TYPES = [
  ['journal', 'Journal Article'],
  ['conference', 'Conference Paper'],
  ['book', 'Book'],
  ['chapter', 'Book Chapter'],
  ['thesis', 'Thesis'],
  ['preprint', 'Preprint'],
  ['other', 'Other'],
];

function SectionHeading({ children }) {
  return (
    <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1.2} display="block" mb={1.5}>
      {children}
    </Typography>
  );
}

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', abstract: '', publication_type: 'journal',
    journal: '', year: new Date().getFullYear(), doi: '', keywords: '',
  });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  const [authorQuery, setAuthorQuery] = useState('');
  const [authorSuggestions, setAuthorSuggestions] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const debounceRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAuthorSearch = (e) => {
    const q = e.target.value;
    setAuthorQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setAuthorSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/search/?q=${encodeURIComponent(q)}`);
        const already = new Set(selectedAuthors.map((a) => a.id));
        setAuthorSuggestions(
          (res.data.users || []).filter((u) => u.id !== user?.id && !already.has(u.id))
        );
      } catch {
        setAuthorSuggestions([]);
      }
    }, 300);
  };

  const addAuthor = (author) => {
    setSelectedAuthors((prev) => [...prev, author]);
    setAuthorQuery('');
    setAuthorSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    if (!file) { setError('Please select a PDF file.'); return; }

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    data.append('pdf', file);
    selectedAuthors.forEach((a) => data.append('author_ids', a.id));

    setUploading(true);
    try {
      await api.post('/api/publications/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      navigate(`/${user.username}`);
    } catch (err) {
      const d = err.response?.data;
      if (err.response?.status === 413) setError('File too large (max 20 MB).');
      else if (d && typeof d === 'object') {
        setFieldErrors(d);
        if (d.pdf) setError(Array.isArray(d.pdf) ? d.pdf[0] : d.pdf);
      } else setError('Upload failed.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 5 }}>

        {/* Page header */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UploadFileIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Upload publication</Typography>
            <Typography variant="body2" color="text.secondary">Add a new paper to your profile</Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>

            {/* ── PDF file ── */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading>PDF file *</SectionHeading>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    sx={{ borderRadius: 2, flexShrink: 0 }}
                  >
                    Choose file
                    <input type="file" accept=".pdf" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
                  </Button>
                  <Typography variant="body2" color={file ? 'text.primary' : 'text.secondary'} fontWeight={file ? 500 : 400}>
                    {file ? file.name : 'No file selected'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* ── Publication details ── */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading>Publication details</SectionHeading>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      name="title" label="Title *" value={form.title} onChange={handleChange}
                      required fullWidth
                      error={!!fieldErrors.title} helperText={fieldErrors.title}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="publication_type" label="Type" value={form.publication_type}
                      onChange={handleChange} select fullWidth
                    >
                      {PUBLICATION_TYPES.map(([val, label]) => (
                        <MenuItem key={val} value={val}>{label}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="year" label="Year *" type="number" value={form.year}
                      onChange={handleChange} required fullWidth
                      inputProps={{ min: 1900, max: 2100 }}
                      error={!!fieldErrors.year} helperText={fieldErrors.year}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      name="journal" label="Journal / Conference" value={form.journal}
                      onChange={handleChange} fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="doi" label="DOI" value={form.doi} onChange={handleChange}
                      fullWidth placeholder="10.xxxx/..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="keywords" label="Keywords (comma-separated)" value={form.keywords}
                      onChange={handleChange} fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="abstract" label="Abstract" value={form.abstract}
                      onChange={handleChange} fullWidth multiline rows={5}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* ── Co-authors ── */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading>Co-authors</SectionHeading>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  You are automatically listed as an author. Search to add co-authors.
                </Typography>

                {selectedAuthors.length > 0 && (
                  <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                    {selectedAuthors.map((a) => (
                      <Chip
                        key={a.id}
                        label={`${a.first_name || a.username} ${a.last_name}`}
                        onDelete={() => setSelectedAuthors((prev) => prev.filter((x) => x.id !== a.id))}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Stack>
                )}

                <Box sx={{ position: 'relative' }}>
                  <TextField
                    fullWidth
                    placeholder="Search by name or username…"
                    value={authorQuery}
                    onChange={handleAuthorSearch}
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {authorSuggestions.length > 0 && (
                    <Card sx={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      zIndex: 10, maxHeight: 220, overflowY: 'auto', border: '1px solid',
                      borderColor: 'divider', boxShadow: 3,
                    }}>
                      {authorSuggestions.map((u) => (
                        <Box
                          key={u.id}
                          onClick={() => addAuthor(u)}
                          sx={{
                            px: 2, py: 1.25, cursor: 'pointer',
                            '&:hover': { bgcolor: 'grey.50' },
                            borderBottom: '1px solid', borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <PersonAddIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {u.first_name || u.username} {u.last_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                @{u.username}{u.university ? ` · ${u.university}` : ''}
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                    </Card>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Upload progress */}
            {uploading && (
              <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">Uploading…</Typography>
                  <Typography variant="caption" color="text.secondary">{progress}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            <Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
                sx={{
                  px: 4,
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(37,99,235,0.45)' },
                }}
              >
                {uploading ? 'Uploading…' : 'Upload publication'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
