from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from .models import User, Publication
from .serializers import (
    UserSerializer, UserCreateSerializer, HIndexUpdateSerializer,
    PublicationSerializer, PublicationDetailSerializer
)


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok', 'message': 'Django API is running'}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """API endpoint for users"""
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action == 'update_h_index':
            return HIndexUpdateSerializer
        return UserSerializer
    
    @action(detail=True, methods=['post'])
    def update_h_index(self, request, pk=None):
        """
        Update user's H-index based on citation counts.
        
        POST /api/users/{id}/update_h_index/
        Body: {"citation_counts": [10, 8, 5, 4, 3]}
        """
        user = self.get_object()
        serializer = HIndexUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            citation_counts = serializer.validated_data['citation_counts']
            new_h_index = user.update_h_index(citation_counts)
            return Response({
                'h_index': new_h_index,
                'message': f'H-index updated to {new_h_index}'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicationViewSet(viewsets.ModelViewSet):
    """API endpoint for publications"""
    queryset = Publication.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'abstract', 'keywords', 'journal']
    ordering_fields = ['year', 'citations', 'created_at', 'title']
    ordering = ['-year']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PublicationDetailSerializer
        return PublicationSerializer
    
    @action(detail=False, methods=['get'])
    def by_author(self, request):
        """Get publications by author ID"""
        author_id = request.query_params.get('author_id')
        if not author_id:
            return Response(
                {'error': 'author_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        publications = self.queryset.filter(authors__id=author_id)
        serializer = self.get_serializer(publications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_year(self, request):
        """Get publications by year"""
        year = request.query_params.get('year')
        if not year:
            return Response(
                {'error': 'year parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        publications = self.queryset.filter(year=year)
        serializer = self.get_serializer(publications, many=True)
        return Response(serializer.data)