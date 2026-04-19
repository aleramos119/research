import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";

const PRESET_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "o1-mini", label: "o1-mini" },
  { value: "custom", label: "Custom…" },
];

const LS_KEY = "ai_assistant_prefs";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

// Split a message into alternating text / code-block parts
function parseMessageParts(text) {
  const parts = [];
  const re = /```(?:latex|tex)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last)
      parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "code", content: m[1].trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < text.length)
    parts.push({ type: "text", content: text.slice(last) });
  return parts;
}

function CodeBlock({ code, onApply, canApply }) {
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    onApply(code);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <Box
      sx={{
        my: 1,
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          bgcolor: "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#a6adc8", fontFamily: "monospace" }}
        >
          latex
        </Typography>
        {canApply && (
          <Button
            size="small"
            variant="outlined"
            startIcon={applied ? <CheckIcon /> : undefined}
            onClick={handleApply}
            sx={{
              fontSize: "0.65rem",
              py: 0.2,
              px: 1,
              minWidth: 0,
              borderColor: applied ? "success.main" : "primary.main",
              color: applied ? "success.main" : "primary.main",
            }}
          >
            {applied ? "Applied" : "Apply edit"}
          </Button>
        )}
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          bgcolor: "#11111b",
          color: "#cdd6f4",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.78rem",
          lineHeight: 1.6,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {code}
      </Box>
    </Box>
  );
}

function Message({ msg, onApply, canApply }) {
  const isUser = msg.role === "user";
  const parts = isUser ? null : parseMessageParts(msg.content);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        mb: 1.5,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: "text.disabled", mb: 0.3, px: 0.5 }}
      >
        {isUser ? "You" : "AI"}
      </Typography>

      <Box
        sx={{
          maxWidth: "90%",
          bgcolor: isUser ? "primary.main" : "rgba(255,255,255,0.05)",
          color: isUser ? "primary.contrastText" : "text.primary",
          borderRadius: 2,
          px: 1.5,
          py: 1,
          fontSize: "0.85rem",
          lineHeight: 1.6,
        }}
      >
        {isUser ? (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {msg.content}
          </Typography>
        ) : (
          parts.map((part, i) =>
            part.type === "code" ? (
              <CodeBlock
                key={i}
                code={part.content}
                onApply={onApply}
                canApply={canApply}
              />
            ) : (
              <Typography
                key={i}
                variant="body2"
                sx={{ whiteSpace: "pre-wrap" }}
              >
                {part.content}
              </Typography>
            ),
          )
        )}
      </Box>
    </Box>
  );
}

export default function AIAssistant({
  open,
  onClose,
  content,
  onApply,
  canApply,
}) {
  const prefs = loadPrefs();

  const [apiKey, setApiKey] = useState(prefs.apiKey || "");
  const [modelChoice, setModelChoice] = useState(
    PRESET_MODELS.find((m) => m.value === prefs.model)
      ? prefs.model
      : "gpt-4o-mini",
  );
  const [customModel, setCustomModel] = useState(prefs.customModel || "");
  const [settingsOpen, setSettingsOpen] = useState(!prefs.apiKey);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  // Persist prefs whenever they change
  useEffect(() => {
    savePrefs({ apiKey, model: modelChoice, customModel });
  }, [apiKey, modelChoice, customModel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeModel =
    modelChoice === "custom" ? customModel.trim() : modelChoice;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeModel || !apiKey) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    const systemPrompt = `You are a LaTeX writing assistant. The user is editing the following LaTeX document:\n\n\`\`\`latex\n${content}\n\`\`\`\n\nWhen you propose an edit, output the **complete modified LaTeX** in a \`\`\`latex code block so the user can apply it with one click. Be concise in your explanations.`;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: "system", content: systemPrompt },
            ...nextMessages,
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "(empty response)";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { height: "80vh", display: "flex", flexDirection: "column" },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{ py: 1.5, display: "flex", alignItems: "center", gap: 1 }}
      >
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          AI Assistant
        </Typography>
        {activeModel && (
          <Chip
            label={activeModel}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.7rem" }}
          />
        )}
        <Tooltip title="Settings">
          <IconButton size="small" onClick={() => setSettingsOpen((v) => !v)}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          p: 0,
          overflow: "hidden",
        }}
      >
        {/* Settings panel */}
        <Collapse in={settingsOpen}>
          <Box sx={{ p: 2, bgcolor: "action.hover" }}>
            <Stack spacing={1.5}>
              <TextField
                label="OpenAI API key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                size="small"
                fullWidth
                placeholder="sk-..."
                autoComplete="off"
              />
              <Stack direction="row" spacing={1}>
                <Select
                  value={modelChoice}
                  onChange={(e) => setModelChoice(e.target.value)}
                  size="small"
                  sx={{ minWidth: 180 }}
                >
                  {PRESET_MODELS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
                {modelChoice === "custom" && (
                  <TextField
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    size="small"
                    placeholder="e.g. gpt-4-turbo"
                    sx={{ flex: 1 }}
                  />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Your API key is stored only in your browser and sent directly to
                OpenAI.
              </Typography>
            </Stack>
          </Box>
          <Divider />
        </Collapse>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {messages.length === 0 && !loading && (
            <Box sx={{ textAlign: "center", mt: 6 }}>
              <Typography color="text.secondary" variant="body2">
                Ask anything about the document — grammar, structure, citations,
                or request a specific edit.
              </Typography>
            </Box>
          )}
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} onApply={onApply} canApply={canApply} />
          ))}
          {loading && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
            >
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Thinking…
              </Typography>
            </Box>
          )}
          {error && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: "block", mb: 1 }}
            >
              {error}
            </Typography>
          )}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box sx={{ p: 1.5, display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !apiKey
                ? "Enter your API key in settings first…"
                : "Ask something… (Enter to send, Shift+Enter for newline)"
            }
            multiline
            maxRows={5}
            size="small"
            fullWidth
            disabled={!apiKey || loading}
          />
          <Tooltip title="Send (Enter)">
            <span>
              <IconButton
                onClick={handleSend}
                disabled={!input.trim() || !apiKey || !activeModel || loading}
                color="primary"
              >
                {loading ? <CircularProgress size={20} /> : <SendIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
