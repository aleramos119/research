from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User, Publication


# ---------------------------------------------------------------------------
# User serializers
# ---------------------------------------------------------------------------

class UserPublicationSerializer(serializers.ModelSerializer):
    """Compact publication info embedded in user responses."""
    class Meta:
        model = Publication
        fields = ['id', 'title', 'publication_type', 'journal', 'year',
                  'citations', 'doi', 'url']
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    publications = serializers.SerializerMethodField()
    publications_count = serializers.ReadOnlyField()
    total_citations = serializers.ReadOnlyField()
    pdfs_uploaded_count = serializers.SerializerMethodField()
    pdfs_authored_count = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'bio', 'avatar', 'avatar_url', 'date_of_birth', 'phone', 'university',
                  'h_index', 'publications', 'publications_count', 'total_citations',
                  'pdfs_uploaded_count', 'pdfs_authored_count', 'date_joined']
        read_only_fields = ['id', 'date_joined', 'h_index', 'publications',
                            'publications_count', 'total_citations',
                            'pdfs_uploaded_count', 'pdfs_authored_count', 'avatar_url']

    def get_publications(self, obj):
        publications = obj.get_publications()
        return UserPublicationSerializer(publications, many=True).data

    def get_pdfs_uploaded_count(self, obj):
        return obj.uploaded_publications.count()

    def get_pdfs_authored_count(self, obj):
        return obj.publications.count()

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name',
                  'bio', 'avatar', 'date_of_birth', 'phone', 'university']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get('request')
        if rep.get('avatar') and request:
            rep['avatar'] = request.build_absolute_uri(instance.avatar.url)
        return rep


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account is disabled.')
        data['user'] = user
        return data


class HIndexUpdateSerializer(serializers.Serializer):
    citation_counts = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        help_text="List of citation counts for each publication"
    )


# ---------------------------------------------------------------------------
# Publication serializers
# ---------------------------------------------------------------------------

class PublicationAuthorSerializer(serializers.ModelSerializer):
    """Compact user info embedded in publication responses."""
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'university', 'avatar_url']
        read_only_fields = fields

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url


class PublicationSerializer(serializers.ModelSerializer):
    """Used for list and create actions."""
    uploaded_by = PublicationAuthorSerializer(read_only=True)
    authors = PublicationAuthorSerializer(many=True, read_only=True)
    author_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        source='authors',
        required=False,
    )

    class Meta:
        model = Publication
        fields = [
            'id', 'uploaded_by', 'title', 'abstract', 'authors', 'author_ids',
            'publication_type', 'journal', 'volume', 'issue', 'pages', 'publisher',
            'year', 'publication_date',
            'doi', 'isbn', 'url', 'pdf', 'original_filename',
            'citations', 'keywords',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'original_filename', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context['request']
        pdf_file = validated_data.get('pdf')
        if pdf_file:
            validated_data['original_filename'] = pdf_file.name
        validated_data['uploaded_by'] = request.user
        instance = super().create(validated_data)
        # Guarantee uploader is in authors regardless of save() cache state
        instance.authors.add(request.user)
        return instance
