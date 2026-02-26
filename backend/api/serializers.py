from rest_framework import serializers
from .models import User, Publication


class UserPublicationSerializer(serializers.ModelSerializer):
    """Simplified publication serializer for user's publication list"""
    class Meta:
        model = Publication
        fields = ['id', 'title', 'publication_type', 'journal', 'year', 
                  'citations', 'doi', 'url']
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    publications = serializers.SerializerMethodField()
    publications_count = serializers.ReadOnlyField()
    total_citations = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'bio', 'avatar', 'date_of_birth', 'phone', 'university', 
                  'h_index', 'publications', 'publications_count', 'total_citations', 
                  'date_joined']
        read_only_fields = ['id', 'date_joined', 'h_index', 'publications', 
                           'publications_count', 'total_citations']
    
    def get_publications(self, obj):
        """Get user's publications ordered by year"""
        publications = obj.get_publications()
        return UserPublicationSerializer(publications, many=True).data


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name',
                  'bio', 'avatar', 'date_of_birth', 'phone', 'university']
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class HIndexUpdateSerializer(serializers.Serializer):
    citation_counts = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        help_text="List of citation counts for each publication"
    )


class PublicationSerializer(serializers.ModelSerializer):
    authors = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=User.objects.all()
    )
    
    class Meta:
        model = Publication
        fields = [
            'id', 'title', 'abstract', 'authors', 'publication_type',
            'journal', 'volume', 'issue', 'pages', 'publisher',
            'year', 'publication_date',
            'doi', 'isbn', 'url', 'pdf',
            'citations', 'keywords',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PublicationDetailSerializer(PublicationSerializer):
    """Serializer with expanded author details"""
    authors = UserSerializer(many=True, read_only=True)
    author_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        source='authors'
    )
