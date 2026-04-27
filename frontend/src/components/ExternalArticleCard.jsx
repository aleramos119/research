import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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

const TYPE_LABELS = {
  journalarticle: "Journal",
  conference: "Conference",
  review: "Review",
  book: "Book",
  booksection: "Chapter",
  preprint: "Preprint",
  other: "Other",
};
const TYPE_COLORS = {
  journalarticle: "primary",
  conference: "secondary",
  review: "info",
  book: "success",
  booksection: "success",
  preprint: "info",
  other: "default",
};

export default function ExternalArticleCard({ paper }) {
  const typeKey = (paper.publicationType || "other").toLowerCase();
  const typeLabel = TYPE_LABELS[typeKey] ?? "Paper";
  const typeColor = TYPE_COLORS[typeKey] ?? "default";
  const authorLine =
    paper.authors.length > 0
      ? paper.authors.slice(0, 5).join(", ") +
        (paper.authors.length > 5 ? " …" : "")
      : null;

  return (
    <Card
      sx={{
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: 3 },
        borderLeft: "3px solid",
        borderColor: "secondary.light",
      }}
    >
      <CardContent sx={{ py: 2, px: 3, "&:last-child": { pb: 2 } }}>
        <Box
          sx={{ display: "flex", alignItems: "center", width: "100%", gap: 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              mb={0.5}
            >
              <Chip
                label={typeLabel}
                color={typeColor}
                size="small"
                sx={{ fontSize: "0.68rem", height: 20, fontWeight: 600 }}
              />
              {paper.year && (
                <Typography variant="caption" color="text.secondary">
                  {paper.year}
                </Typography>
              )}
              {paper.citations > 0 && (
                <Typography variant="caption" color="text.secondary">
                  · {paper.citations} citation
                  {paper.citations !== 1 ? "s" : ""}
                </Typography>
              )}
              {paper.venue && (
                <Typography variant="caption" color="text.secondary">
                  · {paper.venue}
                </Typography>
              )}
            </Stack>
            <Typography
              variant="body1"
              fontWeight={600}
              color="text.primary"
              sx={{ display: "block" }}
            >
              {paper.title}
            </Typography>
            {authorLine && (
              <Typography variant="caption" color="text.secondary" mt={0.25}>
                {authorLine}
              </Typography>
            )}
          </Box>
          {paper.url && (
            <Tooltip title="Open on external site">
              <IconButton
                component="a"
                href={paper.url}
                target="_blank"
                rel="noreferrer noopener"
                size="small"
                color="secondary"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
