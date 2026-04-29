import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Abstract from "../components/Abstract";
import ArticleLarge from "../components/ArticleLarge";
import CommentBody from "../components/CommentBody";
import ExternalArticleCard from "../components/ExternalArticleCard";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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

// Textarea with @mention autocomplete dropdown
function MentionInput({
  value,
  onChange,
  placeholder,
  minRows = 2,
  maxRows = 6,
}) {
  const inputRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    const before = val.slice(0, e.target.selectionStart);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery("");
      setMentionUsers([]);
    }
  };

  useEffect(() => {
    if (mentionQuery.length === 0) {
      setMentionUsers([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get(`/api/search/?q=${encodeURIComponent(mentionQuery)}`)
        .then((res) => setMentionUsers((res.data.users || []).slice(0, 5)))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const selectUser = (username) => {
    const el = inputRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const newBefore = before.replace(/@\w*$/, `@${username} `);
    const newValue = newBefore + after;
    onChange(newValue);
    setMentionUsers([]);
    setMentionQuery("");
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  };

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        inputRef={inputRef}
        multiline
        minRows={minRows}
        maxRows={maxRows}
        fullWidth
        size="small"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      {mentionUsers.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            mb: 0.5,
            borderRadius: 1.5,
            overflow: "hidden",
          }}
        >
          {mentionUsers.map((u) => {
            const displayName = u.first_name
              ? `${u.first_name} ${u.last_name || ""}`.trim()
              : u.username;
            const initial = (u.first_name?.[0] || u.username[0]).toUpperCase();
            return (
              <Box
                key={u.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectUser(u.username);
                }}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Avatar
                  src={u.avatar_url || undefined}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: "primary.main",
                    fontSize: "0.75rem",
                  }}
                >
                  {initial}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{u.username}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Paper>
      )}
    </Box>
  );
}

// Single comment (used for both top-level and replies)
function CommentRow({ comment, onDelete, onReply }) {
  const name = comment.author.first_name
    ? `${comment.author.first_name} ${comment.author.last_name || ""}`.trim()
    : comment.author.username;
  const initial = (
    comment.author.first_name?.[0] || comment.author.username[0]
  ).toUpperCase();

  return (
    <Box sx={{ display: "flex", gap: 1.5 }}>
      <Avatar
        src={comment.author.avatar_url || undefined}
        sx={{
          width: 36,
          height: 36,
          bgcolor: "primary.main",
          fontSize: "0.85rem",
          flexShrink: 0,
        }}
      >
        {initial}
      </Avatar>
      <Box flex={1}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          mb={0.5}
          flexWrap="wrap"
        >
          <Typography
            component={Link}
            to={`/${comment.author.username}`}
            variant="body2"
            fontWeight={600}
            color="text.primary"
            sx={{
              textDecoration: "none",
              "&:hover": { color: "primary.main" },
            }}
          >
            {name}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {new Date(comment.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ ml: "auto !important" }}>
            {onReply && (
              <Button
                size="small"
                sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: "0.7rem" }}
                onClick={onReply}
              >
                Reply
              </Button>
            )}
            {comment.is_mine && (
              <Tooltip title="Delete comment">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(comment.id)}
                  sx={{ p: 0.25 }}
                >
                  <DeleteIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
        <CommentBody body={comment.body} />
      </Box>
    </Box>
  );
}

