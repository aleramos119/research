# CLAUDE.md — Research PDF Upload App

## Project overview

Academic PDF upload and discovery web app. Users register, upload PDFs (publications), list co-authors, and are discoverable by others via search and profile pages.

- **Backend**: Django 4.2 + Django REST Framework 3.14, SQLite (dev), session auth + CSRF
- **Frontend**: React 18 (Create React App), axios 1.x
- **PDF model**: `Publication` (not `PdfDocument`) — already exists in `api/models.py`

---

## Repo layout

```
backend/
  backend/        # Django project (settings, urls, wsgi)
  api/            # Single Django app — all models, views, serializers, urls
  manage.py
  db.sqlite3
frontend/
  src/
    App.js        # Entry point (currently just a health-check ping)
    setupProxy.js # CRA dev proxy: /api/* → http://127.0.0.1:8000
requirements.txt
PLAN-pdf-upload-app.md
```

---

## Python environment

This project uses the `web-dev` conda environment. Due to a `conda run` resolution bug, always invoke Python and pip using the direct path:
```bash
/home/ale/anaconda3/envs/web-dev/bin/python
/home/ale/anaconda3/envs/web-dev/bin/pip
```
For example: `/home/ale/anaconda3/envs/web-dev/bin/pip install ...`, `/home/ale/anaconda3/envs/web-dev/bin/python manage.py ...`

---

## Running the project

**Backend** (from `backend/`):
```bash
/home/ale/anaconda3/envs/web-dev/bin/python manage.py migrate
/home/ale/anaconda3/envs/web-dev/bin/python manage.py runserver
```

**Frontend** (from `frontend/`):
```bash
npm start   # runs on http://localhost:3000
```

The CRA dev proxy (`setupProxy.js`) forwards all `/api/*` requests to Django on port 8000 — no need to set `REACT_APP_API_URL` in development.

---

## Key decisions (locked)

| Topic | Decision |
|-------|----------|
| Auth | Django session auth + CSRF cookie. Axios uses `withCredentials: true` and sends `X-CSRFToken` header from cookie. |
| Uploader vs author | `uploaded_by` FK = who pressed upload. `authors` M2M = all credited authors. Uploader is auto-added to `authors` on save. |
| File access | Files are served through `GET /api/publications/<id>/file/` (auth-checked), never via raw `/media/` URLs — even in development. |
| Model name | **`Publication`** — never `PdfDocument`. |
| Search | `GET /api/search/?q=...` returns `{ "users": [...], "publications": [...] }`, capped at 20 per category. |

---

## Models

### `User` (custom, `api.User`)
Extends `AbstractUser`. Extra fields: `bio`, `avatar` (URL), `date_of_birth`, `phone`, `university`, `h_index`.
H-index is recalculated automatically when a `Publication`'s `citations` field changes.

### `Publication`
| Field | Type | Notes |
|-------|------|-------|
| `uploaded_by` | FK → User | Who pressed upload; `SET_NULL` on user delete |
| `authors` | M2M → User | All credited authors; uploader auto-added |
| `title` | CharField(500) | |
| `abstract` | TextField | |
| `pdf` | FileField | Stored under `publications/pdfs/`; PDF-only |
| `original_filename` | CharField(255) | Client-side name; used for `Content-Disposition` |
| `publication_type` | choices | journal, conference, book, chapter, thesis, preprint, other |
| `journal` | CharField | Journal or conference name |
| `year` | PositiveIntegerField | |
| `doi`, `isbn`, `url` | CharFields | Optional identifiers |
| `citations` | PositiveIntegerField | Triggers h-index recalc on save |
| `keywords` | CharField | Comma-separated |
| `created_at`, `updated_at` | DateTimeFields | Auto |

---

## API routes (target)

```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/logout/
GET    /api/auth/me/
DELETE /api/auth/me/

GET    /api/users/<username>/          # public profile + stats
GET    /api/search/?q=...             # { users, publications }

GET    /api/publications/             # list (supports ?mine=true, ?author=<username>)
POST   /api/publications/             # upload (multipart)
GET    /api/publications/<id>/
PATCH  /api/publications/<id>/
DELETE /api/publications/<id>/
GET    /api/publications/<id>/file/   # secure download (streams file)
```

---

## DRF permissions

- Default: `IsAuthenticated` (all endpoints require login unless explicitly overridden).
- `POST /api/auth/register/` and `POST /api/auth/login/` use `AllowAny`.
- Publication PATCH/DELETE: custom `IsUploaderOrReadOnly` — only `uploaded_by` (or admin) can mutate.

---

## Settings notes

- `AUTH_USER_MODEL = 'api.User'` — custom user model; never swap this after migrations exist.
- `CORS_ALLOW_CREDENTIALS = True` — required for session cookie to be sent cross-origin.
- `CSRF_TRUSTED_ORIGINS` must include `http://localhost:3000`.
- `DATA_UPLOAD_MAX_MEMORY_SIZE` / `FILE_UPLOAD_MAX_MEMORY_SIZE` — set to your max PDF size.
- Do **not** expose `MEDIA_URL` via Django's `static()` helper even in dev — all file access goes through the secure view.

---

## Frontend conventions

- Axios instance lives in `src/api/axios.js`: `withCredentials: true`, CSRF token injected from cookie, 401 interceptor → redirect to `/login`.
- Auth state managed in a React context/provider wrapping the entire app.
- Routes (React Router v6): `/` (home/search), `/login`, `/register`, `/:username` (profile), `/upload`, `/publications/:id`.
- Never construct `/media/...` URLs in the frontend — always call `/api/publications/<id>/file/`.

---

## Code quality standards

All code you propose must pass the pre-commit hooks without modification. Treat any violation as a bug, not a warning.

### Python (backend/)

- **Formatting**: ruff-format — 88 char line length, double quotes, trailing commas in multi-line structures
- **Imports**: sorted in three groups separated by blank lines: stdlib → third-party → local. No unused imports.
- **Linting**: no undefined names, no unused variables, no shadowed builtins (ruff rules E, F, I, W)
- **Security**: never hardcode secrets, passwords, or tokens — use environment variables. No `shell=True` in subprocess calls. No `assert` for access control. No `eval`/`exec` on user input. No SQL built by string concatenation.

### JavaScript (frontend/src/)

- **Formatting**: prettier defaults — 2-space indent, double quotes, semicolons, trailing commas in multi-line structures
- **Linting**: no unused variables, every `useEffect` must declare all its dependencies, no direct `document`/`window` mutation outside of `useEffect`
- No `console.log` left in committed code

### All files

- Never commit real secrets, API keys, tokens, or private keys anywhere in the repo — not even in comments or example values
- No trailing whitespace, files must end with a newline
- No merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)

---

## Implementation plan

See [PLAN-pdf-upload-app.md](PLAN-pdf-upload-app.md) for the full step-by-step checklist.
