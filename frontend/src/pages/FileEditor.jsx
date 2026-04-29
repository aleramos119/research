import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getFileContent,
  getProject,
  parseTexMetadata,
  publishTex,
  saveFileContent,
} from "../api/projects";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import AIAssistant from "../components/AIAssistant";
import { SUBJECTS, SUBJECT_GROUPS } from "../constants/subjects";
import { PUBLICATION_TAGS, RELATIONAL_TAGS } from "../constants/tags";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PublishIcon from "@mui/icons-material/Publish";
import SaveIcon from "@mui/icons-material/Save";
import SmartToyIcon from "@mui/icons-material/SmartToy";

const PUB_TYPES = [
  { value: "preprint", label: "Preprint" },
  { value: "journal", label: "Journal Article" },
  { value: "conference", label: "Conference Paper" },
  { value: "thesis", label: "Thesis" },
  { value: "book", label: "Book" },
  { value: "chapter", label: "Book Chapter" },
  { value: "other", label: "Other" },
];

const isLatex = (name) => typeof name === "string" && name.endsWith(".tex");

export default function FileEditor() {
  const { projectId, fileId } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [fileName, setFileName] = useState("");
  const [isOwn, setIsOwn] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);

  // Publish dialog state
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMetaLoading, setPublishMetaLoading] = useState(false);
  const [publishMeta, setPublishMeta] = useState(null);
  const [publishForm, setPublishForm] = useState({});
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishedPub, setPublishedPub] = useState(null);
  const [dupWarning, setDupWarning] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState({});
  const [tagSearchResults, setTagSearchResults] = useState({});
  const tagDebounceRef = useRef({});

  // PDF preview state
  const [pdfUrl, setPdfUrl] = useState(null);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");
  const prevPdfUrl = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get(`/api/project-files/${fileId}/`),
      getFileContent(fileId),
      getProject(projectId),
    ])
      .then(([metaRes, contentRes, projectRes]) => {
        setFileName(metaRes.data.original_filename);
        setContent(contentRes.data.content);
        setIsOwn(me && projectRes.data.user === me.id);
      })
      .catch((err) => {
        if (err.response?.status === 400) {
          setError("This file is not a text file and cannot be edited.");
        } else {
          setError("Could not load file.");
        }
      })
      .finally(() => setLoading(false));
  }, [fileId, projectId, me]);

  // Revoke old blob URL when replaced
  useEffect(() => {
    return () => {
      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
    };
  }, []);

  const compile = useCallback(async () => {
    setCompiling(true);
    setCompileError("");
    try {
      const res = await api.post(
        `/api/project-files/${fileId}/compile/`,
        {},
        { responseType: "blob" },
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
      prevPdfUrl.current = url;
      setPdfUrl(url);
    } catch (err) {
      const text = await err.response?.data?.text?.();
      let msg = "Compilation failed.";
      try {
        const json = JSON.parse(text);
        msg = json.detail || msg;
      } catch {
        // ignore
      }
      setCompileError(msg);
    } finally {
      setCompiling(false);
    }
  }, [fileId]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveFileContent(fileId, content);
      setDirty(false);
      if (isLatex(fileName)) {
        compile();
      }
    } catch {
      setError("Could not save file.");
    } finally {
      setSaving(false);
    }
  }, [fileId, content, saving, fileName, compile]);

  // Ctrl/Cmd + S to save
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

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

  const handleOpenPublish = async () => {
    setPublishOpen(true);
    setPublishMeta(null);
    setPublishedPub(null);
    setPublishError("");
    setDupWarning(null);
    setSelectedTags([]);
    setTagSearch({});
    setTagSearchResults({});
    setPublishMetaLoading(true);
    try {
      const res = await parseTexMetadata(fileId);
      setPublishMeta(res.data);
      setPublishForm({
        title: res.data.title,
        abstract: res.data.abstract,
        year: res.data.year,
        publication_type: "preprint",
        subject: "",
        author_ids: res.data.authors
          .filter((a) => a.user)
          .map((a) => a.user.id),
        external_author_names: res.data.authors
          .filter((a) => !a.user)
          .map((a) => a.name),
      });
    } catch {
      setPublishError("Could not parse metadata from the .tex file.");
    } finally {
      setPublishMetaLoading(false);
    }
  };

  const handlePublish = async (force = false) => {
    setPublishError("");

    if (!force && publishForm.title?.trim()) {
      try {
        const params = new URLSearchParams({ title: publishForm.title.trim() });
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

    setDupWarning(null);
    setPublishing(true);
    try {
      const payload = {
        ...publishForm,
        tags: JSON.stringify(
          selectedTags.map(({ tag, refers_to }) => ({ tag, refers_to })),
        ),
      };
      const res = await publishTex(fileId, payload);
      setPublishedPub(res.data);
    } catch (err) {
      setPublishError(
        err.response?.data?.detail ||
          "Could not publish. Check compilation logs.",
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Box sx={{ p: 5 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/projects/${projectId}`)}
            sx={{ mb: 2, color: "text.secondary" }}
          >
            Back to project
          </Button>
          <Typography color="error">{error}</Typography>
        </Box>
      </Box>
    );
  }

  const showPreview = isLatex(fileName);

  return (
    <Box
      sx={{
        bgcolor: "background.default",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />

      {/* Toolbar */}
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          px: 3,
          py: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/projects/${projectId}`)}
            size="small"
            sx={{
              color: "text.secondary",
              minWidth: 0,
              "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.5 } },
            }}
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Back
            </Box>
          </Button>

          <Typography
            variant="body2"
            fontWeight={600}
            color="text.primary"
            noWrap
            sx={{ maxWidth: { xs: 140, sm: "none" } }}
          >
            {fileName}
          </Typography>

          {dirty && (
            <Chip
              label="Unsaved"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: "0.7rem", height: 20 }}
            />
          )}

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Ask AI">
            <Button
              size="small"
              variant="outlined"
              startIcon={<SmartToyIcon />}
              onClick={() => setAiOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Ask AI
            </Button>
          </Tooltip>

          {isOwn && isLatex(fileName) && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PublishIcon />}
              onClick={handleOpenPublish}
              sx={{ borderRadius: 2 }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                Publish
              </Box>
            </Button>
          )}

          {isOwn && (
            <Button
              variant="contained"
              size="small"
              startIcon={
                saving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              onClick={handleSave}
              disabled={saving || !dirty}
              sx={{
                borderRadius: 2,
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                boxShadow: "0 4px 14px rgba(37,99,235,0.25)",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
        </Stack>
      </Box>

      {/* Editor + Preview */}
      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Editor pane */}
        <Box
          sx={{
            flex: { xs: 1, md: showPreview ? "0 0 50%" : 1 },
            display: "flex",
            flexDirection: "column",
            borderRight: { xs: "none", md: showPreview ? "1px solid" : "none" },
            borderColor: "divider",
          }}
        >
          <textarea
            value={content}
            onChange={
              isOwn
                ? (e) => {
                    setContent(e.target.value);
                    setDirty(true);
                  }
                : undefined
            }
            readOnly={!isOwn}
            spellCheck={false}
            style={{
              flex: 1,
              display: "block",
              width: "100%",
              minHeight: "calc(100vh - 130px)",
              padding: "24px",
              boxSizing: "border-box",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: "14px",
              lineHeight: 1.7,
              backgroundColor: "#1e1e2e",
              color: "#cdd6f4",
              caretColor: "#cdd6f4",
            }}
          />
        </Box>

        {/* PDF preview pane — only for .tex files, hidden on mobile */}
        {showPreview && (
          <Box
            sx={{
              flex: "0 0 50%",
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              bgcolor: "#2a2a3d",
            }}
          >
            {/* Preview area */}
            <Box sx={{ flex: 1, position: "relative" }}>
              {pdfUrl && (
                <Box
                  component="iframe"
                  src={pdfUrl}
                  title="PDF Preview"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    border: "none",
                    width: "100%",
                    height: "100%",
                  }}
                />
              )}

              {/* Status overlay */}
              {(compiling || compileError || !pdfUrl) && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  {compiling ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={14} sx={{ color: "#89b4fa" }} />
                      <Typography
                        variant="caption"
                        sx={{ color: "#89b4fa", fontFamily: "monospace" }}
                      >
                        Compiling…
                      </Typography>
                    </Stack>
                  ) : compileError ? (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#f38ba8",
                        fontFamily: "monospace",
                        px: 3,
                        textAlign: "center",
                      }}
                    >
                      {compileError}
                    </Typography>
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ color: "#585b70", fontFamily: "monospace" }}
                    >
                      Save to compile and preview
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Publish dialog ── */}
      <Dialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Publish as Publication</DialogTitle>
        <DialogContent>
          {publishMetaLoading && (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          )}

          {!publishMetaLoading && publishedPub && (
            <Alert severity="success" sx={{ mt: 1 }}>
              Published successfully!{" "}
              <Link
                to={`/publications/${publishedPub.id}`}
                style={{ color: "inherit", fontWeight: 600 }}
              >
                View publication →
              </Link>
            </Alert>
          )}

          {!publishMetaLoading && !publishedPub && (
            <Stack spacing={2} pt={1}>
              {publishError && !publishMeta && (
                <Alert severity="error">{publishError}</Alert>
              )}

              {publishMeta && (
                <>
                  <TextField
                    label="Title"
                    value={publishForm.title ?? ""}
                    onChange={(e) =>
                      setPublishForm((f) => ({ ...f, title: e.target.value }))
                    }
                    fullWidth
                    size="small"
                    required
                  />
                  <TextField
                    label="Abstract"
                    value={publishForm.abstract ?? ""}
                    onChange={(e) =>
                      setPublishForm((f) => ({
                        ...f,
                        abstract: e.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                    multiline
                    rows={4}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Year"
                      type="number"
                      value={publishForm.year ?? ""}
                      onChange={(e) =>
                        setPublishForm((f) => ({
                          ...f,
                          year: Number(e.target.value),
                        }))
                      }
                      size="small"
                      sx={{ width: 110 }}
                      required
                    />
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        label="Type"
                        value={publishForm.publication_type ?? "preprint"}
                        onChange={(e) =>
                          setPublishForm((f) => ({
                            ...f,
                            publication_type: e.target.value,
                          }))
                        }
                      >
                        {PUB_TYPES.map((t) => (
                          <MenuItem key={t.value} value={t.value}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  {/* Subject */}
                  <FormControl size="small" fullWidth>
                    <InputLabel>Subject</InputLabel>
                    <Select
                      label="Subject"
                      value={publishForm.subject ?? ""}
                      onChange={(e) =>
                        setPublishForm((f) => ({
                          ...f,
                          subject: e.target.value,
                        }))
                      }
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {SUBJECT_GROUPS.map((group) => [
                        <ListSubheader key={group}>{group}</ListSubheader>,
                        ...SUBJECTS.filter((s) => s.group === group).map(
                          (s) => (
                            <MenuItem key={s.value} value={s.value}>
                              {s.label}
                            </MenuItem>
                          ),
                        ),
                      ])}
                    </Select>
                  </FormControl>

                  {/* Tags */}
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      mb={1}
                    >
                      Tags (optional)
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} mb={1}>
                      {PUBLICATION_TAGS.map(({ value, label }) => {
                        const active = selectedTags.some(
                          (t) => t.tag === value,
                        );
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
                        <Box key={tag} sx={{ mb: 1.5, position: "relative" }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            mb={0.5}
                            fontWeight={600}
                          >
                            {
                              PUBLICATION_TAGS.find((t) => t.value === tag)
                                ?.label
                            }{" "}
                            — link to referenced paper
                          </Typography>
                          {refers_to ? (
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  flex: 1,
                                  bgcolor: "action.hover",
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
                                    zIndex: 20,
                                    maxHeight: 200,
                                    overflowY: "auto",
                                  }}
                                  elevation={4}
                                >
                                  {tagSearchResults[tag].map((pub) => (
                                    <Box
                                      key={pub.id}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectTagReference(tag, pub);
                                      }}
                                      sx={{
                                        px: 2,
                                        py: 1,
                                        cursor: "pointer",
                                        "&:hover": { bgcolor: "action.hover" },
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        fontWeight={600}
                                      >
                                        {pub.title}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {pub.year}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Card>
                              )}
                            </>
                          )}
                        </Box>
                      ))}
                  </Box>

                  <Divider />

                  <Box>
                    <Typography
                      variant="overline"
                      fontWeight={700}
                      color="text.secondary"
                      letterSpacing={1}
                      display="block"
                      mb={1}
                    >
                      Authors from .tex file
                    </Typography>
                    {publishMeta.authors.length === 0 ? (
                      <Typography variant="body2" color="text.disabled">
                        No authors found in the file.
                      </Typography>
                    ) : (
                      <Stack spacing={0.75}>
                        {publishMeta.authors.map((a, i) => (
                          <Stack
                            key={i}
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            {a.user ? (
                              <CheckCircleIcon
                                sx={{ color: "success.main", fontSize: 18 }}
                              />
                            ) : (
                              <PersonOffIcon
                                sx={{ color: "text.disabled", fontSize: 18 }}
                              />
                            )}
                            <Typography variant="body2">{a.name}</Typography>
                            {a.user ? (
                              <Chip
                                label={`@${a.user.username}`}
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ fontSize: "0.68rem", height: 20 }}
                              />
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                              >
                                not a registered user
                              </Typography>
                            )}
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  {dupWarning && (
                    <Box>
                      <Alert severity="warning" sx={{ mb: 1.5 }}>
                        A publication with this title already exists. Review it
                        before publishing again.
                      </Alert>
                      <Stack spacing={1}>
                        {dupWarning.map((pub) => (
                          <Card
                            key={pub.id}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          >
                            <Box sx={{ px: 2, py: 1.25 }}>
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
                              >
                                {pub.year}
                                {pub.authors?.length > 0 &&
                                  ` · ${pub.authors
                                    .map((a) => a.first_name || a.username)
                                    .join(", ")}`}
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {publishError && (
                    <Alert severity="error">{publishError}</Alert>
                  )}
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPublishOpen(false)}>
            {publishedPub ? "Close" : "Cancel"}
          </Button>
          {!publishedPub && publishMeta && !dupWarning && (
            <Button
              variant="contained"
              onClick={() => handlePublish(false)}
              disabled={
                publishing || !publishForm.title?.trim() || !publishForm.year
              }
              startIcon={
                publishing ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <PublishIcon />
                )
              }
              sx={{
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              }}
            >
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          )}
          {!publishedPub && dupWarning && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => handlePublish(true)}
              disabled={publishing}
              startIcon={
                publishing ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <PublishIcon />
                )
              }
            >
              {publishing ? "Publishing…" : "Publish anyway"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <AIAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        content={content}
        canApply={isOwn}
        onApply={(newContent) => {
          setContent(newContent);
          setDirty(true);
        }}
      />
    </Box>
  );
}