// Top-level comment with its replies and inline reply form
function CommentThread({ comment, replies, onDelete, onAddComment, pubId }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const authorName = comment.author.first_name || comment.author.username;

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const res = await api.post("/api/comments/", {
        publication: pubId,
        parent: comment.id,
        body: replyText.trim(),
      });
      onAddComment(res.data);
      setReplyText("");
      setReplying(false);
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box>
      <CommentRow
        comment={comment}
        onDelete={onDelete}
        onReply={() => setReplying((r) => !r)}
      />

      {/* Reply input */}
      {replying && (
        <Box sx={{ ml: 6, mt: 1 }}>
          <MentionInput
            value={replyText}
            onChange={setReplyText}
            placeholder={`Reply to ${authorName}…`}
            minRows={1}
            maxRows={4}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
            <Button
              size="small"
              onClick={() => {
                setReplying(false);
                setReplyText("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleReply}
              disabled={!replyText.trim() || posting}
              sx={{
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              }}
            >
              {posting ? "Posting…" : "Reply"}
            </Button>
          </Stack>
        </Box>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <Stack
          spacing={1.5}
          sx={{
            ml: 6,
            mt: 1.5,
            pl: 2,
            borderLeft: "2px solid",
            borderColor: "divider",
          }}
        >
          {replies.map((r) => (
            <CommentRow key={r.id} comment={r} onDelete={onDelete} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

// Compact card listing related publications
function RelatedPubList({ pubs, emptyText }) {
  if (!pubs || pubs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5}>
      {pubs.map((p) => {
        const authorNames = [
          ...(p.authors || []).map((a) =>
            a.first_name
              ? `${a.first_name} ${a.last_name || ""}`.trim()
              : a.username,
          ),
          ...(p.external_authors || []).map((a) => a.name),
        ].join(", ");
        return (
          <Box
            key={p.id}
            component={Link}
            to={`/publications/${p.id}`}
            sx={{
              display: "block",
              p: 1.5,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              textDecoration: "none",
              "&:hover": {
                bgcolor: "action.hover",
                borderColor: "primary.main",
              },
              transition: "all 0.15s",
            }}
          >
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {p.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {authorNames}
              {p.year ? ` · ${p.year}` : ""}
            </Typography>
          </Box>
        );
      })}
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
  const [tab, setTab] = useState(0);
  const [related, setRelated] = useState(null);
  const [relatedWork, setRelatedWork] = useState(null);
  const [bibliography, setBibliography] = useState(null);

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

  useEffect(() => {
    api
      .get(`/api/publications/${id}/related/`)
      .then((res) => setRelated(res.data))
      .catch(() =>
        setRelated({
          rebuttals: [],
          replications: [],
          retractions_corrections: [],
        }),
      );
  }, [id]);

  useEffect(() => {
    api
      .get(`/api/publications/${id}/related-work/`)
      .then((res) => setRelatedWork(res.data))
      .catch(() => setRelatedWork({ papers: [], rate_limited: false }));
  }, [id]);

  useEffect(() => {
    api
      .get(`/api/publications/${id}/bibliography/`)
      .then((res) => setBibliography(res.data))
      .catch(() => setBibliography({ entries: [], has_source: false }));
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

  const handleDeleteComment = (commentId) => {
    api.delete(`/api/comments/${commentId}/`).then(() => {
      // Remove comment and any of its replies
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parent !== commentId),
      );
    });
  };

  const handleAddComment = (comment) => {
    setComments((prev) => [...prev, comment]);
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

  // Group flat comment list into threads
  const topLevel = comments.filter((c) => c.parent === null);
  const repliesByParent = {};
  comments
    .filter((c) => c.parent !== null)
    .forEach((c) => {
      if (!repliesByParent[c.parent]) repliesByParent[c.parent] = [];
      repliesByParent[c.parent].push(c);
    });
  const totalCount = comments.length;

  const outline = [
    { id: "header", label: "Overview" },
    pub.abstract && { id: "abstract", label: "Abstract" },
    { id: "tabs", label: "Discussion" },
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
              <ArticleLarge pub={pub} id="header" />
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

              {/* ── Tabs ── */}
              <Card id="tabs">
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab
                      label={
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <span>Comments</span>
                          <Chip
                            label={totalCount}
                            size="small"
                            sx={{ height: 18, fontSize: "0.68rem" }}
                          />
                        </Stack>
                      }
                    />
                    <Tab label="Bibliography" />
                    <Tab
                      label={
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <span>Citations</span>
                          {related && (
                            <Chip
                              label={
                                (related.rebuttals?.length ?? 0) +
                                (related.replications?.length ?? 0) +
                                (related.retractions_corrections?.length ?? 0)
                              }
                              size="small"
                              sx={{ height: 18, fontSize: "0.68rem" }}
                            />
                          )}
                        </Stack>
                      }
                    />
                    <Tab
                      label={
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <span>Replications</span>
                          {related && (
                            <Chip
                              label={related.replications?.length ?? 0}
                              size="small"
                              sx={{ height: 18, fontSize: "0.68rem" }}
                            />
                          )}
                        </Stack>
                      }
                    />
                    <Tab
                      label={
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <span>Rebuttals</span>
                          {related && (
                            <Chip
                              label={related.rebuttals?.length ?? 0}
                              size="small"
                              sx={{ height: 18, fontSize: "0.68rem" }}
                            />
                          )}
                        </Stack>
                      }
                    />
                    <Tab
                      label={
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <span>Retractions & Corrections</span>
                          {related && (
                            <Chip
                              label={
                                related.retractions_corrections?.length ?? 0
                              }
                              size="small"
                              sx={{ height: 18, fontSize: "0.68rem" }}
                            />
                          )}
                        </Stack>
                      }
                    />
                    <Tab label="Related Work" />
                  </Tabs>
                </Box>

                <CardContent sx={{ p: 3 }}>
                  {/* Tab 0 — Comments */}
                  {tab === 0 && (
                    <>
                      {topLevel.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mb={2}
                        >
                          No comments yet. Be the first to comment!
                        </Typography>
                      ) : (
                        <Stack spacing={3} mb={3}>
                          {topLevel.map((c) => (
                            <CommentThread
                              key={c.id}
                              comment={c}
                              replies={repliesByParent[c.id] || []}
                              onDelete={handleDeleteComment}
                              onAddComment={handleAddComment}
                              pubId={parseInt(id, 10)}
                            />
                          ))}
                        </Stack>
                      )}
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1.5}>
                        <MentionInput
                          value={commentText}
                          onChange={setCommentText}
                          placeholder="Write a comment… ($…$ inline math, $$…$$ block math, '''…''' code, @username mention)"
                        />
                        <Box
                          sx={{ display: "flex", justifyContent: "flex-end" }}
                        >
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
                    </>
                  )}

                  {/* Tab 1 — Bibliography */}
                  {tab === 1 && (
                    <>
                      {bibliography === null && (
                        <Typography variant="body2" color="text.secondary">
                          Loading bibliography…
                        </Typography>
                      )}
                      {bibliography !== null && !bibliography.has_source && (
                        <Typography variant="body2" color="text.secondary">
                          No LaTeX source file is linked to this publication.
                        </Typography>
                      )}
                      {bibliography?.has_source &&
                        bibliography.entries.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            No bibliography entries found in the source file.
                          </Typography>
                        )}
                      {bibliography?.entries?.length > 0 && (
                        <Stack spacing={1.5}>
                          {bibliography.entries.map((entry, i) => (
                            <Box
                              key={entry.key || i}
                              sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                borderLeft: "3px solid",
                                borderLeftColor: "primary.light",
                              }}
                            >
                              <Stack
                                direction="row"
                                alignItems="flex-start"
                                justifyContent="space-between"
                                gap={1}
                              >
                                <Box flex={1}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color="text.primary"
                                  >
                                    {entry.title || entry.raw || "(untitled)"}
                                  </Typography>
                                  {entry.authors?.length > 0 && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {entry.authors.slice(0, 4).join(", ")}
                                      {entry.authors.length > 4 ? " …" : ""}
                                      {entry.year ? ` · ${entry.year}` : ""}
                                      {entry.venue ? ` · ${entry.venue}` : ""}
                                    </Typography>
                                  )}
                                  {entry.citations > 0 && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      {entry.citations} citation
                                      {entry.citations !== 1 ? "s" : ""}
                                    </Typography>
                                  )}
                                </Box>
                                {entry.url && (
                                  <Tooltip title="Open paper">
                                    <IconButton
                                      component="a"
                                      href={entry.url}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      size="small"
                                      color="primary"
                                    >
                                      <OpenInNewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </>
                  )}

                  {/* Tab 2 — Citations */}
                  {tab === 2 && (
                    <RelatedPubList
                      pubs={[
                        ...(related?.rebuttals ?? []),
                        ...(related?.replications ?? []),
                        ...(related?.retractions_corrections ?? []),
                      ]}
                      emptyText="No publications on this platform have referenced this work yet."
                    />
                  )}

                  {/* Tab 3 — Replications */}
                  {tab === 3 && (
                    <RelatedPubList
                      pubs={related?.replications}
                      emptyText="No replications of this work have been registered yet."
                    />
                  )}

                  {/* Tab 4 — Rebuttals */}
                  {tab === 4 && (
                    <RelatedPubList
                      pubs={related?.rebuttals}
                      emptyText="No rebuttals of this work have been registered yet."
                    />
                  )}

                  {/* Tab 5 — Retractions & Corrections */}
                  {tab === 5 && (
                    <RelatedPubList
                      pubs={related?.retractions_corrections}
                      emptyText="No retractions or corrections have been registered for this work."
                    />
                  )}

                  {/* Tab 6 — Related Work */}
                  {tab === 6 && (
                    <>
                      {relatedWork === null && (
                        <Typography variant="body2" color="text.secondary">
                          Loading related work…
                        </Typography>
                      )}
                      {relatedWork?.rate_limited && (
                        <Typography variant="body2" color="text.secondary">
                          Semantic Scholar rate limit reached. Try again
                          shortly.
                        </Typography>
                      )}
                      {relatedWork !== null &&
                        !relatedWork.rate_limited &&
                        relatedWork.papers.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            No related papers found.
                          </Typography>
                        )}
                      {relatedWork?.papers?.length > 0 && (
                        <Stack spacing={1.5}>
                          {relatedWork.papers.map((paper) => (
                            <ExternalArticleCard
                              key={paper.paperId}
                              paper={paper}
                            />
                          ))}
                        </Stack>
                      )}
                    </>
                  )}
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
