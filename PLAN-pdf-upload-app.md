# Plan: PDF upload web app (Django + React)

Editable checklist. The repo has Django (`backend/`) and Create React App (`frontend/`) with **axios** (`^1.6.0` in `package.json`; lock may resolve a newer 1.x).

**Follow phases in order** unless a step says it can run in parallel. Check boxes as you complete work.

The PDF model is named **`Publication`** (already exists in `api/models.py`).

---

## 0. Goals and scope

- [x] **Objective**: Web service where users upload PDFs; uploads and users are **discoverable** by others (search + profile pages).
- [x] **Product behavior**:
  - [x] Login with **username and password**.
  - [x] **Personal page** lists all PDFs that user has uploaded; show **stats** (e.g. total PDF count; add file size or upload date later if useful).
  - [x] Each PDF has **metadata** (e.g. title, optional description, **authorship**).
  - [x] **Many authors per PDF**: a PDF can list several users as authors; it appears on **each author's** profile/discoverability (not only the uploader's page—define rules in §2).
  - [x] **Home page** has a **search bar** returning matches for **users** and **PDFs** (by name/title at minimum).
  - [x] PDFs stored **securely** (see §8)—files not world-readable by URL guessing alone.
- [x] **Technical requirements**:
  - [x] Backend: **Django** + **Django REST Framework (DRF)**.
  - [x] Frontend: **React**.

---

## 1. Baseline decisions (already partially done — verify and lock in)

- [x] **Python / pip**: virtualenv exists; Django, djangorestframework, django-cors-headers, django-filter pinned in `requirements.txt`.
- [x] **Author vs uploader rule** (already chosen — document in code):
  - [x] **Option A**: `uploaded_by` is a separate FK (who pressed upload); `authors` M2M adds co-authors. Uploader is auto-added to `authors` on save.
- [x] **Auth token strategy**:
  - [x] **Option A**: **Session** auth + CSRF cookie (`axios` `withCredentials: true`, `CORS_ALLOW_CREDENTIALS`, `CSRF_TRUSTED_ORIGINS`).
- [x] **Search scope**: match user `username`; match `Publication` `title` and `original_filename`.

---

## 2. Backend — settings hardening (do before adding endpoints)

- [x] `rest_framework`, `corsheaders`, `api` in `INSTALLED_APPS`.
- [x] CORS: `CORS_ALLOWED_ORIGINS` allows `http://localhost:3000`, `CORS_ALLOW_CREDENTIALS = True`.
- [x] `MEDIA_ROOT`, `MEDIA_URL` configured.
- [x] `AUTH_USER_MODEL = 'api.User'` set.
- [x] **DRF auth classes**: `DEFAULT_AUTHENTICATION_CLASSES = [SessionAuthentication]`, `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`.
- [x] **CSRF**: `CSRF_TRUSTED_ORIGINS = ["http://localhost:3000"]` added.
- [x] **Upload limits**: `DATA_UPLOAD_MAX_MEMORY_SIZE` and `FILE_UPLOAD_MAX_MEMORY_SIZE` set to 20 MB.

---

## 3. Backend — user model and auth endpoints

- [x] Custom `User` model exists (`AbstractUser` + bio, university, h_index, etc.).
- [x] **Registration**: `POST /api/auth/register/` — create user, validate username/password strength, auto-login (set session) and return user data.
- [x] **Login**: `POST /api/auth/login/` — Django `authenticate` + `login()`; return user data on success, 401 on failure.
- [x] **Logout**: `POST /api/auth/logout/` — call `django.contrib.auth.logout(request)`; return 204.
- [x] **Current user**: `GET /api/auth/me/` — return id, username, stats (publications_count, total_citations, h_index); 401 if not authenticated.
- [x] **Delete account**: `DELETE /api/auth/me/` — if user is the sole `uploaded_by` on a `Publication` and has no other co-authors, delete the file and row; if other authors exist, remove user from `authors` M2M and set `uploaded_by` to `None`; then delete the `User` row and clear session.

---

## 4. Backend — Publication model (extend existing)

- [x] `Publication` model exists with: `title`, `abstract`, `authors` (M2M to User), `publication_type`, `journal`, `year`, `doi`, `url`, `pdf` (FileField), `citations`, `keywords`, `created_at`, `updated_at`.
- [x] **Add `uploaded_by`**: `ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='uploaded_publications')`.
- [x] **Add `original_filename`**: `CharField(max_length=255, blank=True)`.
- [x] **Auto-add uploader to authors**: `save()` override ensures `uploaded_by` is always in `authors`.
- [x] **PDF-only validation**: `validate_pdf()` checks extension (`.pdf`) and magic bytes (`%PDF-`).
- [x] Migrations run (`0002`).

---

## 5. Backend — Publication API (CRUD + list)

