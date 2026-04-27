import React from "react";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import katex from "katex";

// Split body into segments: code block, block math, inline math, mention, plain text
function tokenize(body) {
  const tokens = [];
  // Order matters: ''' before $$, $$ before $
  const re = /('''[\s\S]+?'''|\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|@\w+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      tokens.push({ type: "text", value: body.slice(last, m.index) });
    }
    const raw = m[0];
    if (raw.startsWith("'''")) {
      tokens.push({ type: "code", value: raw.slice(3, -3) });
    } else if (raw.startsWith("$$")) {
      tokens.push({ type: "block-math", value: raw.slice(2, -2) });
    } else if (raw.startsWith("$")) {
      tokens.push({ type: "inline-math", value: raw.slice(1, -1) });
    } else {
      tokens.push({ type: "mention", value: raw.slice(1) });
    }
    last = m.index + raw.length;
  }
  if (last < body.length) {
    tokens.push({ type: "text", value: body.slice(last) });
  }
  return tokens;
}

function renderMath(latex, displayMode) {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false });
  } catch {
    return latex;
  }
}

export default function CommentBody({ body }) {
  const tokens = tokenize(body);

  return (
    <Typography
      variant="body2"
      color="text.primary"
      component="span"
      sx={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
    >
      {tokens.map((tok, i) => {
        if (tok.type === "code") {
          return (
            <Box
              key={i}
              component="pre"
              sx={{
                display: "block",
                my: 1,
                p: 1.5,
                bgcolor: "grey.100",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "grey.300",
                overflowX: "auto",
                fontFamily: "monospace",
                fontSize: "0.82rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {tok.value}
            </Box>
          );
        }
        if (tok.type === "block-math") {
          return (
            <Box
              key={i}
              component="span"
              sx={{ display: "block", my: 0.5, overflowX: "auto" }}
              dangerouslySetInnerHTML={{
                __html: renderMath(tok.value, true),
              }}
            />
          );
        }
        if (tok.type === "inline-math") {
          return (
            <Box
              key={i}
              component="span"
              dangerouslySetInnerHTML={{
                __html: renderMath(tok.value, false),
              }}
            />
          );
        }
        if (tok.type === "mention") {
          return (
            <Typography
              key={i}
              component={Link}
              to={`/${tok.value}`}
              variant="body2"
              fontWeight={600}
              color="primary.main"
              sx={{
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              @{tok.value}
            </Typography>
          );
        }
        return <React.Fragment key={i}>{tok.value}</React.Fragment>;
      })}
    </Typography>
  );
}
