import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get("/api/notifications/unread_count/");
      setUnreadCount(data.count);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(intervalRef.current);
  }, [user, fetchUnreadCount]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppBar position="static">
      <Toolbar
        sx={{
          maxWidth: 960,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          minHeight: 56,
        }}
      >
        <Typography
          component={Link}
          to="/"
          variant="h6"
          fontWeight={800}
          letterSpacing="-0.5px"
          sx={{
            flexGrow: 1,
            textDecoration: "none",
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ResearchHub
        </Typography>

        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Notifications">
              <IconButton
                component={Link}
                to="/notifications"
                size="small"
                sx={{ color: "text.secondary" }}
              >
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  max={99}
                  sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem" } }}
                >
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button
              component={Link}
              to="/feedback"
              size="small"
              startIcon={<BugReportIcon sx={{ fontSize: "1rem !important" }} />}
              sx={{
                borderRadius: 2,
                fontSize: "0.8rem",
                color: "text.secondary",
                minWidth: 0,
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.5 } },
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                Feedback
              </Box>
            </Button>
            <Chip
              component={Link}
              to={`/${user.username}`}
              avatar={
                <Avatar
                  sx={{
                    bgcolor: "primary.main",
                    width: 24,
                    height: 24,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {user.username[0].toUpperCase()}
                </Avatar>
              }
              label={
                <Box
                  component="span"
                  sx={{ display: { xs: "none", sm: "inline" } }}
                >
                  {user.username}
                </Box>
              }
              clickable
              size="small"
              sx={{
                textDecoration: "none",
                fontWeight: 500,
                bgcolor: "grey.100",
                "& .MuiChip-label": { px: { xs: 0.5, sm: 1 } },
              }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<LogoutIcon sx={{ fontSize: "1rem !important" }} />}
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                fontSize: "0.8rem",
                px: { xs: 1, sm: 1.5 },
                py: 0.5,
                color: "text.secondary",
                borderColor: "divider",
                minWidth: 0,
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.5 } },
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                Sign out
              </Box>
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
