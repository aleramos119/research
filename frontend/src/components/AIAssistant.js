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

// ---------------------------------------------------------------------------
// Provider config
// ---------------------------------------------------------------------------

const PROVIDERS = {
  openai: {
    label: "OpenAI",
    keyLabel: "OpenAI API key",
    keyPlaceholder: "sk-...",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo", "o1-mini", "custom"],
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    label: "Google Gemini",
    keyLabel: "Gemini API key",
    keyPlaceholder: "AIza...",
    models: [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "custom",
    ],
    defaultModel: "gemini-2.0-flash",
  },
  groq: {
    label: "Groq",
    keyLabel: "Groq API key",
    keyPlaceholder: "gsk_...",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "custom",
    ],
    defaultModel: "llama-3.3-70b-versatile",
  },
  anthropic: {
    label: "Anthropic",
    keyLabel: "Anthropic API key",
    keyPlaceholder: "sk-ant-...",
    models: [
      "claude-haiku-4-5",
      "claude-sonnet-4-5",
      "claude-opus-4-5",
      "custom",
    ],
    defaultModel: "claude-haiku-4-5",
  },
};

// ---------------------------------------------------------------------------
// API call abstraction
// ---------------------------------------------------------------------------

async function callProvider(provider, model, apiKey, messages, systemPrompt) {
  if (provider === "gemini") {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    return data.content[0].text;
  }

  // OpenAI-compatible: openai + groq
  const baseUrl =
    provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : "https://api.openai.com/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const LS_KEY = "ai_assistant_prefs";

function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY)) || {};
    // Migrate old single-provider shape
    if (raw.apiKey && !raw.keys) {
      return {
        provider: "openai",
        keys: { openai: raw.apiKey },
        models: { openai: raw.model || "gpt-4o-mini" },
        customModels: { openai: raw.customModel || "" },
      };
    }
    return raw;
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// Message parsing
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AIAssistant({
  open,
  onClose,
  content,
  onApply,
  canApply,
}) {
  const prefs = loadPrefs();

  const [provider, setProvider] = useState(prefs.provider || "openai");
  const [keys, setKeys] = useState(prefs.keys || {});
  const [models, setModels] = useState(() => {
    const stored = prefs.models || {};
    const defaults = {};
    Object.entries(PROVIDERS).forEach(([id, p]) => {
      defaults[id] = stored[id] || p.defaultModel;
    });
    return defaults;
  });
  const [customModels, setCustomModels] = useState(prefs.customModels || {});
  const [settingsOpen, setSettingsOpen] = useState(
    !prefs.keys?.[prefs.provider || "openai"],
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  // Persist prefs on every relevant change
  useEffect(() => {
    savePrefs({ provider, keys, models, customModels });
  }, [provider, keys, models, customModels]);

  // Auto-open settings when switching to a provider with no key
  useEffect(() => {
    if (!keys[provider]) setSettingsOpen(true);
  }, [provider, keys]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeKey = keys[provider] || "";
  const activeModel =
    models[provider] === "custom"
      ? (customModels[provider] || "").trim()
      : models[provider];

  const setProviderKey = (val) =>
    setKeys((prev) => ({ ...prev, [provider]: val }));

  const setProviderModel = (val) =>
    setModels((prev) => ({ ...prev, [provider]: val }));

  const setProviderCustomModel = (val) =>
    setCustomModels((prev) => ({ ...prev, [provider]: val }));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeModel || !activeKey) return;

    const userMsg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    const systemPrompt = `You are a LaTeX writing assistant. The user is editing the following LaTeX document:\n\n\`\`\`latex\n${content}\n\`\`\`\n\nWhen you propose an edit, output the **complete modified LaTeX** in a \`\`\`latex code block so the user can apply it with one click. Be concise in your explanations.`;

    try {
      const reply = await callProvider(
        provider,
        activeModel,
        activeKey,
        nextMessages,
        systemPrompt,
      );
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

  const providerCfg = PROVIDERS[provider];

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
            label={`${providerCfg.label} · ${activeModel}`}
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
              {/* Provider selector */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  minWidth={52}
                >
                  Provider
                </Typography>
                <Select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                >
                  {Object.entries(PROVIDERS).map(([id, p]) => (
                    <MenuItem key={id} value={id}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              {/* API key */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  minWidth={52}
                >
                  API key
                </Typography>
                <TextField
                  type="password"
                  value={activeKey}
                  onChange={(e) => setProviderKey(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder={providerCfg.keyPlaceholder}
                  autoComplete="off"
                />
              </Stack>

              {/* Model selector */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  minWidth={52}
                >
                  Model
                </Typography>
                <Select
                  value={models[provider]}
                  onChange={(e) => setProviderModel(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                >
                  {providerCfg.models.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m === "custom" ? "Custom…" : m}
                    </MenuItem>
                  ))}
                </Select>
                {models[provider] === "custom" && (
                  <TextField
                    value={customModels[provider] || ""}
                    onChange={(e) => setProviderCustomModel(e.target.value)}
                    size="small"
                    placeholder="model name"
                    sx={{ flex: 1 }}
                  />
                )}
              </Stack>

              <Typography variant="caption" color="text.secondary">
                Your API key is stored only in your browser and sent directly to{" "}
                {providerCfg.label}.
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
              !activeKey
                ? "Enter your API key in settings first…"
                : "Ask something… (Enter to send, Shift+Enter for newline)"
            }
            multiline
            maxRows={5}
            size="small"
            fullWidth
            disabled={!activeKey || loading}
          />
          <Tooltip title="Send (Enter)">
            <span>
              <IconButton
                onClick={handleSend}
                disabled={
                  !input.trim() || !activeKey || !activeModel || loading
                }
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
