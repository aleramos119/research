import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Abstract from "../components/Abstract";
import ArticleLarge from "../components/ArticleLarge";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import ArticleIcon from "@mui/icons-material/Article";
import PeopleIcon from "@mui/icons-material/People";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

const TYPE_LABELS = {
  journal: "Journal Article",
  conference: "Conference Paper",
  book: "Book",
  chapter: "Book Chapter",
  thesis: "Thesis",
  preprint: "Preprint",
  other: "Other",
};

function SidebarSection({ title, children }) {
  return (
    <Box mb={3}>
      <Typography
        variant="overline"
        fontWeight={700}
        color="text.secondary"
        letterSpacing={1.2}
        display="block"
        mb={1}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function MetricRow({ icon, label, value }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      py={1}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Box sx={{ color: "text.disabled", display: "flex" }}>{icon}</Box>
      <Box flex={1}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function Publication() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pub, setPub] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    api
      .get(`/api/publications/${id}/`)
      .then((res) => setPub(res.data))
      .catch(() => setError("Publication not found."));
  }, [id]);

  useEffect(() => {
    api
      .get(`/api/comments/?publication=${id}`)
      .then((res) => setComments(res.data))
      .catch(() => {});
  }, [id]);

  const handleDelete = async () => {
    const multipleAuthors = pub.authors && pub.authors.length > 1;
    const msg = multipleAuthors
      ? "Remove yourself as an author of this publication?"
      : "Delete this publication? This cannot be undone.";
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/publications/${id}/`);
      navigate("/");
    } catch {
      setError("Could not delete publication.");
      setDeleting(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post("/api/comments/", {
        publication: parseInt(id, 10),
        body: commentText.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
    } catch {
      // silent
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/api/comments/${commentId}/`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // silent
    }
  };

  // ── Loading ──
  if (!pub && !error) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 3,
              alignItems: "flex-start",
            }}
          >
            <Skeleton
              variant="rounded"
              height={400}
              sx={{ width: { xs: "100%", md: 200 }, flexShrink: 0 }}
            />
            <Skeleton variant="rounded" height={400} sx={{ flex: 1 }} />
          </Box>
        </Container>
      </Box>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  const isAuthor = pub.authors.some((a) => a.id === user?.id);

  // Build outline from available sections
  const outline = [
    { id: "header", label: "Overview" },
    pub.abstract && { id: "abstract", label: "Abstract" },
    { id: "comments", label: "Comments" },
  ].filter(Boolean);

  const scrollTo = (sectionId) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          {/* ══ LEFT — Metrics + Outline ══ */}
          <Box
            sx={{
              width: { xs: "100%", md: 200 },
              flexShrink: 0,
              position: { xs: "static", md: "sticky" },
              top: 24,
            }}
          >
            <Stack spacing={2}>
              {/* Article Metrics */}
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <SidebarSection title="Article Metrics">
                    <MetricRow
                      icon={<FormatQuoteIcon fontSize="small" />}
                      label="Citations"
                      value={pub.citations ?? 0}
                    />
                    <MetricRow
                      icon={<PeopleIcon fontSize="small" />}
                      label="Authors"
                      value={pub.authors.length}
                    />
                    <MetricRow
                      icon={<CalendarTodayIcon fontSize="small" />}
                      label="Published"
                      value={pub.year}
                    />
                    <MetricRow
                      icon={<ArticleIcon fontSize="small" />}
                      label="Type"
                      value={
                        TYPE_LABELS[pub.publication_type] ||
                        pub.publication_type
                      }
                    />
                  </SidebarSection>
                </CardContent>
              </Card>

              {/* Outline */}
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="overline"
                    fontWeight={700}
                    color="text.secondary"
                    letterSpacing={1.2}
                    display="block"
                    mb={1}
                  >
                    Outline
                  </Typography>
                  <Stack spacing={0.25}>
                    {outline.map((item) => (
                      <Box
                        key={item.id}
                        onClick={() => scrollTo(item.id)}
                        sx={{
                          px: 1,
                          py: 0.75,
                          borderRadius: 1.5,
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          color: "text.secondary",
                          fontWeight: 500,
                          "&:hover": {
                            bgcolor: "#eff6ff",
                            color: "primary.main",
                          },
                          transition: "all 0.15s",
                        }}
                      >
                        {item.label}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>

          {/* ══ CENTER — Main content ══ */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={3}>
              {/* Header card */}
              <ArticleLarge pub={pub} id="header" />

              {/* Abstract */}
              <Abstract text={pub.abstract} id="abstract" />

              {/* Actions */}
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                {pub.pdf && (
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    component="a"
                    href={`/api/publications/${pub.id}/file/`}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                      "&:hover": {
                        boxShadow: "0 6px 20px rgba(37,99,235,0.4)",
                      },
                    }}
                  >
                    Download PDF
                  </Button>
                )}
                {isAuthor && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting
                      ? "Removing…"
                      : pub.authors.length > 1
                        ? "Remove my authorship"
                        : "Delete publication"}
                  </Button>
                )}
              </Stack>

              {/* Comments */}
              <Card id="comments">
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    Comments ({comments.length})
                  </Typography>

                  {comments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      No comments yet. Be the first to comment!
                    </Typography>
                  ) : (
                    <Stack spacing={2.5} mb={3}>
                      {comments.map((c) => (
                        <Box key={c.id} sx={{ display: "flex", gap: 1.5 }}>
                          <Avatar
                            src={c.author.avatar_url || undefined}
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: "primary.main",
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {(
                              c.author.first_name?.[0] || c.author.username[0]
                            ).toUpperCase()}
                          </Avatar>
                          <Box flex={1}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              mb={0.5}
                            >
                              <Typography
                                component={Link}
                                to={`/${c.author.username}`}
                                variant="body2"
                                fontWeight={600}
                                color="text.primary"
                                sx={{
                                  textDecoration: "none",
                                  "&:hover": { color: "primary.main" },
                                }}
                              >
                                {c.author.first_name
                                  ? `${c.author.first_name} ${
                                      c.author.last_name || ""
                                    }`.trim()
                                  : c.author.username}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.disabled"
                              >
                                {new Date(c.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </Typography>
                              {c.is_mine && (
                                <Tooltip title="Delete comment">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteComment(c.id)}
                                    sx={{ ml: "auto !important", p: 0.25 }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{ whiteSpace: "pre-wrap" }}
                            >
                              {c.body}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}

                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1.5}>
                    <TextField
                      multiline
                      minRows={2}
                      maxRows={6}
                      fullWidth
                      placeholder="Write a comment…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      size="small"
                    />
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handlePostComment}
                        disabled={!commentText.trim() || postingComment}
                        sx={{
                          background:
                            "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                        }}
                      >
                        {postingComment ? "Posting…" : "Post comment"}
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Footer */}
              <Divider />
              <Typography variant="caption" color="text.disabled">
                Uploaded by{" "}
                {pub.uploaded_by ? (
                  <Typography
                    component={Link}
                    to={`/${pub.uploaded_by.username}`}
                    variant="caption"
                    color="primary"
                    sx={{ textDecoration: "none" }}
                  >
                    @{pub.uploaded_by.username}
                  </Typography>
                ) : (
                  "a deleted user"
                )}
                {pub.created_at &&
                  ` · ${new Date(pub.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}`}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
