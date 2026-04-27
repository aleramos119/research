import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import CommentIcon from "@mui/icons-material/Comment";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationItem({ notif, onRead }) {
  const isComment = notif.notification_type === "comment";
  const actor = notif.actor?.username ?? "Someone";

  const message = isComment
    ? `${actor} commented on your paper "${notif.publication_title}"`
    : `${actor} listed you as a co-author on "${notif.publication_title}"`;

  const handleClick = () => {
    if (!notif.is_read) onRead(notif.id);
  };

  return (
    <Box
      component={Link}
      to={`/publications/${notif.publication}`}
      onClick={handleClick}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        px: 2,
        py: 1.5,
        textDecoration: "none",
        bgcolor: notif.is_read ? "transparent" : "primary.50",
        borderLeft: notif.is_read ? "3px solid transparent" : "3px solid",
        borderLeftColor: notif.is_read ? "transparent" : "primary.main",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box
        sx={{
          mt: 0.25,
          color: isComment ? "secondary.main" : "primary.main",
          flexShrink: 0,
        }}
      >
        {isComment ? (
          <CommentIcon fontSize="small" />
        ) : (
          <ArticleIcon fontSize="small" />
        )}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={notif.is_read ? 400 : 600}
          color="text.primary"
          sx={{ wordBreak: "break-word" }}
        >
          {message}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {timeAgo(notif.created_at)}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/notifications/")
      .then(({ data }) => setNotifications(data))
      .finally(() => setLoading(false));
  }, []);

  const handleRead = async (id) => {
    await api.post(`/api/notifications/${id}/mark_read/`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await api.post("/api/notifications/mark_all_read/");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6" fontWeight={700}>
            Notifications
            {unreadCount > 0 && (
              <Typography
                component="span"
                variant="caption"
                fontWeight={700}
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  bgcolor: "error.main",
                  color: "white",
                  borderRadius: 10,
                }}
              >
                {unreadCount}
              </Typography>
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={6}>
            No notifications yet.
          </Typography>
        ) : (
          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {notifications.map((notif, i) => (
              <React.Fragment key={notif.id}>
                <NotificationItem notif={notif} onRead={handleRead} />
                {i < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}
