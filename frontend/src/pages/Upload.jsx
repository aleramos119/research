import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { SUBJECTS, SUBJECT_GROUPS } from "../constants/subjects";
import { PUBLICATION_TAGS, RELATIONAL_TAGS } from "../constants/tags";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  LinearProgress,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const PUBLICATION_TYPES = [
  ["journal", "Journal Article"],
  ["conference", "Conference Paper"],
  ["book", "Book"],
  ["chapter", "Book Chapter"],
  ["thesis", "Thesis"],
  ["preprint", "Preprint"],
  ["other", "Other"],
];

function SectionHeading({ children }) {
  return (
    <Typography
      variant="overline"
      fontWeight={700}
      color="text.secondary"
      letterSpacing={1.2}
      display="block"
      mb={1.5}
    >
      {children}
    </Typography>
  );
}

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    abstract: "",
    publication_type: "journal",
    subject: "",
    journal: "",
    year: new Date().getFullYear(),
    doi: "",
    keywords: "",
  });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  const [dupWarning, setDupWarning] = useState(null);

  const [authorQuery, setAuthorQuery] = useState("");
  const [authorSuggestions, setAuthorSuggestions] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const debounceRef = useRef(null);

  // tags: [{tag: string, refers_to: number|null, refers_to_title: string}]
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState({});
  const [tagSearchResults, setTagSearchResults] = useState({});
  const tagDebounceRef = useRef({});

  const toggleTag = (tagValue) => {
    setSelectedTags((prev) => {
      const exists = prev.find((t) => t.tag === tagValue);
      if (exists) {
        setTagSearch((s) => {
          const n = { ...s };
          delete n[tagValue];
          return n;
        });
        setTagSearchResults((s) => {
          const n = { ...s };
          delete n[tagValue];
          return n;
        });
        return prev.filter((t) => t.tag !== tagValue);
      }
      return [...prev, { tag: tagValue, refers_to: null, refers_to_title: "" }];
    });
  };

  const handleTagSearch = (tagValue, q) => {
    setTagSearch((s) => ({ ...s, [tagValue]: q }));
    clearTimeout(tagDebounceRef.current[tagValue]);
    if (!q.trim()) {
      setTagSearchResults((s) => ({ ...s, [tagValue]: [] }));
      return;
    }
    tagDebounceRef.current[tagValue] = setTimeout(async () => {
      try {
        const res = await api.get(`/api/search/?q=${encodeURIComponent(q)}`);
        setTagSearchResults((s) => ({
          ...s,
          [tagValue]: res.data.publications || [],
        }));
      } catch {
        setTagSearchResults((s) => ({ ...s, [tagValue]: [] }));
      }
    }, 300);
  };

  const selectTagReference = (tagValue, pub) => {
    setSelectedTags((prev) =>
      prev.map((t) =>
        t.tag === tagValue
          ? { ...t, refers_to: pub.id, refers_to_title: pub.title }
          : t,
      ),
    );
    setTagSearch((s) => ({ ...s, [tagValue]: "" }));
    setTagSearchResults((s) => ({ ...s, [tagValue]: [] }));
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleAuthorSearch = (e) => {
    const q = e.target.value;
    setAuthorQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setAuthorSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/search/?q=${encodeURIComponent(q)}`);
        const already = new Set(selectedAuthors.map((a) => a.id));
        setAuthorSuggestions(
          (res.data.users || []).filter(
            (u) => u.id !== user?.id && !already.has(u.id),
          ),
        );
      } catch {
        setAuthorSuggestions([]);
      }
    }, 300);
  };

  const addAuthor = (author) => {
    setSelectedAuthors((prev) => [...prev, author]);
    setAuthorQuery("");
    setAuthorSuggestions([]);
  };

  const doUpload = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    data.append("pdf", file);
    selectedAuthors.forEach((a) => data.append("author_ids", a.id));
    data.append(
      "tags",
      JSON.stringify(
        selectedTags.map(({ tag, refers_to }) => ({ tag, refers_to })),
      ),
    );

    setUploading(true);
    try {
      await api.post("/api/publications/", data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      navigate(`/${user.username}`);
    } catch (err) {
      const d = err.response?.data;
      if (err.response?.status === 413) setError("File too large (max 20 MB).");
      else if (d && typeof d === "object") {
        setFieldErrors(d);
        if (d.pdf) setError(Array.isArray(d.pdf) ? d.pdf[0] : d.pdf);
      } else setError("Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    if (form.title.trim() || form.doi.trim()) {
      try {
        const params = new URLSearchParams();
        if (form.title.trim()) params.set("title", form.title.trim());
        if (form.doi.trim()) params.set("doi", form.doi.trim());
        const res = await api.get(
          `/api/publications/check-duplicate/?${params}`,
        );
        if (res.data.duplicates?.length > 0) {
          setDupWarning(res.data.duplicates);
          return;
        }
      } catch {
        // ignore check failure and proceed
      }
    }

    await doUpload();
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* Page header */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={4}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UploadFileIcon sx={{ color: "white", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Upload publication
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a new paper to your profile
            </Typography>
          </Box>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

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
                    <input
                      type="file"
                      accept=".pdf"
                      hidden
                      onChange={(e) => setFile(e.target.files[0] || null)}
                    />
                  </Button>
                  <Typography
                    variant="body2"
                    color={file ? "text.primary" : "text.secondary"}
                    fontWeight={file ? 500 : 400}
                  >
                    {file ? file.name : "No file selected"}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* ── Publication details ── */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading>Publication details</SectionHeading>
                <Stack spacing={2}>
                  <TextField
                    name="title"
                    label="Title *"
                    value={form.title}
                    onChange={handleChange}
                    required
                    fullWidth
                    error={!!fieldErrors.title}
                    helperText={fieldErrors.title}
                  />
                  <TextField
                    name="publication_type"
                    label="Type"
                    value={form.publication_type}
                    onChange={handleChange}
                    select
                    fullWidth
                  >
                    {PUBLICATION_TYPES.map(([val, label]) => (
                      <MenuItem key={val} value={val}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    name="subject"
                    label="Subject"
                    value={form.subject}
                    onChange={handleChange}
                    select
                    fullWidth
                    SelectProps={{
                      MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
                    }}
                  >
                    <MenuItem value="">— None —</MenuItem>
                    {SUBJECT_GROUPS.map((group) => [
                      <ListSubheader key={group}>{group}</ListSubheader>,
                      ...SUBJECTS.filter((s) => s.group === group).map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.label}
                        </MenuItem>
                      )),
                    ])}
                  </TextField>
                  <TextField
                    name="year"
                    label="Year *"
                    type="number"
                    value={form.year}
                    onChange={handleChange}
                    required
                    fullWidth
                    inputProps={{ min: 1900, max: 2100 }}
                    error={!!fieldErrors.year}
                    helperText={fieldErrors.year}
                  />
                  <TextField
                    name="journal"
                    label="Journal / Conference"
                    value={form.journal}
                    onChange={handleChange}
                    fullWidth
                  />
                  <TextField
                    name="doi"
                    label="DOI"
                    value={form.doi}
                    onChange={handleChange}
                    fullWidth
                    placeholder="10.xxxx/..."
                  />
                  <TextField
                    name="keywords"
                    label="Keywords (comma-separated)"
                    value={form.keywords}
                    onChange={handleChange}
                    fullWidth
                  />
                  <TextField
                    name="abstract"
                    label="Abstract"
                    value={form.abstract}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    rows={5}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* ── Co-authors ── */}
            <Card sx={{ overflow: "visible" }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading>Co-authors</SectionHeading>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  You are automatically listed as an author. Search to add
                  co-authors.
                </Typography>

                {selectedAuthors.length > 0 && (
                  <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                    {selectedAuthors.map((a) => (
                      <Chip
                        key={a.id}
                        label={`${a.first_name || a.username} ${a.last_name}`}
                        onDelete={() =>
                          setSelectedAuthors((prev) =>
                            prev.filter((x) => x.id !== a.id),
                          )
                        }
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Stack>
                )}

                <Box sx={{ position: "relative" }}>
                  <TextField
                    fullWidth
                    placeholder="Search by name or username…"
                    value={authorQuery}
                    onChange={handleAuthorSearch}
                    autoComplete="off"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            sx={{ color: "text.disabled", fontSize: 18 }}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {authorSuggestions.length > 0 && (
                    <Card
                      sx={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        maxHeight: 220,
                        overflowY: "auto",
                        border: "1px solid",
                        borderColor: "divider",
                        boxShadow: 3,
                      }}
                    >
                      {authorSuggestions.map((u) => (
                        <Box
                          key={u.id}
                          onClick={() => addAuthor(u)}
                          sx={{
                            px: 2,
                            py: 1.25,
                            cursor: "pointer",
                            "&:hover": { bgcolor: "grey.50" },
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            "&:last-child": { borderBottom: "none" },
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <PersonAddIcon
                              sx={{ fontSize: 16, color: "text.disabled" }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {u.first_name || u.username} {u.last_name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                @{u.username}
                                {u.university ? ` · ${u.university}` : ""}
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

            {/* ── Tags ── */}
            <Card sx={{ overflow: "visible" }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeading>Tags</SectionHeading>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Select all that apply. Relational tags (Rebuttal, Replication,
                  Retraction, Correction) let you link to the paper being
                  referenced.
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                  {PUBLICATION_TAGS.map(({ value, label }) => {
                    const active = selectedTags.some((t) => t.tag === value);
                    return (
                      <Chip
                        key={value}
                        label={label}
                        onClick={() => toggleTag(value)}
                        color={active ? "primary" : "default"}
                        variant={active ? "filled" : "outlined"}
                        size="small"
                        sx={{ cursor: "pointer" }}
                      />
                    );
                  })}
                </Stack>

                {selectedTags
                  .filter((t) => RELATIONAL_TAGS.has(t.tag))
                  .map(({ tag, refers_to, refers_to_title }) => (
                    <Box key={tag} sx={{ mb: 2, position: "relative" }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        mb={0.5}
                        fontWeight={600}
                      >
                        {PUBLICATION_TAGS.find((t) => t.value === tag)?.label} —
                        link to referenced paper
                      </Typography>
                      {refers_to ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            variant="body2"
                            sx={{
                              flex: 1,
                              bgcolor: "grey.50",
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1,
                              px: 1.5,
                              py: 0.75,
                            }}
                          >
                            {refers_to_title}
                          </Typography>
                          <Chip
                            label="Clear"
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setSelectedTags((prev) =>
                                prev.map((t) =>
                                  t.tag === tag
                                    ? {
                                        ...t,
                                        refers_to: null,
                                        refers_to_title: "",
                                      }
                                    : t,
                                ),
                              )
                            }
                          />
                        </Stack>
                      ) : (
                        <>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Search publication by title…"
                            value={tagSearch[tag] || ""}
                            onChange={(e) =>
                              handleTagSearch(tag, e.target.value)
                            }
                            autoComplete="off"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon
                                    sx={{
                                      color: "text.disabled",
                                      fontSize: 18,
                                    }}
                                  />
                                </InputAdornment>
                              ),
                            }}
                          />
                          {tagSearchResults[tag]?.length > 0 && (
                            <Card
                              sx={{
                                position: "absolute",
                                top: "calc(100% + 4px)",
                                left: 0,
                                right: 0,
                                zIndex: 10,
                                maxHeight: 200,
                                overflowY: "auto",
                                border: "1px solid",
                                borderColor: "divider",
                                boxShadow: 3,
                              }}
                            >
                              {tagSearchResults[tag].map((pub) => (
                                <Box
                                  key={pub.id}
                                  onClick={() => selectTagReference(tag, pub)}
                                  sx={{
                                    px: 2,
                                    py: 1,
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: "grey.50" },
                                    borderBottom: "1px solid",
                                    borderColor: "divider",
                                    "&:last-child": { borderBottom: "none" },
                                  }}
                                >
                                  <Typography variant="body2" fontWeight={600}>
                                    {pub.title}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {pub.year}
                                    {pub.authors?.length > 0 &&
                                      ` · ${pub.authors
                                        .map((a) => a.first_name || a.username)
                                        .join(", ")}`}
                                  </Typography>
                                </Box>
                              ))}
                            </Card>
                          )}
                        </>
                      )}
                    </Box>
                  ))}
              </CardContent>
            </Card>

            {/* Upload progress */}
            {uploading && (
              <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Uploading…
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {progress}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ borderRadius: 1 }}
                />
              </Box>
            )}

            <Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={uploading}
                startIcon={
                  uploading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <UploadFileIcon />
                  )
                }
                sx={{
                  px: 4,
                  background:
                    "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                  "&:hover": { boxShadow: "0 6px 20px rgba(37,99,235,0.45)" },
                }}
              >
                {uploading ? "Uploading…" : "Upload publication"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Container>

      {/* ── Duplicate warning dialog ── */}
      <Dialog
        open={!!dupWarning}
        onClose={() => setDupWarning(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon sx={{ color: "warning.main" }} />
          Similar publication already exists
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The following publication{dupWarning?.length > 1 ? "s" : ""} in the
            system
            {dupWarning?.length > 1 ? " match" : " matches"} the title or DOI
            you entered. Are you sure you want to upload a new one?
          </Alert>
          <Stack spacing={1.5}>
            {dupWarning?.map((pub) => (
              <Card key={pub.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent
                  sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}
                >
                  <Typography
                    component={Link}
                    to={`/publications/${pub.id}`}
                    variant="body2"
                    fontWeight={600}
                    color="primary"
                    sx={{
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {pub.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mt={0.25}
                  >
                    {pub.year}
                    {pub.authors?.length > 0 &&
                      ` · ${pub.authors
                        .map((a) => a.first_name || a.username)
                        .join(", ")}`}
                    {pub.doi && ` · DOI: ${pub.doi}`}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDupWarning(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<UploadFileIcon />}
            onClick={() => {
              setDupWarning(null);
              doUpload();
            }}
          >
            Upload anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
