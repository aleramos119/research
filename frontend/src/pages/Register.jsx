import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";

const INTEREST_SUGGESTIONS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "Natural Language Processing",
  "Data Science",
  "Bioinformatics",
  "Neuroscience",
  "Genomics",
  "Climate Science",
  "Quantum Computing",
  "Robotics",
  "Cybersecurity",
  "Cryptography",
  "Human-Computer Interaction",
  "Software Engineering",
  "Distributed Systems",
  "High Performance Computing",
  "Graph Theory",
  "Computational Biology",
  "Materials Science",
  "Astrophysics",
  "Particle Physics",
  "Ecology",
  "Epidemiology",
  "Public Health",
  "Economics",
  "Political Science",
  "Sociology",
  "Psychology",
  "Cognitive Science",
  "Linguistics",
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    university: "",
  });
  const [interests, setInterests] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    try {
      let payload;
      if (avatarFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append("avatar", avatarFile);
        fd.append("interests", JSON.stringify(interests));
        payload = fd;
      } else {
        payload = { ...form, interests };
      }
      await register(payload);
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") setFieldErrors(data);
      else setError("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = "text", required = false) => (
    <TextField
      key={name}
      name={name}
      label={label}
      type={type}
      value={form[name]}
      onChange={handleChange}
      required={required}
      error={!!fieldErrors[name]}
      helperText={
        Array.isArray(fieldErrors[name])
          ? fieldErrors[name][0]
          : fieldErrors[name]
      }
      fullWidth
      size="small"
    />
  );

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm">
        <Box
          sx={{
            pt: 8,
            pb: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "14px",
              mb: 2,
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(37,99,235,0.3)",
            }}
          >
            <AutoStoriesOutlinedIcon sx={{ color: "white", fontSize: 24 }} />
          </Box>

          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Create your account
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Join the ResearchHub community
          </Typography>

          {/* Avatar picker */}
          <Tooltip title="Upload a profile photo">
            <Box
              sx={{
                position: "relative",
                display: "inline-block",
                mb: 3,
              }}
            >
              <Avatar
                src={avatarPreview}
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: "2rem",
                  bgcolor: "primary.main",
                  border: "3px solid white",
                  boxShadow: 2,
                }}
              >
                {form.first_name?.[0] ||
                  form.username?.[0]?.toUpperCase() ||
                  "?"}
              </Avatar>
              <IconButton
                component="label"
                size="small"
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  bgcolor: "primary.main",
                  color: "white",
                  width: 26,
                  height: 26,
                  "&:hover": { bgcolor: "primary.dark" },
                  boxShadow: 2,
                }}
              >
                <AddAPhotoIcon sx={{ fontSize: 14 }} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
              </IconButton>
            </Box>
          </Tooltip>

          <Card sx={{ width: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  {field("username", "Username", "text", true)}
                  {field("email", "Email", "email")}
                  {field("password", "Password", "password", true)}
                  {field("first_name", "First name")}
                  {field("last_name", "Last name")}
                  {field("university", "University / affiliation")}

                  {/* Interests */}
                  <Box>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                      letterSpacing={0.8}
                      textTransform="uppercase"
                      display="block"
                      mb={1}
                    >
                      Research Interests
                    </Typography>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={INTEREST_SUGGESTIONS}
                      value={interests}
                      onChange={(_, val) => setInterests(val)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option}
                            size="small"
                            {...getTagProps({ index })}
                            key={option}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="Add an interest…"
                        />
                      )}
                    />
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    sx={{
                      py: 1.2,
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                      boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                      "&:hover": {
                        boxShadow: "0 6px 20px rgba(37,99,235,0.45)",
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary" mt={3}>
            Already have an account?{" "}
            <Typography
              component={Link}
              to="/login"
              variant="body2"
              color="primary"
              fontWeight={600}
              sx={{ textDecoration: "none" }}
            >
              Sign in
            </Typography>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
