import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import { toggleVote } from "../api/reports";

const TYPE_COLORS = { bug: "error", feature: "primary" };
const TYPE_LABELS = { bug: "Bug", feature: "Feature Request" };
const PREVIEW_LENGTH = 140;

export default function ReportCard({ report, currentUsername, onVoteChange }) {
  const [voting, setVoting] = useState(false);

  const isOwn = report.author_username === currentUsername;
  const preview =
    report.description.length > PREVIEW_LENGTH
      ? report.description.slice(0, PREVIEW_LENGTH) + "…"
      : report.description;

  const handleVote = async () => {
    if (isOwn || voting) return;
    setVoting(true);
    try {
      const res = await toggleVote(report.id);
      onVoteChange(report.id, res.data.voted, res.data.vote_count);
    } finally {
      setVoting(false);
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ py: 2, px: 3, "&:last-child": { pb: 2 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box flex={1} minWidth={0}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              mb={0.75}
              flexWrap="wrap"
            >
              <Chip
                label={TYPE_LABELS[report.type] || report.type}
                color={TYPE_COLORS[report.type] || "default"}
                size="small"
                sx={{ fontSize: "0.68rem", height: 20, fontWeight: 600 }}
              />
              {report.author_username && (
                <Typography variant="caption" color="text.secondary">
                  by @{report.author_username}
                </Typography>
              )}
            </Stack>
            <Typography
              variant="body1"
              fontWeight={600}
              color="text.primary"
              mb={0.5}
            >
              {report.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              {preview}
            </Typography>
          </Box>

          <Stack alignItems="center" flexShrink={0} spacing={0.5}>
            <Button
              size="small"
              variant={report.has_voted ? "contained" : "outlined"}
              color="primary"
              startIcon={<ThumbUpIcon sx={{ fontSize: "0.9rem !important" }} />}
              onClick={handleVote}
              disabled={isOwn || voting}
              title={isOwn ? "You cannot vote on your own report" : ""}
              sx={{ borderRadius: 2, minWidth: 96, fontSize: "0.78rem" }}
            >
              {report.has_voted ? "Voted" : "Me too"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              {report.vote_count} vote{report.vote_count !== 1 ? "s" : ""}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
