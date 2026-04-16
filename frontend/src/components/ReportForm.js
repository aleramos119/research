import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { createReport } from "../api/reports";

const REPORT_TYPES = [
  ["bug", "Bug"],
  ["feature", "Feature Request"],
];

const EMPTY_FORM = { type: "bug", title: "", description: "" };

export default function ReportForm({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await createReport(form);
      onCreated(res.data);
      setForm(EMPTY_FORM);
      onClose();
    } catch (err) {
      const data = err.response?.data || {};
      const msg =
        data.detail || Object.values(data)[0]?.[0] || "Something went wrong.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Submit a report</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5} mt={1}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Type"
              name="type"
              value={form.type}
              onChange={handleChange}
              size="small"
              fullWidth
              required
            >
              {REPORT_TYPES.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              size="small"
              fullWidth
              required
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              multiline
              rows={4}
              fullWidth
              required
            />
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : null
              }
              sx={{
                borderRadius: 2,
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                alignSelf: "flex-end",
              }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
