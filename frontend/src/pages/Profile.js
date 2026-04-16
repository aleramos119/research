import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ArticleIcon from "@mui/icons-material/Article";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import ArticleList from "../components/ArticleList";

function StatCard({ value, label, icon }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 90,
        p: 2,
        textAlign: "center",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
      }}
    >
      {icon && (
        <Box sx={{ color: "primary.main", mb: 0.25, lineHeight: 1 }}>
          {icon}
        </Box>
      )}
      <Typography variant="h4" fontWeight={800} color="text.primary">
        {value ?? 0}
      </Typography>
      <Typography
        variant="overline"
        color="text.secondary"
        fontSize="0.65rem"
        letterSpacing={1}
      >
        {label}
      </Typography>
    </Paper>
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

  const initials = profile
    ? (profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "") ||
      profile.username[0].toUpperCase()
    : "";

  // ── Loading skeleton ──
  if (!profile && !error) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 5 }}>
          <Card sx={{ mb: 3, overflow: "visible" }}>
            <Skeleton
              variant="rectangular"
              height={90}
              sx={{ borderRadius: "12px 12px 0 0" }}
            />
            <CardContent sx={{ px: 4, pb: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Skeleton
                  variant="circular"
                  width={88}
                  height={88}
                  sx={{ mt: -5 }}
                />
                <Box />
              </Stack>
              <Skeleton width="40%" height={32} sx={{ mt: 1 }} />
              <Skeleton width="22%" height={22} />
              <Skeleton width="50%" height={20} sx={{ mt: 0.5 }} />
            </CardContent>
          </Card>
          <Stack direction="row" spacing={2} mb={3}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={80}
                sx={{ flex: 1, borderRadius: 3 }}
              />
            ))}
          </Stack>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={72}
              sx={{ mb: 1.5, borderRadius: 2 }}
            />
          ))}
        </Container>
      </Box>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 5 }}>
          <Typography color="error">{error}</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* ── Hero card ── */}
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

              <Stack direction="row" spacing={1} mt={1}>
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
          </CardContent>
        </Card>

        {/* ── Stats ── */}
        <Stack direction="row" spacing={1.5} mb={4} flexWrap="wrap">
          <StatCard value={profile.pdfs_uploaded_count} label="Uploaded" />
          <StatCard value={profile.pdfs_authored_count} label="Authored" />
          <StatCard
            value={profile.total_citations}
            label="Citations"
            icon={<FormatQuoteIcon fontSize="small" />}
          />
          <StatCard value={profile.h_index} label="H-index" />
          <StatCard value={profile.followers_count} label="Followers" />
          <StatCard value={profile.following_count} label="Following" />
        </Stack>

        {/* ── Following (own profile only) ── */}
        {isOwn && (
          <Box mb={4}>
            <Divider sx={{ mb: 3 }} />
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
            >
              <Typography variant="h6" fontWeight={700}>
                Following
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {followingList.length} people
              </Typography>
            </Stack>
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
                        {(u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "") ||
                          u.username[0].toUpperCase()}
                      </Avatar>
                      <Box minWidth={0}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {u.first_name || u.username} {u.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
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
            <Divider sx={{ mt: 3 }} />
          </Box>
        )}

        {/* ── Publications ── */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6" fontWeight={700}>
            Publications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {publications.length} total
          </Typography>
        </Stack>

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
            <ArticleIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
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
      </Container>
    </Box>
  );
}
