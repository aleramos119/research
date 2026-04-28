import json
import os

from django.contrib.auth import login, logout
from django.db.models import Count, Prefetch
from django.http import FileResponse
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import (
    SAFE_METHODS,
    AllowAny,
    BasePermission,
    IsAuthenticated,
)
from rest_framework.response import Response

from .models import (
    Comment,
    ExternalAuthor,
    Notification,
    Project,
    ProjectFile,
    ProjectFolder,
    Publication,
    PublicationTag,
    Report,
    User,
)
from .semantic_scholar import RateLimitError, search_semantic_scholar
from .serializers import (
    CommentSerializer,
    CompactUserSerializer,
    HIndexUpdateSerializer,
    LoginSerializer,
    NotificationSerializer,
    ProjectFileSerializer,
    ProjectFolderSerializer,
    ProjectSerializer,
    PublicationSerializer,
    ReportSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

# ---------------------------------------------------------------------------
# Custom permissions
# ---------------------------------------------------------------------------


class IsUploaderOrReadOnly(BasePermission):
    """
    - Safe methods: any authenticated user.
    - DELETE: any author (they remove themselves; backend decides full-delete vs.
      authorship-remove).
    - Other mutations (PATCH, PUT): uploader only.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.method == "DELETE":
            return (
                obj.authors.filter(pk=request.user.pk).exists() or request.user.is_staff
            )
        return obj.uploaded_by == request.user or request.user.is_staff


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "message": "Django API is running"})


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register/"""
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        _claim_external_author_publications(user)
        login(request, user)
        return Response(
            UserSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def user_login(request):
    """POST /api/auth/login/"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data["user"]
        login(request, user)
        return Response(UserSerializer(user, context={"request": request}).data)
    return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["POST"])
def user_logout(request):
    """POST /api/auth/logout/"""
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "PATCH", "DELETE"])
def me(request):
    """GET/PATCH/DELETE /api/auth/me/"""
    user = request.user

    if request.method == "GET":
        return Response(UserSerializer(user, context={"request": request}).data)

    if request.method == "PATCH":
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user, context={"request": request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE — orphan rule
    for pub in Publication.objects.filter(uploaded_by=user):
        other_authors = pub.authors.exclude(pk=user.pk)
        if other_authors.exists():
            pub.authors.remove(user)
            pub.uploaded_by = None
            pub.save()
        else:
            pub.delete()  # Publication.delete() removes the file from disk

    for pub in Publication.objects.filter(authors=user):
        pub.authors.remove(user)

    logout(request)
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# User viewset (public profiles)
# ---------------------------------------------------------------------------


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only profile endpoints. Lookup by username."""

    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    lookup_field = "username"

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    @action(detail=True, methods=["post"])
    def update_h_index(self, request, username=None):
        user = self.get_object()
        serializer = HIndexUpdateSerializer(data=request.data)
        if serializer.is_valid():
            new_h = user.update_h_index(serializer.validated_data["citation_counts"])
            return Response({"h_index": new_h})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def following(self, request, username=None):
        """GET /api/users/<username>/following/ — list of users they follow."""
        target = self.get_object()
        qs = target.following.filter(is_active=True).order_by("username")
        serializer = CompactUserSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def follow(self, request, username=None):
        target = self.get_object()
        if target == request.user:
            return Response(
                {"detail": "You cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.following.add(target)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def unfollow(self, request, username=None):
        target = self.get_object()
        request.user.following.remove(target)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Publication viewset
# ---------------------------------------------------------------------------


class PublicationViewSet(viewsets.ModelViewSet):
    serializer_class = PublicationSerializer
    permission_classes = [IsAuthenticated, IsUploaderOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "original_filename", "keywords", "journal", "subject"]
    ordering_fields = ["year", "citations", "created_at", "title"]
    ordering = ["-year"]

    def _sync_tags(self, pub, tags_raw):
        try:
            tags_data = json.loads(tags_raw) if isinstance(tags_raw, str) else tags_raw
        except (json.JSONDecodeError, TypeError):
            return
        if not isinstance(tags_data, list):
            return
        pub.pub_tags.all().delete()
        for item in tags_data:
            tag = item.get("tag", "").strip()
            if tag not in PublicationTag.Tag.values:
                continue
            refers_to_id = item.get("refers_to") or None
            PublicationTag.objects.create(
                publication=pub,
                tag=tag,
                refers_to_id=refers_to_id,
            )

    def get_queryset(self):
        qs = Publication.objects.select_related("uploaded_by").prefetch_related(
            "authors",
            "external_authors",
            "pub_tags",
            "pub_tags__refers_to",
        )

        mine = self.request.query_params.get("mine")
        if mine:
            return qs.filter(uploaded_by=self.request.user)

        author = self.request.query_params.get("author")
        if author:
            return qs.filter(authors__username=author)

        subject = self.request.query_params.get("subject")
        if subject:
            qs = qs.filter(subject=subject)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pub = serializer.save()
        if "tags" in request.data:
            self._sync_tags(pub, request.data.get("tags", "[]"))
        return Response(
            self.get_serializer(pub).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        pub = self.get_object()
        serializer = self.get_serializer(pub, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        pub = serializer.save()
        if "tags" in request.data:
            self._sync_tags(pub, request.data.get("tags", "[]"))
        return Response(self.get_serializer(pub).data)

    def destroy(self, request, *args, **kwargs):
        pub = self.get_object()
        other_authors = pub.authors.exclude(pk=request.user.pk)
        if other_authors.exists():
            # Other authors remain — just remove the requesting user
            pub.authors.remove(request.user)
            if pub.uploaded_by == request.user:
                pub.uploaded_by = None
                pub.save()
        else:
            # Sole author — delete the publication and its file
            pub.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="check-duplicate")
    def check_duplicate(self, request):
        """GET /api/publications/check-duplicate/?title=...&doi=...
        Returns publications that share the same title or DOI."""
        from django.db.models import Q

        title = request.query_params.get("title", "").strip()
        doi = request.query_params.get("doi", "").strip()

        if not title and not doi:
            return Response({"duplicates": []})

        q = Q()
        if doi:
            q |= Q(doi__iexact=doi)
        if title:
            q |= Q(title__iexact=title)

        qs = (
            Publication.objects.filter(q)
            .select_related("uploaded_by")
            .prefetch_related(
                "authors", "external_authors", "pub_tags", "pub_tags__refers_to"
            )[:5]
        )
        return Response(
            {
                "duplicates": PublicationSerializer(
                    qs, many=True, context={"request": request}
                ).data
            }
        )

    @action(detail=False, methods=["get"])
    def recommended(self, request):
        """GET /api/publications/recommended/ — publications matching user interests."""
        from django.db.models import Q

        interests = getattr(request.user, "interests", None) or []
        if not interests:
            return Response([])

        q = Q()
        for term in interests:
            q |= Q(title__icontains=term)
            q |= Q(keywords__icontains=term)
            q |= Q(abstract__icontains=term)

        ordering = request.query_params.get("ordering", "relevance")

        qs = (
            Publication.objects.filter(q)
            .select_related("uploaded_by")
            .prefetch_related(
                "authors", "external_authors", "pub_tags", "pub_tags__refers_to"
            )
            .distinct()
        )

        if ordering == "citations":
            qs = qs.order_by("-citations", "-created_at")[:20]
            return Response(
                PublicationSerializer(qs, many=True, context={"request": request}).data
            )

        if ordering == "created_at":
            qs = qs.order_by("-created_at")[:20]
            return Response(
                PublicationSerializer(qs, many=True, context={"request": request}).data
            )

        # relevance / score — Python-side ranking
        interest_terms = [i.lower() for i in interests]

        def match_count(pub):
            text = f"{pub.title} {pub.keywords} {pub.abstract}".lower()
            return sum(1 for t in interest_terms if t in text)

        pub_list = list(qs)
        if ordering == "score":
            pub_list.sort(
                key=lambda p: match_count(p) * (p.citations + 1), reverse=True
            )
        else:  # relevance
            pub_list.sort(key=match_count, reverse=True)

        return Response(
            PublicationSerializer(
                pub_list[:20], many=True, context={"request": request}
            ).data
        )

    @action(detail=True, methods=["get"], url_path="file")
    def file(self, request, pk=None):
        """GET /api/publications/<id>/file/ — auth-checked file download."""
        pub = self.get_object()
        if not pub.pdf:
            return Response(
                {"detail": "No file attached."}, status=status.HTTP_404_NOT_FOUND
            )
        filename = pub.original_filename or pub.pdf.name.split("/")[-1]
        response = FileResponse(pub.pdf.open("rb"), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------


@api_view(["GET"])
def search(request):
    """GET /api/search/?q=... — returns { users, publications } from internal DB."""
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response({"users": [], "publications": []})

    subject = request.query_params.get("subject", "").strip()

    users = User.objects.filter(is_active=True).filter(
        models_q(q, ["username", "first_name", "last_name"])
    )[:20]

    publications = (
        Publication.objects.filter(models_q(q, ["title", "original_filename"]))
        .select_related("uploaded_by")
        .prefetch_related(
            "authors", "external_authors", "pub_tags", "pub_tags__refers_to"
        )
    )
    if subject:
        publications = publications.filter(subject=subject)
    publications = publications[:20]

    return Response(
        {
            "users": UserSerializer(users, many=True).data,
            "publications": PublicationSerializer(
                publications, many=True, context={"request": request}
            ).data,
        }
    )


@api_view(["GET"])
def search_semantic(request):
    """GET /api/search/semantic/?q=... — returns { semantic_scholar } from S2 API."""
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response({"semantic_scholar": [], "rate_limited": False})
    try:
        papers = search_semantic_scholar(q)
        return Response({"semantic_scholar": papers, "rate_limited": False})
    except RateLimitError:
        return Response({"semantic_scholar": [], "rate_limited": True})


def models_q(q, fields):
    from django.db.models import Q

    query = Q()
    for field in fields:
        query |= Q(**{f"{field}__icontains": q})
    return query


def _parse_latex_metadata(content):
    """Return (title, abstract, authors, year) extracted from LaTeX source."""
    import re
    from datetime import date as _date

    def _extract_braced(text, cmd):
        pattern = rf"\\{cmd}\s*\{{((?:[^{{}}]|\{{[^{{}}]*\}})*)\}}"
        return re.findall(pattern, text, re.DOTALL)

    def _clean(s):
        s = re.sub(
            r"\\(?:thanks|footnote|textsuperscript|IEEEauthorblockA|affiliation)"
            r"\s*\{(?:[^{}]|\{[^{}]*\})*\}",
            "",
            s,
        )
        for cmd in (
            "IEEEauthorblockN",
            "textbf",
            "textit",
            "textrm",
            "textsc",
            "textsf",
            "texttt",
            "emph",
            "mbox",
        ):
            s = re.sub(rf"\\{cmd}\{{([^}}]*)\}}", r"\1", s)
        s = re.sub(r"\\[a-zA-Z@]+\*?\{([^}]*)\}", r"\1", s)
        s = re.sub(r"\\[a-zA-Z@]+\*?", "", s)
        s = re.sub(r"[{}]", "", s)
        return " ".join(s.split()).strip()

    title_blocks = _extract_braced(content, "title")
    title = _clean(title_blocks[0]) if title_blocks else ""

    abstract_m = re.search(
        r"\\begin\{abstract\}(.*?)\\end\{abstract\}", content, re.DOTALL
    )
    abstract = _clean(abstract_m.group(1)) if abstract_m else ""

    year = None
    date_blocks = _extract_braced(content, "date")
    if date_blocks:
        ym = re.search(r"(19|20)\d{2}", date_blocks[0])
        if ym:
            year = int(ym.group(0))
    if year is None:
        year = _date.today().year

    authors = []
    for block in _extract_braced(content, "author"):
        for part in re.split(r"\\and\b", block):
            part = re.split(r"\\\\", part)[0]
            name = _clean(part)
            if name and len(name) < 100:
                authors.append(name)

    seen: set = set()
    unique_authors = []
    for a in authors:
        if a not in seen:
            seen.add(a)
            unique_authors.append(a)

    return title, abstract, unique_authors, year


def _claim_external_author_publications(user):
    """Transfer ExternalAuthor publications to a newly registered User.

    Called after registration.  Matches by full name (first + last) and moves
    every linked publication from the ExternalAuthor to the real User, then
    deletes the now-empty ExternalAuthor record.
    """
    full_name = f"{user.first_name} {user.last_name}".strip()
    if not full_name:
        return
    for ext in ExternalAuthor.objects.filter(name__iexact=full_name):
        for pub in ext.publications.all():
            pub.authors.add(user)
            pub.external_authors.remove(ext)
        ext.delete()


def _match_author_name(name):
    """Return an active User matching the given LaTeX author string, or None."""
    parts = name.strip().split()
    if not parts:
        return None
    if len(parts) >= 2:
        first, last = parts[0], " ".join(parts[1:])
        user = User.objects.filter(
            is_active=True, first_name__iexact=first, last_name__iexact=last
        ).first()
        if user:
            return user
        user = User.objects.filter(
            is_active=True, first_name__iexact=last, last_name__iexact=first
        ).first()
        if user:
            return user
    return User.objects.filter(is_active=True, username__iexact=name).first()


# ---------------------------------------------------------------------------
# Project viewset
# ---------------------------------------------------------------------------


class IsProjectOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.user == request.user


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        username = self.request.query_params.get("user")
        qs = Project.objects.all()
        if username:
            qs = qs.filter(user__username=username)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Project folder / file viewsets
# ---------------------------------------------------------------------------


class IsProjectResourceOwner(BasePermission):
    """Write access only for the owner of the parent project."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.project.user == request.user


class ProjectFolderViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectFolderSerializer
    permission_classes = [IsAuthenticated, IsProjectResourceOwner]

    def get_queryset(self):
        qs = ProjectFolder.objects.select_related("project", "parent")
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        parent_param = self.request.query_params.get("parent")
        if parent_param == "root":
            qs = qs.filter(parent__isnull=True)
        elif parent_param:
            qs = qs.filter(parent_id=parent_param)
        return qs

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if project.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not own this project.")
        serializer.save()


class ProjectFileViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectFileSerializer
    permission_classes = [IsAuthenticated, IsProjectResourceOwner]

    def get_queryset(self):
        qs = ProjectFile.objects.select_related("project", "folder")
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        folder_param = self.request.query_params.get("folder")
        if folder_param == "root":
            qs = qs.filter(folder__isnull=True)
        elif folder_param:
            qs = qs.filter(folder_id=folder_param)
        return qs

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]
        if project.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not own this project.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """GET /api/project-files/<id>/download/"""
        pf = self.get_object()
        if not pf.file:
            return Response(
                {"detail": "No file attached."}, status=status.HTTP_404_NOT_FOUND
            )
        filename = pf.original_filename or pf.file.name.split("/")[-1]
        response = FileResponse(pf.file.open("rb"))
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=["get", "put"], url_path="content")
    def content(self, request, pk=None):
        """GET /api/project-files/<id>/content/ — read file as text.
        PUT /api/project-files/<id>/content/ — write new content."""
        from django.core.files.base import ContentFile

        pf = self.get_object()
        if not pf.file:
            return Response(
                {"detail": "No file attached."}, status=status.HTTP_404_NOT_FOUND
            )

        if request.method == "GET":
            try:
                text = pf.file.read().decode("utf-8")
            except UnicodeDecodeError:
                return Response(
                    {"detail": "File is not a text file."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response({"content": text})

        # PUT — save new content (owner only)
        if pf.project.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        text = request.data.get("content", "")
        filename = pf.original_filename or pf.file.name.split("/")[-1]
        pf.file.delete(save=False)
        pf.file.save(filename, ContentFile(text.encode("utf-8")), save=True)
        return Response({"detail": "Saved."})

    def _compile_tex_to_pdf(self, pf):
        """Compile a .tex ProjectFile to PDF bytes.

        Returns (pdf_bytes, None) on success or (None, error_response) on failure.
        """
        import shutil
        import subprocess  # nosec B404
        import tempfile

        pdflatex = shutil.which("pdflatex")
        if not pdflatex:
            return None, Response(
                {"detail": "pdflatex is not installed on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        filename = pf.original_filename or pf.file.name.split("/")[-1]
        tmpdir = tempfile.mkdtemp()
        try:
            all_folders = list(pf.project.folders.all())
            folder_paths = {}
            remaining = {f.id: f for f in all_folders}
            while remaining:
                unresolved = {}
                for fid, folder in remaining.items():
                    if folder.parent_id is None:
                        folder_paths[fid] = folder.name
                    elif folder.parent_id in folder_paths:
                        folder_paths[fid] = os.path.join(
                            folder_paths[folder.parent_id], folder.name
                        )
                    else:
                        unresolved[fid] = folder
                if len(unresolved) == len(remaining):
                    break
                remaining = unresolved

            for project_file in pf.project.files.all():
                if not project_file.file:
                    continue
                rel_dir = (
                    folder_paths.get(project_file.folder_id, "")
                    if project_file.folder_id
                    else ""
                )
                dest_dir = os.path.join(tmpdir, rel_dir) if rel_dir else tmpdir
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(
                    dest_dir, project_file.original_filename or "file"
                )
                with open(dest_path, "wb") as fh:
                    fh.write(project_file.file.read())

            tex_path = os.path.join(tmpdir, filename)
            stem = filename[:-4]
            aux_path = os.path.join(tmpdir, stem + ".aux")
            pdf_path = os.path.join(tmpdir, stem + ".pdf")

            def run_pdflatex():
                return subprocess.run(  # noqa: S603  # nosec B603
                    [
                        pdflatex,
                        "-interaction=nonstopmode",
                        "-no-shell-escape",
                        f"-output-directory={tmpdir}",
                        tex_path,
                    ],
                    capture_output=True,
                    timeout=60,
                    cwd=tmpdir,
                )

            result = run_pdflatex()
            if not os.path.exists(pdf_path):
                log = (result.stdout + result.stderr).decode("utf-8", errors="replace")
                return None, Response(
                    {"detail": "Compilation failed.", "log": log},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            bib_backend = None
            if os.path.exists(aux_path):
                aux_text = open(aux_path).read()  # noqa: WPS515
                if "\\abx@aux" in aux_text:
                    bib_backend = shutil.which("biber")
                elif "\\bibdata" in aux_text:
                    bib_backend = shutil.which("bibtex")

            if bib_backend:
                subprocess.run(  # noqa: S603  # nosec B603
                    [bib_backend, stem],
                    capture_output=True,
                    timeout=60,
                    cwd=tmpdir,
                )
                run_pdflatex()
                run_pdflatex()

            with open(pdf_path, "rb") as pdf_fh:
                pdf_bytes = pdf_fh.read()

            return pdf_bytes, None
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    @action(detail=True, methods=["post"], url_path="compile")
    def compile(self, request, pk=None):
        """POST /api/project-files/<id>/compile/ — compile a LaTeX file and
        return the resulting PDF."""
        from django.http import HttpResponse

        pf = self.get_object()
        if not pf.file:
            return Response(
                {"detail": "No file attached."}, status=status.HTTP_404_NOT_FOUND
            )
        filename = pf.original_filename or pf.file.name.split("/")[-1]
        if not filename.lower().endswith(".tex"):
            return Response(
                {"detail": "File is not a LaTeX (.tex) file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_bytes, err = self._compile_tex_to_pdf(pf)
        if err:
            return err

        stem = filename[:-4]
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{stem}.pdf"'
        return resp

    @action(detail=True, methods=["get"], url_path="parse-metadata")
    def parse_metadata(self, request, pk=None):
        """GET /api/project-files/<id>/parse-metadata/ — parse LaTeX metadata."""
        pf = self.get_object()
        if not pf.file:
            return Response(
                {"detail": "No file attached."}, status=status.HTTP_404_NOT_FOUND
            )
        filename = pf.original_filename or pf.file.name.split("/")[-1]
        if not filename.lower().endswith(".tex"):
            return Response(
                {"detail": "File is not a LaTeX (.tex) file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            text = pf.file.read().decode("utf-8", errors="replace")
        except Exception:
            return Response(
                {"detail": "Could not read file."}, status=status.HTTP_400_BAD_REQUEST
            )

        title, abstract, author_names, year = _parse_latex_metadata(text)

        matched_authors = []
        for name in author_names:
            user = _match_author_name(name)
            matched_authors.append(
                {
                    "name": name,
                    "user": CompactUserSerializer(
                        user, context={"request": request}
                    ).data
                    if user
                    else None,
                }
            )

        return Response(
            {
                "title": title,
                "abstract": abstract,
                "year": year,
                "authors": matched_authors,
            }
        )

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        """POST /api/project-files/<id>/publish/ — compile and create a Publication."""
        import io

        from django.core.files.uploadedfile import InMemoryUploadedFile

        pf = self.get_object()
        if pf.project.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not pf.file:
            return Response(
                {"detail": "No file attached."}, status=status.HTTP_404_NOT_FOUND
            )
        filename = pf.original_filename or pf.file.name.split("/")[-1]
        if not filename.lower().endswith(".tex"):
            return Response(
                {"detail": "Only .tex files can be published."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_bytes, err = self._compile_tex_to_pdf(pf)
        if err:
            return err

        stem = filename[:-4]
        pdf_file = InMemoryUploadedFile(
            io.BytesIO(pdf_bytes),
            field_name="pdf",
            name=f"{stem}.pdf",
            content_type="application/pdf",
            size=len(pdf_bytes),
            charset=None,
        )

        data = {
            "title": request.data.get("title", ""),
            "abstract": request.data.get("abstract", ""),
            "year": request.data.get("year"),
            "publication_type": request.data.get("publication_type", "preprint"),
            "author_ids": request.data.get("author_ids", []),
            "pdf": pdf_file,
        }

        serializer = PublicationSerializer(data=data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pub = serializer.save()

        # Create ExternalAuthor records for names that had no matching User
        for raw_name in request.data.get("external_author_names", []):
            name = raw_name.strip()
            if not name:
                continue
            ext = ExternalAuthor.objects.filter(name__iexact=name).first()
            if not ext:
                ext = ExternalAuthor.objects.create(name=name)
            pub.external_authors.add(ext)

        return Response(
            PublicationSerializer(pub, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Report viewset
# ---------------------------------------------------------------------------


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        from django.db.models import Q

        qs = (
            Report.objects.annotate(vote_count_annotated=Count("voters", distinct=True))
            .select_related("author")
            .prefetch_related(
                Prefetch(
                    "voters",
                    queryset=User.objects.filter(pk=self.request.user.pk),
                    to_attr="current_user_vote",
                )
            )
        )

        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        report_type = self.request.query_params.get("type", "").strip()
        if report_type in Report.ReportType.values:
            qs = qs.filter(type=report_type)

        return qs.order_by("-vote_count_annotated", "-created_at")

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        report = self.get_object()
        if report.author == request.user:
            return Response(
                {"detail": "You cannot vote on your own report."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if report.voters.filter(pk=request.user.pk).exists():
            report.voters.remove(request.user)
            voted = False
        else:
            report.voters.add(request.user)
            voted = True
        return Response({"voted": voted, "vote_count": report.voters.count()})


# ---------------------------------------------------------------------------
# Comment viewset
# ---------------------------------------------------------------------------


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        if self.action == "list":
            pub_id = self.request.query_params.get("publication")
            if not pub_id:
                return Comment.objects.none()
            return Comment.objects.filter(
                publication_id=pub_id,
            ).select_related("author")
        return Comment.objects.select_related("author")

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author_id != request.user.pk and not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Notification viewset
# ---------------------------------------------------------------------------


class NotificationViewSet(viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related(
            "actor", "publication"
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="unread_count")
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=True, methods=["post"], url_path="mark_read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"is_read": True})

    @action(detail=False, methods=["post"], url_path="mark_all_read")
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"marked": True})
