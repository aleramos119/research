from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Publication


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'university', 'h_index', 'is_staff']
    list_filter = ['university', 'is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('bio', 'avatar', 'date_of_birth', 'phone', 'university')}),
        ('Research', {'fields': ('h_index',)}),
    )


@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    list_display = ['title', 'publication_type', 'journal', 'year', 'citations', 'has_pdf']
    list_filter = ['publication_type', 'year']
    search_fields = ['title', 'abstract', 'keywords', 'journal']
    filter_horizontal = ['authors']
    ordering = ['-year', '-citations']
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'abstract', 'authors', 'publication_type')
        }),
        ('Publication Details', {
            'fields': ('journal', 'volume', 'issue', 'pages', 'publisher', 'year', 'publication_date')
        }),
        ('Identifiers', {
            'fields': ('doi', 'isbn', 'url')
        }),
        ('Files', {
            'fields': ('pdf',)
        }),
        ('Metrics & Metadata', {
            'fields': ('citations', 'keywords')
        }),
    )
    
    def has_pdf(self, obj):
        return bool(obj.pdf)
    has_pdf.boolean = True
    has_pdf.short_description = 'Has PDF'