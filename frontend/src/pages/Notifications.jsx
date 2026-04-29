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
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CommentIcon from "@mui/icons-material/Comment";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const NOTIFICATION_META = {
  comment: {
    icon: <CommentIcon fontSize="small" />,
    color: "secondary.main",
    message: (actor, title) => `${actor} commented on your paper "${title}"`,
  },
  co_authored: {
    icon: <ArticleIcon fontSize="small" />,
    color: "primary.main",
    message: (actor, title) =>
      `${actor} listed you as a co-author on "${title}"`,
  },
  new_pub_author: {
    icon: <ArticleIcon fontSize="small" />,
    color: "primary.main",
    message: (actor, title) => `${actor} published "${title}"`,
  },
  new_pub_subject: {
    icon: <BookmarkIcon fontSize="small" />,
    color: "success.main",
    message: (_actor, title) => `New paper in a subject you follow: "${title}"`,
  },
  new_pub_keyword: {
    icon: <BookmarkIcon fontSize="small" />,
    color: "success.main",
    message: (_actor, title) =>
      `New paper matching a keyword you follow: "${title}"`,
  },
};

function NotificationItem({ notif, onRead }) {
  const actor = notif.actor?.username ?? "Someone";
  const meta =
    NOTIFICATION_META[notif.notification_type] ?? NOTIFICATION_META.co_authored;
  const message = meta.message(actor, notif.publication_title);

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
          color: meta.color,
          flexShrink: 0,
        }}
      >
        {meta.icon}
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
