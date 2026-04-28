import React from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AuthorMedium from "./AuthorMedium";
import Keyword from "./Keyword";
import { subjectLabel } from "../constants/subjects";

const TYPE_LABELS = {
  journal: "Journal Article",
  conference: "Conference Paper",
  book: "Book",
  chapter: "Book Chapter",
  thesis: "Thesis",
  preprint: "Preprint",
  other: "Other",
};
const TYPE_COLORS = {
  journal: "primary",
  conference: "secondary",
  book: "success",
  chapter: "success",
  thesis: "warning",
  preprint: "info",
  other: "default",
};

export default function ArticleLarge({ pub, id }) {
  const keywords = pub.keywords
    ? pub.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  return (
    <Card id={id}>
      <Box
        sx={{
          height: 5,
          background: "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)",
        }}
      />
      <CardContent sx={{ p: 3.5 }}>
        {/* Type chip */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={1.5}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={TYPE_LABELS[pub.publication_type] || pub.publication_type}
              color={TYPE_COLORS[pub.publication_type] || "default"}
              size="small"
              sx={{ fontWeight: 600, fontSize: "0.72rem" }}
            />
            {pub.subject && (
              <Chip
                label={subjectLabel(pub.subject)}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.72rem", fontWeight: 500 }}
              />
            )}
          </Stack>
        </Stack>

        {/* Title */}
        <Typography
          variant="h5"
          fontWeight={700}
          lineHeight={1.35}
          sx={{ mb: 3 }}
        >
          {pub.title}
        </Typography>

        {/* Authors */}
        <Stack
          direction="row"
          flexWrap="wrap"
          spacing={2}
          sx={{ mb: 3 }}
          alignItems="center"
        >
          {pub.authors.map((a) => (
            <AuthorMedium key={`r-${a.id}`} author={a} />
          ))}
          {pub.external_authors?.map((a) => (
            <AuthorMedium key={`e-${a.id}`} author={a} />
          ))}
        </Stack>

        {/* Keywords */}
        {keywords.length > 0 && (
          <Stack direction="row" alignItems="flex-start" gap={1} mb={2}>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={500}
              sx={{ lineHeight: "24px", whiteSpace: "nowrap" }}
            >
              Keywords:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {keywords.map((k) => (
                <Keyword key={k} label={k} />
              ))}
            </Stack>
          </Stack>
        )}

        {/* Identifiers */}
        {(pub.doi || pub.isbn || pub.url) && (
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {pub.doi && (
              <Typography variant="body2" color="text.secondary">
                DOI:{" "}
                <Typography
                  component="a"
                  href={`https://doi.org/${pub.doi}`}
                  target="_blank"
                  rel="noreferrer"
                  variant="body2"
                  color="primary"
                  sx={{
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {pub.doi}
                </Typography>
              </Typography>
            )}
            {pub.isbn && (
              <Typography variant="body2" color="text.secondary">
                ISBN: {pub.isbn}
              </Typography>
            )}
            {pub.url && (
              <Typography
                component="a"
                href={pub.url}
                target="_blank"
                rel="noreferrer"
                variant="body2"
                color="primary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                External link <OpenInNewIcon sx={{ fontSize: 13 }} />
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
