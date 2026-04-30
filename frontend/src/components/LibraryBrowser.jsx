import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DeleteIcon from "@mui/icons-material/Delete";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import EditIcon from "@mui/icons-material/Edit";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { subjectLabel } from "../constants/subjects";

function PublicationItem({ item, onRemove, onMove }) {
  const pub = item.publication;
  const keywords = pub.keywords
    ? pub.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Move to folder">
            <IconButton size="small" onClick={() => onMove(item)}>
              <DriveFileMoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove from library">
            <IconButton size="small" onClick={() => onRemove(item.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <BookmarkIcon fontSize="small" color="primary" />
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography
            component={Link}
            to={`/publications/${pub.id}`}
            variant="body2"
            fontWeight={600}
            sx={{
              color: "text.primary",
              textDecoration: "none",
              "&:hover": { color: "primary.main" },
            }}
          >
            {pub.title}
          </Typography>
        }
        secondary={
          <Stack direction="row" spacing={0.75} flexWrap="wrap" mt={0.25}>
            {pub.subject && (
              <Chip
                label={subjectLabel(pub.subject)}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.65rem", height: 18 }}
              />
            )}
            {pub.year && (
              <Typography variant="caption" color="text.disabled">
                {pub.year}
              </Typography>
            )}
            {keywords.slice(0, 3).map((k) => (
              <Typography key={k} variant="caption" color="text.disabled">
                {k}
              </Typography>
            ))}
          </Stack>
        }
      />
    </ListItem>
  );
}

export default function LibraryBrowser({ isOwn }) {
  const [folders, setFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [pathStack, setPathStack] = useState([{ id: null, name: "Library" }]);
  const [allFolders, setAllFolders] = useState([]);

  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameName, setRenameName] = useState("");

  const [moveDialog, setMoveDialog] = useState(false);
  const [movingItem, setMovingItem] = useState(null);
  const [moveTarget, setMoveTarget] = useState("");

  const currentFolder = pathStack[pathStack.length - 1];

  const fetchContents = () => {
    const param = currentFolder.id == null ? "root" : currentFolder.id;
    api
      .get(`/api/library/folders/?parent=${param}`)
      .then((r) => setFolders(r.data))
      .catch(() => {});
    api
      .get(`/api/library/items/?folder=${param}`)
      .then((r) => setItems(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathStack]);

  useEffect(() => {
    api
      .get("/api/library/folders/")
      .then((r) => setAllFolders(r.data))
      .catch(() => {});
  }, [folders]);

  const enterFolder = (folder) => {
    setPathStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateTo = (index) => {
    setPathStack((prev) => prev.slice(0, index + 1));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setSavingFolder(true);
    try {
      await api.post("/api/library/folders/", {
        name: newFolderName.trim(),
        parent: currentFolder.id,
      });
      setNewFolderName("");
      setNewFolderDialog(false);
      fetchContents();
    } catch {
      // duplicate name — ignore silently
    } finally {
      setSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Delete this folder? Items inside will move to root."))
      return;
    await api.delete(`/api/library/folders/${folderId}/`);
    fetchContents();
  };

  const handleRenameFolder = async () => {
    if (!renameName.trim() || !renamingFolder) return;
    await api.patch(`/api/library/folders/${renamingFolder.id}/`, {
      name: renameName.trim(),
    });
    setRenamingFolder(null);
    fetchContents();
  };

  const handleRemoveItem = async (itemId) => {
    await api.delete(`/api/library/items/${itemId}/`);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleOpenMove = (item) => {
    setMovingItem(item);
    setMoveTarget(item.folder ?? "");
    setMoveDialog(true);
  };

  const handleMoveItem = async () => {
    if (!movingItem) return;
    await api.patch(`/api/library/items/${movingItem.id}/`, {
      folder: moveTarget === "" ? null : moveTarget,
    });
    setMoveDialog(false);
    setMovingItem(null);
    fetchContents();
  };

  const isEmpty = folders.length === 0 && items.length === 0;

  return (
    <Box>
      {/* Toolbar */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={1.5}
      >
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="inherit" />}>
          {pathStack.map((crumb, i) =>
            i < pathStack.length - 1 ? (
              <Typography
                key={i}
                variant="body2"
                color="primary"
                sx={{
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={() => navigateTo(i)}
              >
                {crumb.name}
              </Typography>
            ) : (
              <Typography key={i} variant="body2" fontWeight={700}>
                {crumb.name}
              </Typography>
            ),
          )}
        </Breadcrumbs>

        {isOwn && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => setNewFolderDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            New folder
          </Button>
        )}
      </Stack>

      {isEmpty ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: "center",
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <BookmarkIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">
            {currentFolder.id == null
              ? "No saved papers yet. Browse publications and click the bookmark icon to save them here."
              : "This folder is empty."}
          </Typography>
        </Paper>
      ) : (
        <List disablePadding>
          {folders.map((folder, i) => (
            <React.Fragment key={folder.id}>
              {i === 0 && <Divider />}
              <ListItem
                disablePadding
                secondaryAction={
                  isOwn && (
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Rename">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setRenamingFolder(folder);
                            setRenameName(folder.name);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete folder">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteFolder(folder.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )
                }
              >
                <ListItemButton onClick={() => enterFolder(folder)}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FolderOpenIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={folder.name}
                    secondary={`${folder.items_count} paper${
                      folder.items_count !== 1 ? "s" : ""
                    }${
                      folder.children_count > 0
                        ? `, ${folder.children_count} subfolder${
                            folder.children_count !== 1 ? "s" : ""
                          }`
                        : ""
                    }`}
                  />
                </ListItemButton>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}

          {items.map((item, i) => (
            <React.Fragment key={item.id}>
              {i === 0 && folders.length > 0 && <Divider sx={{ my: 0.5 }} />}
              <PublicationItem
                item={item}
                onRemove={handleRemoveItem}
                onMove={handleOpenMove}
              />
              {i < items.length - 1 && <Divider variant="inset" />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* New folder dialog */}
      <Dialog
        open={newFolderDialog}
        onClose={() => setNewFolderDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>New folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewFolderDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateFolder}
            disabled={savingFolder || !newFolderName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog
        open={!!renamingFolder}
        onClose={() => setRenamingFolder(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Rename folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="New name"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameFolder();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenamingFolder(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRenameFolder}
            disabled={!renameName.trim()}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move item dialog */}
      <Dialog
        open={moveDialog}
        onClose={() => setMoveDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Move to folder</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Destination</InputLabel>
            <Select
              label="Destination"
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value)}
            >
              <MenuItem value="">
                <em>Library root</em>
              </MenuItem>
              {allFolders.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FolderIcon fontSize="small" color="warning" />
                    <span>{f.name}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMoveDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleMoveItem}>
            Move
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
