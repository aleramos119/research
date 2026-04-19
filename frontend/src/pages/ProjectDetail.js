import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getProject,
  listFolders,
  listFiles,
  createFolder,
  deleteFolder,
  createFile,
  deleteFile,
} from "../api/projects";
import Navbar from "../components/Navbar";
import {
  Box,
  Breadcrumbs,
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
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const STATUS_LABELS = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
};
const STATUS_COLORS = {
  active: "success",
  completed: "primary",
  paused: "warning",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [pathStack, setPathStack] = useState([{ id: null, name: "Root" }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New-folder dialog
  const [folderDialog, setFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  // Add-file dialog
  const [fileDialog, setFileDialog] = useState(false);
  const [newFileAttachments, setNewFileAttachments] = useState([]);
  const [savingFile, setSavingFile] = useState(false);
  const fileInputRef = useRef(null);

  const currentFolderId = pathStack[pathStack.length - 1].id;
  const isOwn = me && project && project.user === me.id;

  // Load project metadata once
  useEffect(() => {
    getProject(id)
      .then((res) => setProject(res.data))
      .catch(() => setError("Project not found."));
  }, [id]);

  // Load folders + files whenever folder changes
  useEffect(() => {
    if (!project) return;
    setLoading(true);
    Promise.all([
      listFolders(id, currentFolderId),
      listFiles(id, currentFolderId),
    ])
      .then(([fRes, fileRes]) => {
        setFolders(fRes.data.results ?? fRes.data);
        setFiles(fileRes.data.results ?? fileRes.data);
      })
      .catch(() => setError("Could not load folder contents."))
      .finally(() => setLoading(false));
  }, [id, project, currentFolderId]);

  const enterFolder = (folder) =>
    setPathStack((prev) => [...prev, { id: folder.id, name: folder.name }]);

  const navigateTo = (index) =>
    setPathStack((prev) => prev.slice(0, index + 1));

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setSavingFolder(true);
    try {
      const payload = {
        project: Number(id),
        name: newFolderName.trim(),
        parent: currentFolderId,
      };
      const res = await createFolder(payload);
      setFolders((prev) =>
        [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setFolderDialog(false);
      setNewFolderName("");
    } catch {
      setError("Could not create folder.");
    } finally {
      setSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete folder "${folder.name}" and all its contents?`))
      return;
    try {
      await deleteFolder(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    } catch {
      setError("Could not delete folder.");
    }
  };

  const handleAddFile = async () => {
    if (!newFileAttachments.length) return;
    setSavingFile(true);
    try {
      const results = await Promise.all(
        newFileAttachments.map((file) => {
          const fd = new FormData();
          fd.append("project", id);
          if (currentFolderId) fd.append("folder", currentFolderId);
          fd.append("file", file);
          return createFile(fd);
        }),
      );
      setFiles((prev) =>
        [...prev, ...results.map((r) => r.data)].sort((a, b) =>
          a.original_filename.localeCompare(b.original_filename),
        ),
      );
      setFileDialog(false);
      setNewFileAttachments([]);
    } catch {
      setError("Could not add file.");
    } finally {
      setSavingFile(false);
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete file "${file.name}"?`)) return;
    try {
      await deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch {
      setError("Could not delete file.");
    }
  };

  // ── Loading / error states ──
  if (!project && !error) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 5, textAlign: "center" }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (error && !project) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <Typography color="error">{error}</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        {/* Back link */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/${project.username}`)}
          sx={{ mb: 3, color: "text.secondary" }}
        >
          Back
        </Button>

        <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
          {/* ══ LEFT sidebar ══ */}
          <Box sx={{ width: 220, flexShrink: 0, position: "sticky", top: 24 }}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>
                  {project.title}
                </Typography>
                <Chip
                  label={STATUS_LABELS[project.status]}
                  color={STATUS_COLORS[project.status]}
                  size="small"
                  sx={{ mb: 1.5, fontSize: "0.72rem" }}
                />
                {project.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    mb={1.5}
                    sx={{ lineHeight: 1.6 }}
                  >
                    {project.description}
                  </Typography>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Typography
                  variant="caption"
                  color="text.disabled"
                  display="block"
                >
                  Created{" "}
                  {new Date(project.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Typography>
              </CardContent>
            </Card>

            {isOwn && (
              <Stack spacing={1} mt={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<CreateNewFolderIcon />}
                  onClick={() => setFolderDialog(true)}
                  sx={{ borderRadius: 2 }}
                >
                  New folder
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<UploadFileIcon />}
                  onClick={() => setFileDialog(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Add file
                </Button>
              </Stack>
            )}
          </Box>

          {/* ══ RIGHT main area ══ */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb */}
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              sx={{ mb: 2 }}
            >
              {pathStack.map((crumb, index) => {
                const isLast = index === pathStack.length - 1;
                return isLast ? (
                  <Typography
                    key={crumb.id ?? "root"}
                    variant="body2"
                    fontWeight={600}
                    color="text.primary"
                  >
                    {crumb.name}
                  </Typography>
                ) : (
                  <Typography
                    key={crumb.id ?? "root"}
                    variant="body2"
                    color="primary"
                    sx={{
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                    onClick={() => navigateTo(index)}
                  >
                    {crumb.name}
                  </Typography>
                );
              })}
            </Breadcrumbs>

            {error && (
              <Typography color="error" mb={2}>
                {error}
              </Typography>
            )}

            {loading ? (
              <Box textAlign="center" py={6}>
                <CircularProgress size={28} />
              </Box>
            ) : folders.length === 0 && files.length === 0 ? (
              <Box
                sx={{
                  p: 6,
                  textAlign: "center",
                  border: "2px dashed",
                  borderColor: "divider",
                  borderRadius: 3,
                }}
              >
                <FolderIcon
                  sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
                />
                <Typography color="text.secondary">
                  This folder is empty.
                </Typography>
                {isOwn && (
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="center"
                    mt={2}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CreateNewFolderIcon />}
                      onClick={() => setFolderDialog(true)}
                      sx={{ borderRadius: 2 }}
                    >
                      New folder
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                      onClick={() => setFileDialog(true)}
                      sx={{ borderRadius: 2 }}
                    >
                      Add file
                    </Button>
                  </Stack>
                )}
              </Box>
            ) : (
              <Card>
                <List disablePadding>
                  {/* Folders */}
                  {folders.map((folder, i) => (
                    <React.Fragment key={folder.id}>
                      {i > 0 && <Divider component="li" />}
                      <ListItem
                        disablePadding
                        secondaryAction={
                          isOwn ? (
                            <Tooltip title="Delete folder">
                              <IconButton
                                edge="end"
                                size="small"
                                color="error"
                                onClick={() => handleDeleteFolder(folder)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : undefined
                        }
                      >
                        <ListItemButton onClick={() => enterFolder(folder)}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <FolderIcon
                              sx={{ color: "warning.main", fontSize: 22 }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={folder.name}
                            primaryTypographyProps={{
                              variant: "body2",
                              fontWeight: 600,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    </React.Fragment>
                  ))}

                  {/* Divider between folders and files */}
                  {folders.length > 0 && files.length > 0 && (
                    <Divider component="li" />
                  )}

                  {/* Files */}
                  {files.map((file, i) => (
                    <React.Fragment key={file.id}>
                      {i > 0 && <Divider component="li" />}
                      <ListItem
                        disablePadding
                        secondaryAction={
                          <Stack direction="row" spacing={0.5}>
                            {file.file_url && (
                              <Tooltip title="Download">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  color="primary"
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isOwn && (
                              <Tooltip title="Delete file">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteFile(file)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        }
                      >
                        <ListItemButton
                          onClick={() =>
                            navigate(`/projects/${id}/files/${file.id}`)
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <InsertDriveFileIcon
                              sx={{ color: "text.disabled", fontSize: 20 }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={file.original_filename}
                            primaryTypographyProps={{ variant: "body2" }}
                          />
                        </ListItemButton>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Card>
            )}
          </Box>
        </Box>
      </Container>

      {/* ── New folder dialog ── */}
      <Dialog
        open={folderDialog}
        onClose={() => setFolderDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>New folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setFolderDialog(false)}
            disabled={savingFolder}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateFolder}
            disabled={savingFolder || !newFolderName.trim()}
          >
            {savingFolder ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add file dialog ── */}
      <Dialog
        open={fileDialog}
        onClose={() => {
          setFileDialog(false);
          setNewFileAttachments([]);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add files</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <Button
              variant="outlined"
              size="small"
              component="label"
              startIcon={<UploadFileIcon />}
              sx={{ borderRadius: 2 }}
            >
              Choose files…
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                onChange={(e) =>
                  setNewFileAttachments(Array.from(e.target.files))
                }
              />
            </Button>
            {newFileAttachments.length > 0 && (
              <Stack spacing={0.5} mt={1.5}>
                {newFileAttachments.map((f, i) => (
                  <Typography key={i} variant="caption" color="text.secondary">
                    {f.name}{" "}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.disabled"
                    >
                      ({(f.size / 1024).toFixed(1)} KB)
                    </Typography>
                  </Typography>
                ))}
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setFileDialog(false);
              setNewFileAttachments([]);
            }}
            disabled={savingFile}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddFile}
            disabled={savingFile || !newFileAttachments.length}
            sx={{
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            }}
          >
            {savingFile
              ? "Uploading…"
              : `Upload${
                  newFileAttachments.length > 1
                    ? ` (${newFileAttachments.length})`
                    : ""
                }`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
