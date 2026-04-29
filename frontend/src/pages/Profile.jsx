import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ArticleIcon from "@mui/icons-material/Article";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PeopleIcon from "@mui/icons-material/People";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import FolderIcon from "@mui/icons-material/Folder";
import ArticleList from "../components/ArticleList";
import ProjectList from "../components/ProjectList";
import Keyword from "../components/Keyword";

const EMPTY_PROJECT_FORM = { title: "", description: "", status: "active" };

const INTEREST_SUGGESTIONS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "Natural Language Processing",
  "Data Science",
  "Bioinformatics",
  "Neuroscience",
  "Genomics",
  "Climate Science",
  "Quantum Computing",
  "Robotics",
  "Cybersecurity",
  "Cryptography",
  "Human-Computer Interaction",
  "Software Engineering",
  "Distributed Systems",
  "High Performance Computing",
  "Graph Theory",
  "Computational Biology",
  "Materials Science",
  "Astrophysics",
  "Particle Physics",
  "Ecology",
  "Epidemiology",
  "Public Health",
  "Economics",
  "Political Science",
  "Sociology",
  "Psychology",
  "Cognitive Science",
  "Linguistics",
];

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
          {value ?? 0}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { user: me, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [publications, setPublications] = useState([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [editingInterests, setEditingInterests] = useState(false);
  const [interestsDraft, setInterestsDraft] = useState([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectDialog, setProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [savingProject, setSavingProject] = useState(false);

  const [tab, setTab] = useState(0);

  const isOwn = me?.username === username;

  useEffect(() => {
    setError("");
    setProfile(null);
    const requests = [
      api.get(`/api/users/${username}/`),
      api.get(`/api/publications/?author=${username}`),
    ];
    if (me?.username === username) {
      requests.push(api.get(`/api/users/${username}/following/`));
    }
    Promise.all(requests)
      .then(([profileRes, pubsRes, followingRes]) => {
        setProfile(profileRes.data);
        setFollowing(profileRes.data.is_followed_by_me);
        setPublications(pubsRes.data.results ?? pubsRes.data);
        if (followingRes) setFollowingList(followingRes.data);
      })
      .catch(() => setError("User not found."));

    if (me?.username === username) {
      api
        .get(`/api/projects/?user=${username}`)
        .then((res) => setProjects(res.data.results ?? res.data))
        .catch(() => {});
    }
  }, [username, me?.username]);

  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete your account? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteAccount();
      navigate("/");
    } catch {
      setError("Could not delete account.");
      setDeleting(false);
    }
  };

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (following) {
        await api.post(`/api/users/${username}/unfollow/`);
        setFollowing(false);
        setProfile((p) => ({ ...p, followers_count: p.followers_count - 1 }));
      } else {
        await api.post(`/api/users/${username}/follow/`);
        setFollowing(true);
        setProfile((p) => ({ ...p, followers_count: p.followers_count + 1 }));
      }
    } catch {
      setError("Could not update follow status.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollowFromList = async (targetUsername) => {
    try {
      await api.post(`/api/users/${targetUsername}/unfollow/`);
      setFollowingList((prev) =>
        prev.filter((u) => u.username !== targetUsername),
      );
      setProfile((p) => ({ ...p, following_count: p.following_count - 1 }));
    } catch {
      setError("Could not unfollow user.");
    }
  };

  const handleEditInterests = () => {
    setInterestsDraft(profile.interests ?? []);
    setEditingInterests(true);
  };

  const handleSaveInterests = async () => {
    setSavingInterests(true);
    try {
      await api.patch("/api/auth/me/", { interests: interestsDraft });
      setProfile((p) => ({ ...p, interests: interestsDraft }));
      setEditingInterests(false);
    } catch {
      setError("Could not save interests.");
    } finally {
      setSavingInterests(false);
    }
  };

  const handleDeletePublication = async (pub) => {
    const multipleAuthors = pub.authors && pub.authors.length > 1;
    const msg = multipleAuthors
      ? "Remove yourself as an author of this publication?"
      : "Delete this publication? This cannot be undone.";
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/api/publications/${pub.id}/`);
      setPublications((prev) => prev.filter((p) => p.id !== pub.id));
    } catch {
      setError("Could not delete publication.");
    }
  };

  const openAddProject = () => {
    setEditingProject(null);
    setProjectForm(EMPTY_PROJECT_FORM);
    setProjectDialog(true);
  };

  const openEditProject = (project) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      description: project.description,
      status: project.status,
    });
    setProjectDialog(true);
  };

  const handleSaveProject = async () => {
    setSavingProject(true);
    try {
      if (editingProject) {
        const res = await api.patch(
          `/api/projects/${editingProject.id}/`,
          projectForm,
        );
        setProjects((prev) =>
          prev.map((p) => (p.id === editingProject.id ? res.data : p)),
        );
      } else {
        const res = await api.post("/api/projects/", projectForm);
        setProjects((prev) => [res.data, ...prev]);
      }
      setProjectDialog(false);
    } catch {
      setError("Could not save project.");
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    try {
      await api.delete(`/api/projects/${project.id}/`);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch {
      setError("Could not delete project.");
    }
  };

  const initials = profile
    ? (profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "") ||
      profile.username[0].toUpperCase()
    : "";

  // ── Loading skeleton ──
  if (!profile && !error) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <Skeleton
            variant="rounded"
            height={180}
            sx={{ mb: 3, borderRadius: 2 }}
          />
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
              height={280}
              sx={{ width: { xs: "100%", md: 200 }, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={72}
                  sx={{ mb: 1.5, borderRadius: 2 }}
                />
              ))}
            </Box>
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
          <Typography color="error">{error}</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 5 }}>
        {/* ── Hero card (full width) ── */}
        <Card sx={{ mb: 3, overflow: "visible" }}>
          <Box
            sx={{
              height: 90,
              borderRadius: "12px 12px 0 0",
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            }}
          />
          <CardContent sx={{ px: 4, pb: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Avatar
                src={profile.avatar_url || undefined}
                sx={{
                  width: 88,
                  height: 88,
                  mt: -5.5,
                  mb: 1,
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  bgcolor: "primary.dark",
                  border: "4px solid white",
                  boxShadow: 2,
                }}
              >
                {initials}
              </Avatar>

              <Stack
                direction="row"
                spacing={1}
                mt={1}
                flexWrap="wrap"
                useFlexGap
              >
                {isOwn ? (
                  <>
                    <Button
                      component={Link}
                      to="/upload"
                      variant="contained"
                      size="small"
                      startIcon={<UploadFileIcon />}
                      sx={{
                        borderRadius: 2,
                        background:
                          "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                        boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                      }}
                    >
                      Upload PDF
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      sx={{ borderRadius: 2 }}
                    >
                      {deleting ? "Deleting…" : "Delete account"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant={following ? "outlined" : "contained"}
                    size="small"
                    startIcon={
                      following ? <PersonRemoveIcon /> : <PersonAddIcon />
                    }
                    onClick={handleFollow}
                    disabled={followLoading}
                    sx={{
                      borderRadius: 2,
                      ...(!following && {
                        background:
                          "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                        boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                      }),
                    }}
                  >
                    {following ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </Stack>
            </Stack>

            <Typography variant="h5" fontWeight={700}>
              {profile.first_name || profile.username} {profile.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={0.5}>
              @{profile.username}
            </Typography>

            {profile.university && (
              <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                <SchoolIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography variant="body2" color="text.secondary">
                  {profile.university}
                </Typography>
              </Stack>
            )}
            {profile.bio && (
              <Typography
                variant="body2"
                color="text.primary"
                mt={1}
                sx={{ maxWidth: 560, lineHeight: 1.7 }}
              >
                {profile.bio}
              </Typography>
            )}

            {/* ── Interests ── */}
            {(isOwn || (profile.interests ?? []).length > 0) && (
              <Box mt={2}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    letterSpacing={0.8}
                    textTransform="uppercase"
                  >
                    Interests
                  </Typography>
                  {isOwn && !editingInterests && (
                    <EditIcon
                      onClick={handleEditInterests}
                      sx={{
                        fontSize: 14,
                        color: "text.disabled",
                        cursor: "pointer",
                        "&:hover": { color: "primary.main" },
                      }}
                    />
                  )}
                </Stack>

                {editingInterests ? (
                  <Stack spacing={1}>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={INTEREST_SUGGESTIONS}
                      value={interestsDraft}
                      onChange={(_, val) => setInterestsDraft(val)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option}
                            size="small"
                            {...getTagProps({ index })}
                            key={option}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="Add an interest…"
                        />
                      )}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveInterests}
                        disabled={savingInterests}
                        sx={{
                          borderRadius: 2,
                          background:
                            "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                        }}
                      >
                        {savingInterests ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setEditingInterests(false)}
                        disabled={savingInterests}
                        sx={{ borderRadius: 2 }}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                ) : (profile.interests ?? []).length > 0 ? (
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {profile.interests.map((interest) => (
                      <Keyword key={interest} label={interest} />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    sx={{
                      cursor: "pointer",
                      "&:hover": { color: "primary.main" },
                    }}
                    onClick={handleEditInterests}
                  >
                    Add your research interests…
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ── Two-column layout ── */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          {/* ══ LEFT — User Statistics ══ */}
          <Box
            sx={{
              width: { xs: "100%", md: 200 },
              flexShrink: 0,
              position: { xs: "static", md: "sticky" },
              top: 24,
            }}
          >
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography
                  variant="overline"
                  fontWeight={700}
                  color="text.secondary"
                  letterSpacing={1.2}
                  display="block"
                  mb={1}
                >
                  User Statistics
                </Typography>
                <MetricRow
                  icon={<UploadFileIcon fontSize="small" />}
                  label="Uploaded"
                  value={profile.pdfs_uploaded_count}
                />
                <MetricRow
                  icon={<ArticleIcon fontSize="small" />}
                  label="Authored"
                  value={profile.pdfs_authored_count}
                />
                <MetricRow
                  icon={<FormatQuoteIcon fontSize="small" />}
                  label="Citations"
                  value={profile.total_citations}
                />
                <MetricRow
                  icon={<EmojiEventsIcon fontSize="small" />}
                  label="H-index"
                  value={profile.h_index}
                />
                <MetricRow
                  icon={<PeopleIcon fontSize="small" />}
                  label="Followers"
                  value={profile.followers_count}
                />
                <MetricRow
                  icon={<PersonAddIcon fontSize="small" />}
                  label="Following"
                  value={profile.following_count}
                />
              </CardContent>
            </Card>
          </Box>

          {/* ══ RIGHT — Main content (tabbed) ══ */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Card>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
              >
                <Tab
                  label={`Publications (${publications.length})`}
                  id="profile-tab-0"
                />
                {isOwn && (
                  <Tab
                    label={`Following (${followingList.length})`}
                    id="profile-tab-1"
                  />
                )}
                {isOwn && (
                  <Tab
                    label={`Projects (${projects.length})`}
                    id="profile-tab-2"
                  />
                )}
              </Tabs>

              <CardContent>
                {/* Publications tab */}
                {tab === 0 && (
                  <Box>
                    {publications.length === 0 ? (
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
                        <ArticleIcon
                          sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
                        />
                        <Typography color="text.secondary" mb={isOwn ? 2 : 0}>
                          No publications yet.
                        </Typography>
                        {isOwn && (
                          <Button
                            component={Link}
                            to="/upload"
                            variant="contained"
                            size="small"
                            sx={{ borderRadius: 2 }}
                          >
                            Upload your first PDF
                          </Button>
                        )}
                      </Paper>
                    ) : (
                      <Stack spacing={1.5}>
                        {publications.map((pub) => (
                          <ArticleList
                            key={pub.id}
                            pub={pub}
                            showActions={isOwn}
                            onDelete={handleDeletePublication}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* Projects tab (own profile only) */}
                {isOwn && tab === 2 && (
                  <Box>
                    <Stack direction="row" justifyContent="flex-end" mb={2}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={openAddProject}
                        sx={{ borderRadius: 2 }}
                      >
                        Add project
                      </Button>
                    </Stack>
                    {projects.length === 0 ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          textAlign: "center",
                          border: "2px dashed",
                          borderColor: "divider",
                          borderRadius: 3,
                        }}
                      >
                        <FolderIcon
                          sx={{ fontSize: 36, color: "text.disabled", mb: 1 }}
                        />
                        <Typography color="text.secondary">
                          No projects yet.
                        </Typography>
                      </Paper>
                    ) : (
                      <Stack spacing={1.5}>
                        {projects.map((project) => (
                          <ProjectList
                            key={project.id}
                            project={project}
                            showActions={isOwn}
                            onEdit={openEditProject}
                            onDelete={handleDeleteProject}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}

                {/* Following tab (own profile only) */}
                {isOwn && tab === 1 && (
                  <Box>
                    {followingList.length === 0 ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          textAlign: "center",
                          border: "2px dashed",
                          borderColor: "divider",
                          borderRadius: 3,
                        }}
                      >
                        <Typography color="text.secondary">
                          You are not following anyone yet.
                        </Typography>
                      </Paper>
                    ) : (
                      <Stack spacing={1}>
                        {followingList.map((u) => (
                          <Paper
                            key={u.id}
                            elevation={0}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                              px: 2,
                              py: 1.5,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 2,
                            }}
                          >
                            <Box
                              component={Link}
                              to={`/${u.username}`}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flex: 1,
                                minWidth: 0,
                                textDecoration: "none",
                                color: "inherit",
                              }}
                            >
                              <Avatar
                                src={u.avatar_url || undefined}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  bgcolor: "primary.dark",
                                  fontSize: "1rem",
                                  flexShrink: 0,
                                }}
                              >
                                {(u.first_name?.[0] ?? "") +
                                  (u.last_name?.[0] ?? "") ||
                                  u.username[0].toUpperCase()}
                              </Avatar>
                              <Box minWidth={0}>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  noWrap
                                >
                                  {u.first_name || u.username} {u.last_name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  @{u.username}
                                </Typography>
                                {u.university && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    noWrap
                                  >
                                    {u.university}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<PersonRemoveIcon />}
                              onClick={() => handleUnfollowFromList(u.username)}
                              sx={{ borderRadius: 2, flexShrink: 0 }}
                            >
                              Unfollow
                            </Button>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>

      {/* ── Project dialog ── */}
      <Dialog
        open={projectDialog}
        onClose={() => setProjectDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingProject ? "Edit project" : "New project"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Title"
              value={projectForm.title}
              onChange={(e) =>
                setProjectForm((f) => ({ ...f, title: e.target.value }))
              }
              size="small"
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm((f) => ({ ...f, description: e.target.value }))
              }
              size="small"
              fullWidth
              multiline
              rows={3}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={projectForm.status}
                onChange={(e) =>
                  setProjectForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setProjectDialog(false)}
            disabled={savingProject}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProject}
            disabled={savingProject || !projectForm.title.trim()}
            sx={{
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            }}
          >
            {savingProject ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
