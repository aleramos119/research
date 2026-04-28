import React, { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import ArticleList from "../components/ArticleList";
import ExternalArticleCard from "../components/ExternalArticleCard";
import { SUBJECTS, SUBJECT_GROUPS } from "../constants/subjects";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  InputAdornment,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import ArticleIcon from "@mui/icons-material/Article";
import SchoolIcon from "@mui/icons-material/School";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PublicIcon from "@mui/icons-material/Public";

const ORDERING_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "score", label: "Score" },
  { value: "citations", label: "Citations" },
  { value: "created_at", label: "Date Posted" },
];

function SectionLabel({ icon, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
      <Box sx={{ color: "text.disabled" }}>{icon}</Box>
      <Typography
        variant="overline"
        fontWeight={700}
        color="text.secondary"
        letterSpacing={1.2}
      >
        {label}
      </Typography>
    </Stack>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [results, setResults] = useState(null);
  const [semanticResults, setSemanticResults] = useState([]);
  const [semanticRateLimited, setSemanticRateLimited] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchingSemantic, setSearchingSemantic] = useState(false);
  const [ordering, setOrdering] = useState("relevance");
  const [recommended, setRecommended] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const debounceTimer = useRef(null);

  const hasInterests = user?.interests?.length > 0;

  useEffect(() => {
    if (!hasInterests) return;
    setLoadingRec(true);
    const params = new URLSearchParams({ ordering });
    if (subjectFilter) params.set("subject", subjectFilter);
    api
      .get(`/api/publications/recommended/?${params}`)
      .then((res) => setRecommended(res.data))
      .catch(() => setRecommended([]))
      .finally(() => setLoadingRec(false));
  }, [hasInterests, ordering, subjectFilter]);

  const doSearch = useCallback(
    async (q) => {
      if (!q.trim()) {
        setResults(null);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (subjectFilter) params.set("subject", subjectFilter);
        const res = await api.get(`/api/search/?${params}`);
        setResults(res.data);
      } catch {
        setResults(null);
      } finally {
        setSearching(false);
      }
    },
    [subjectFilter],
  );

  const doSemanticSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setSemanticResults([]);
      return;
    }
    setSearchingSemantic(true);
    setSemanticRateLimited(false);
    try {
      const res = await api.get(
        `/api/search/semantic/?q=${encodeURIComponent(q)}`,
      );
      setSemanticResults(res.data.semantic_scholar);
      setSemanticRateLimited(res.data.rate_limited);
    } catch {
      setSemanticResults([]);
    } finally {
      setSearchingSemantic(false);
    }
  }, []);

  useEffect(() => {
    if (query.trim()) doSearch(query);
  }, [subjectFilter, doSearch, query]);

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(q), 300);
    if (!q.trim()) {
      setSemanticResults([]);
      setSemanticRateLimited(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") doSemanticSearch(query);
  };

  const noResults =
    results &&
    !searchingSemantic &&
    !semanticRateLimited &&
    results.users.length === 0 &&
    results.publications.length === 0 &&
    semanticResults.length === 0;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Hero ── */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #eff6ff 0%, #f5f3ff 100%)",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: { xs: 6, md: 9 },
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            fontWeight={800}
            letterSpacing="-0.03em"
            mb={1}
            sx={{ fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" } }}
          >
            Discover research
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            mb={4}
            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            Search millions of academic publications and researchers
          </Typography>
          <TextField
            fullWidth
            placeholder="Search authors or publications…"
            value={query}
            onChange={handleSearch}
            onKeyDown={handleKeyDown}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searching || searchingSemantic ? (
                    <CircularProgress size={18} />
                  ) : (
                    <SearchIcon sx={{ color: "text.disabled" }} />
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
              maxWidth: 580,
              mx: "auto",
              "& .MuiOutlinedInput-root": {
                bgcolor: "white",
                borderRadius: 3,
                fontSize: "1rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
                "& fieldset": { borderColor: "transparent" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              },
            }}
          />
          <Box sx={{ maxWidth: 580, mx: "auto", mt: 1.5 }}>
            <Select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                if (query.trim()) doSearch(query);
              }}
              displayEmpty
              size="small"
              fullWidth
              MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
              sx={{
                bgcolor: "white",
                borderRadius: 2,
                fontSize: "0.875rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                "& fieldset": { borderColor: "transparent" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              }}
            >
              <MenuItem value="">All Subjects</MenuItem>
              {SUBJECT_GROUPS.map((group) => [
                <ListSubheader key={group}>{group}</ListSubheader>,
                ...SUBJECTS.filter((s) => s.group === group).map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                )),
              ])}
            </Select>
          </Box>
        </Container>
      </Box>

      {/* ── Content ── */}
      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* Recommended — shown only when not searching */}
        {!query && hasInterests && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <AutoAwesomeIcon
                fontSize="small"
                sx={{ color: "text.disabled" }}
              />
              <Typography
                variant="overline"
                fontWeight={700}
                color="text.secondary"
                letterSpacing={1.2}
              >
                Order by:
              </Typography>
              <Select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                size="small"
                sx={{ fontSize: "0.8rem", minWidth: 140 }}
              >
                {ORDERING_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>

            {loadingRec ? (
              <Box textAlign="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            ) : recommended?.length === 0 ? (
              <Typography color="text.disabled" textAlign="center" mt={2}>
                No publications match your interests yet.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {recommended?.map((pub) => (
                  <ArticleList key={pub.id} pub={pub} />
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* Search results */}
        {query && (
          <>
            {noResults && (
              <Typography color="text.disabled" textAlign="center" mt={2}>
                No results for "{query}".
              </Typography>
            )}

            {results && !noResults && (
              <Stack spacing={5}>
                {/* Authors */}
                {results.users?.length > 0 && (
                  <Box>
                    <SectionLabel
                      icon={<PersonIcon fontSize="small" />}
                      label="Authors"
                    />
                    <Stack spacing={1.5}>
                      {results.users.map((u) => (
                        <Card
                          key={u.id}
                          component={Link}
                          to={`/${u.username}`}
                          sx={{
                            textDecoration: "none",
                            display: "block",
                            transition: "box-shadow 0.15s, transform 0.15s",
                            "&:hover": {
                              boxShadow: 3,
                              transform: "translateY(-1px)",
                            },
                          }}
                        >
                          <CardContent
                            sx={{
                              py: 1.5,
                              px: 2.5,
                              "&:last-child": { pb: 1.5 },
                            }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={2}
                            >
                              <Avatar
                                sx={{
                                  bgcolor: "primary.main",
                                  width: 40,
                                  height: 40,
                                  fontWeight: 700,
                                }}
                              >
                                {(
                                  u.first_name?.[0] || u.username[0]
                                ).toUpperCase()}
                              </Avatar>
                              <Box flex={1} minWidth={0}>
                                <Typography
                                  variant="body1"
                                  fontWeight={600}
                                  color="text.primary"
                                >
                                  {u.first_name || u.username} {u.last_name}
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.secondary"
                                    ml={1}
                                  >
                                    @{u.username}
                                  </Typography>
                                </Typography>
                                {u.university && (
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.5}
                                  >
                                    <SchoolIcon
                                      sx={{
                                        fontSize: 13,
                                        color: "text.disabled",
                                      }}
                                    />
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {u.university}
                                    </Typography>
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
                    <SectionLabel
                      icon={<ArticleIcon fontSize="small" />}
                      label="Publications"
                    />
                    <Stack spacing={1.5}>
                      {results.publications.map((pub) => (
                        <ArticleList key={pub.id} pub={pub} />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}

            {/* Semantic Scholar — independent of internal results */}
            {(semanticResults.length > 0 || semanticRateLimited) && (
              <Box mt={results && !noResults ? 5 : 0}>
                <SectionLabel
                  icon={<PublicIcon fontSize="small" />}
                  label="Semantic Scholar"
                />
                {semanticRateLimited ? (
                  <Typography variant="body2" color="text.secondary">
                    Semantic Scholar is temporarily rate-limited. Please wait a
                    moment and press Enter to try again.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {semanticResults.map((paper) => (
                      <ExternalArticleCard key={paper.paperId} paper={paper} />
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
