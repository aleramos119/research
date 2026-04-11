from django.contrib.auth import login, logout
from django.http import FileResponse
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework import status, viewsets, filters, generics
from .models import User, Publication
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    HIndexUpdateSerializer, PublicationSerializer,
)


# ---------------------------------------------------------------------------
# Custom permissions
# ---------------------------------------------------------------------------

class IsUploaderOrReadOnly(BasePermission):
    """
    - Safe methods: any authenticated user.
    - DELETE: any author (they remove themselves; backend decides full-delete vs. authorship-remove).
    - Other mutations (PATCH, PUT): uploader only.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.method == 'DELETE':
            return obj.authors.filter(pk=request.user.pk).exists() or request.user.is_staff
        return obj.uploaded_by == request.user or request.user.is_staff


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'message': 'Django API is running'})


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register/"""
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """POST /api/auth/login/"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        return Response(UserSerializer(user, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def user_logout(request):
    """POST /api/auth/logout/"""
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'DELETE'])
def me(request):
    """GET/DELETE /api/auth/me/"""
    user = request.user

    if request.method == 'GET':
        return Response(UserSerializer(user, context={'request': request}).data)

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
    lookup_field = 'username'

    @action(detail=True, methods=['post'])
    def update_h_index(self, request, username=None):
        user = self.get_object()
        serializer = HIndexUpdateSerializer(data=request.data)
        if serializer.is_valid():
            new_h = user.update_h_index(serializer.validated_data['citation_counts'])
            return Response({'h_index': new_h})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Publication viewset
# ---------------------------------------------------------------------------

class PublicationViewSet(viewsets.ModelViewSet):
    serializer_class = PublicationSerializer
    permission_classes = [IsAuthenticated, IsUploaderOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'original_filename', 'keywords', 'journal']
    ordering_fields = ['year', 'citations', 'created_at', 'title']
    ordering = ['-year']

    def get_queryset(self):
        qs = Publication.objects.select_related('uploaded_by').prefetch_related('authors')

        mine = self.request.query_params.get('mine')
        if mine:
            return qs.filter(uploaded_by=self.request.user)

        author = self.request.query_params.get('author')
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

    @action(detail=True, methods=['get'], url_path='file')
    def file(self, request, pk=None):
        """GET /api/publications/<id>/file/ — auth-checked file download."""
        pub = self.get_object()
        if not pub.pdf:
            return Response({'detail': 'No file attached.'}, status=status.HTTP_404_NOT_FOUND)
        filename = pub.original_filename or pub.pdf.name.split('/')[-1]
        response = FileResponse(pub.pdf.open('rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@api_view(['GET'])
def search(request):
    """GET /api/search/?q=... — returns { users, publications }."""
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'users': [], 'publications': []})

    users = User.objects.filter(is_active=True).filter(
        models_q(q, ['username', 'first_name', 'last_name'])
    )[:20]

    publications = Publication.objects.filter(
        models_q(q, ['title', 'original_filename'])
    )[:20]

    return Response({
        'users': UserSerializer(users, many=True).data,
        'publications': PublicationSerializer(publications, many=True, context={'request': request}).data,
    })


def models_q(q, fields):
    from django.db.models import Q
    query = Q()
    for field in fields:
        query |= Q(**{f'{field}__icontains': q})
    return query
