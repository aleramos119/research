import React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

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

export default function ProjectList({
  project,
  showActions = false,
  onEdit,
  onDelete,
}) {
  return (
    <Card sx={{ transition: "box-shadow 0.15s", "&:hover": { boxShadow: 3 } }}>
      <CardContent sx={{ py: 2, px: 2.5, "&:last-child": { pb: 2 } }}>
        <Box
          sx={{ display: "flex", alignItems: "center", width: "100%", gap: 2 }}
        >
          {/* Content */}
          <Box flex={1} minWidth={0}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              <Chip
                label={STATUS_LABELS[project.status]}
                color={STATUS_COLORS[project.status]}
                size="small"
                sx={{ fontSize: "0.68rem", height: 20 }}
              />
            </Stack>
            <Typography
              component={Link}
              to={`/projects/${project.id}`}
              variant="body1"
              fontWeight={600}
              color="text.primary"
              sx={{
                textDecoration: "none",
                "&:hover": { color: "primary.main" },
                display: "block",
              }}
            >
              {project.title}
            </Typography>
            {project.description && (
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {project.description}
              </Typography>
            )}
          </Box>

          {/* Actions */}
          {showActions && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              flexShrink={0}
              sx={{ ml: "auto" }}
            >
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit?.(project)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete?.(project)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
