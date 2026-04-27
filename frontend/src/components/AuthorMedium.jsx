import React from "react";
import { Link } from "react-router-dom";
import { Avatar, Stack, Typography } from "@mui/material";

export default function AuthorMedium({ author }) {
  if (author.username) {
    const initials = (
      author.first_name?.[0] || author.username[0]
    ).toUpperCase();
    const name = `${author.first_name || author.username} ${
      author.last_name || ""
    }`.trim();
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.7}
        component={Link}
        to={`/${author.username}`}
        sx={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          "&:hover .author-name": { color: "primary.main" },
        }}
      >
        <Avatar
          src={author.avatar_url || undefined}
          sx={{
            width: 40,
            height: 40,
            bgcolor: "primary.main",
            fontSize: "0.9rem",
            fontWeight: 700,
          }}
        >
          {initials}
        </Avatar>
        <Typography
          className="author-name"
          variant="body2"
          fontWeight={600}
          color="text.primary"
          sx={{ transition: "color 0.15s" }}
        >
          {name}
        </Typography>
      </Stack>
    );
  }

  const initials = author.name[0].toUpperCase();
  return (
    <Stack direction="row" alignItems="center" spacing={0.7}>
      <Avatar
        sx={{
          width: 40,
          height: 40,
          bgcolor: "grey.400",
          fontSize: "0.9rem",
          fontWeight: 700,
        }}
      >
        {initials}
      </Avatar>
      <Typography variant="body2" fontWeight={600} color="text.secondary">
        {author.name}
      </Typography>
    </Stack>
  );
}
