import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getFileContent, getProject, saveFileContent } from "../api/projects";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";

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
  const savedRef = useRef(false);

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

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveFileContent(fileId, content);
      setDirty(false);
      savedRef.current = true;
    } catch {
      setError("Could not save file.");
    } finally {
      setSaving(false);
    }
  }, [fileId, content, saving]);

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
            sx={{ color: "text.secondary" }}
          >
            Back
          </Button>

          <Typography variant="body2" fontWeight={600} color="text.primary">
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

      {/* Editor */}
      <Box sx={{ flex: 1 }}>
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
    </Box>
  );
}
