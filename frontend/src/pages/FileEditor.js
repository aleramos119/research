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

      {/* Editor + Preview */}
      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Editor pane */}
        <Box
          sx={{
            flex: showPreview ? "0 0 50%" : 1,
            display: "flex",
            flexDirection: "column",
            borderRight: showPreview ? "1px solid" : "none",
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

        {/* PDF preview pane — only for .tex files */}
        {showPreview && (
          <Box
            sx={{
              flex: "0 0 50%",
              display: "flex",
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
    </Box>
  );
}
