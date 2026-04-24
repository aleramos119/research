import React from "react";
import { Link } from "react-router-dom";
import { Chip } from "@mui/material";

export default function AuthorSmall({ author }) {
  if (author.username) {
    const label = `${author.first_name || author.username} ${
      author.last_name || ""
    }`.trim();
    return (
      <Chip
        component={Link}
        to={`/${author.username}`}
        label={label}
        size="small"
        clickable
        sx={{
          fontSize: "0.7rem",
          height: 20,
          bgcolor: "#eff6ff",
          color: "primary.main",
          textDecoration: "none",
          fontWeight: 500,
        }}
      />
    );
  }

  return (
    <Chip
      label={author.name}
      size="small"
      sx={{
        fontSize: "0.7rem",
        height: 20,
        bgcolor: "grey.100",
        color: "text.secondary",
        fontWeight: 500,
      }}
    />
  );
}
