import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import ReportCard from "../components/ReportCard";
import ReportForm from "../components/ReportForm";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import BugReportIcon from "@mui/icons-material/BugReport";

export default function Feedback() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const debounceRef = useRef(null);

  const fetchReports = useCallback(async (q, type) => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (type && type !== "all") params.type = type;
      const res = await api.get("/api/reports/", { params });
      setReports(res.data.results ?? res.data);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(debouncedQuery, typeFilter);
  }, [fetchReports, debouncedQuery, typeFilter]);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(q), 300);
  };

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
  };

  const handleVoteChange = (id, voted, voteCount) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, has_voted: voted, vote_count: voteCount } : r,
      ),
    );
  };

  const handleCreated = (newReport) => {
    setReports((prev) => [newReport, ...prev]);
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Hero ── */}
      <Box
        sx={{
          background: "linear-gradient(150deg, #eff6ff 0%, #f5f3ff 100%)",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: { xs: 5, md: 7 },
          textAlign: "center",
        }}
      >
        <Container maxWidth="md">
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={1.5}
            mb={1}
          >
            <BugReportIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em">
              Feedback
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Report bugs or suggest features. Vote on issues that affect you too.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
            sx={{
              borderRadius: 2,
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
            }}
          >
            Submit a report
          </Button>
        </Container>
      </Box>

      {/* ── Filters ── */}
      <Container maxWidth="md" sx={{ pt: 4, pb: 1 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            fullWidth
            placeholder="Search reports…"
            value={query}
            onChange={handleQueryChange}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.disabled", fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <TextField
            select
            value={typeFilter}
            onChange={handleTypeChange}
            size="small"
            sx={{
              minWidth: 160,
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
          >
            <MenuItem value="all">All types</MenuItem>
            <Divider />
            <MenuItem value="bug">Bugs</MenuItem>
            <MenuItem value="feature">Feature Requests</MenuItem>
          </TextField>
        </Stack>
      </Container>

      {/* ── List ── */}
      <Container maxWidth="md" sx={{ py: 3 }}>
        {loading ? (
          <Box textAlign="center" py={6}>
            <CircularProgress />
          </Box>
        ) : reports.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 3,
            }}
          >
            <Typography color="text.secondary">
              {query || typeFilter !== "all"
                ? "No reports match your filters."
                : "No reports yet. Be the first!"}
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {reports.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                currentUsername={user?.username}
                onVoteChange={handleVoteChange}
              />
            ))}
          </Stack>
        )}
      </Container>

      <ReportForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
}