- [x] **Create** (`POST /api/publications/`): authenticated; sets `uploaded_by=request.user`; saves `original_filename`; runs PDF validation.
- [x] **List "my uploads"** (`GET /api/publications/?mine=true`): filter by `uploaded_by=request.user`.
- [x] **List "on user profile"** (`GET /api/publications/?author=<username>`): filter by `authors__username`.
- [x] **Retrieve** (`GET /api/publications/<id>/`): any authenticated user.
- [x] **Update metadata** (`PATCH /api/publications/<id>/`): `IsUploaderOrReadOnly` permission.
- [x] **Delete** (`DELETE /api/publications/<id>/`): `IsUploaderOrReadOnly`; `Publication.delete()` removes file from disk.
- [x] **Permissions**: `IsUploaderOrReadOnly` custom permission class applied to viewset.

---

## 6. Backend — statistics

- [x] `pdfs_uploaded_count` and `pdfs_authored_count` exposed on `UserSerializer` (used by `/api/auth/me/` and `/api/users/<username>/`).
- [x] `total_citations` and `h_index` already on model; exposed via serializer.

---

## 7. Backend — search API

- [x] `GET /api/search/?q=...` implemented.
- [x] Returns `{ "users": [...], "publications": [...] }`.
- [x] Users: `icontains` on `username`, `first_name`, `last_name`; inactive users excluded.
- [x] Publications: `icontains` on `title` and `original_filename`.
- [x] Capped at 20 results per category.

---

## 8. Backend — secure file delivery

- [x] `GET /api/publications/<id>/file/` action on `PublicationViewSet` — auth-checked, streams with `FileResponse`, sets `Content-Disposition`.
- [x] Raw `/media/` URL **not** exposed — removed `static()` helper from `backend/urls.py` even in dev.

---

## 9. Frontend — foundation

- [x] React Router v7 installed (`npm install react-router-dom`).
- [x] Top-level `<Routes>` in `App.js`: `/`, `/login`, `/register`, `/upload`, `/:username`.
- [x] `REACT_APP_API_URL` env var supported (defaults to empty string for CRA proxy).
- [x] Axios instance at `src/api/axios.js`: `withCredentials: true`, CSRF header injected from cookie, 401 → redirect to `/login`.

---

## 10. Frontend — authentication UI

- [x] **Register** page (`src/pages/Register.js`) → `POST /api/auth/register/` → auto-login → home.
- [x] **Login** page (`src/pages/Login.js`) → `POST /api/auth/login/` → home.
- [x] **Logout** button in navbar → `POST /api/auth/logout/` → clears auth state.
- [x] **Auth context/provider** (`src/contexts/AuthContext.js`): holds user, restores session on mount via `/api/auth/me/`.
- [x] **Protected route** (`src/components/ProtectedRoute.js`): redirects to `/login`.
- [x] **Delete account** on profile page: confirm dialog → `DELETE /api/auth/me/` → redirect home.

---

## 11. Frontend — upload PDF

- [x] Form at `src/pages/Upload.js`: file input (`accept=".pdf"`), title, type, journal, year, DOI, keywords, abstract.
- [x] `FormData` + `axios.post` with upload progress bar.
- [x] Error handling: 400, 401, 413 — user-friendly messages.
- [x] On success: redirect to `/:username`.

---

## 12. Frontend — user profile page (`/:username`)

- [x] `src/pages/Profile.js` fetches user via `GET /api/users/<username>/` and publications via `GET /api/publications/?author=<username>`.
- [x] Stats displayed: uploaded, authored, citations, h-index.
- [x] Publication list with download links to `/api/publications/<id>/file/` — no raw `/media/` URLs.
- [x] Own profile shows Delete buttons per publication and Delete account button.

---

## 13. Frontend — home + search

- [x] `src/pages/Home.js`: navbar with user link, upload button, sign-out; centered search bar.
- [x] Debounced search (300 ms) → `GET /api/search/?q=...`.
- [x] Two result sections: Users (link to profile) and Publications (download + author chips).
- [x] Empty state and no-results state.

---

## 14. Testing and hardening

- [ ] **Backend tests** (use Django `TestCase` or `pytest-django`):
  - [ ] Registration, login, logout.
  - [ ] Upload rejected for non-PDF (extension and magic bytes).
  - [ ] Upload rejected over size limit.
  - [ ] Authors M2M: uploader auto-added to `authors`.
  - [ ] PATCH blocked for non-author.
  - [ ] Delete removes file from disk.
  - [ ] Secure file view returns 401 for unauthenticated request.
  - [ ] Search returns correct structure.
  - [ ] Delete account: orphan rule (file deleted vs. transferred).
- [ ] **Manual**: cross-browser upload; search with accents/mixed case; delete user with PDFs.

---

## 15. Production checklist

- [ ] `DEBUG=False`, `ALLOWED_HOSTS` set, HTTPS, `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`.
- [ ] **Storage**: S3-compatible backend + `django-storages` if not local disk; update secure file view to generate signed URLs.
- [ ] Secrets via environment variables; never commit `.env` with real keys.
- [ ] Serve frontend static build via Django `whitenoise` or a CDN — do not use `npm start` in production.

---

*Implement top to bottom. §1–§2 decisions are locked; edit §3 (delete behavior) and §5 (edit permissions policy) if product rules change.*
