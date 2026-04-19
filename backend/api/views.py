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

from .models import Project, ProjectFile, ProjectFolder, Publication, Report, User
from .serializers import (
    CompactUserSerializer,
    HIndexUpdateSerializer,
    LoginSerializer,
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
    search_fields = ["title", "original_filename", "keywords", "journal"]
    ordering_fields = ["year", "citations", "created_at", "title"]
    ordering = ["-year"]

    def get_queryset(self):
        qs = Publication.objects.select_related("uploaded_by").prefetch_related(
            "authors"
        )

        mine = self.request.query_params.get("mine")
        if mine:
            return qs.filter(uploaded_by=self.request.user)

        author = self.request.query_params.get("author")
        if author:
            return qs.filter(authors__username=author)

        return qs

    def perform_create(self, serializer):
        serializer.save()

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
            .prefetch_related("authors")
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
    """GET /api/search/?q=... — returns { users, publications }."""
    q = request.query_params.get("q", "").strip()
    if not q:
        return Response({"users": [], "publications": []})

    users = User.objects.filter(is_active=True).filter(
        models_q(q, ["username", "first_name", "last_name"])
    )[:20]

    publications = Publication.objects.filter(
        models_q(q, ["title", "original_filename"])
    )[:20]

    return Response(
        {
            "users": UserSerializer(users, many=True).data,
            "publications": PublicationSerializer(
                publications, many=True, context={"request": request}
            ).data,
        }
    )


def models_q(q, fields):
    from django.db.models import Q

    query = Q()
    for field in fields:
        query |= Q(**{f"{field}__icontains": q})
    return query


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
