from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum


def validate_pdf(file):
    """Reject files that are not PDFs (checks extension and magic bytes)."""
    name = getattr(file, "name", "")
    if not name.lower().endswith(".pdf"):
        raise ValidationError("Only PDF files are allowed.")
    # Read the first 5 bytes to check for the %PDF- magic signature
    header = file.read(5)
    file.seek(0)
    if header != b"%PDF-":
        raise ValidationError("File does not appear to be a valid PDF.")


class User(AbstractUser):
    """Custom user model with additional fields"""

    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    university = models.CharField(max_length=200, blank=True)
    h_index = models.PositiveIntegerField(default=0)
    following = models.ManyToManyField(
        "self",
        symmetrical=False,
        related_name="followers",
        blank=True,
    )

    # Inherited fields from AbstractUser:
    # - username
    # - email
    # - first_name
    # - last_name
    # - password
    # - is_active
    # - is_staff
    # - date_joined

    def update_h_index(self, citation_counts):
        """
        Calculate and update the H-index based on citation counts.

        H-index: A researcher has index h if h of their papers have
        at least h citations each.

        Args:
            citation_counts: List of citation counts for each publication
                             e.g., [10, 8, 5, 4, 3] -> h-index = 4
        """
        if not citation_counts:
            self.h_index = 0
        else:
            sorted_citations = sorted(citation_counts, reverse=True)
            h = 0
            for i, citations in enumerate(sorted_citations):
                if citations >= i + 1:
                    h = i + 1
                else:
                    break
            self.h_index = h
        self.save()
        return self.h_index

    def recalculate_h_index(self):
        """Recalculate H-index from user's publications"""
        citation_counts = list(self.publications.values_list("citations", flat=True))
        return self.update_h_index(citation_counts)

    def get_publications(self):
        """Get list of user's publications ordered by year"""
        return self.publications.all().order_by("-year", "-publication_date")

    @property
    def publications_count(self):
        """Get total number of publications"""
        return self.publications.count()

    @property
    def total_citations(self):
        """Get total citations across all publications"""
        return self.publications.aggregate(total=Sum("citations"))["total"] or 0

    def __str__(self):
        return self.username


class Publication(models.Model):
    """Academic publication model"""

    class PublicationType(models.TextChoices):
        JOURNAL = "journal", "Journal Article"
        CONFERENCE = "conference", "Conference Paper"
        BOOK = "book", "Book"
        BOOK_CHAPTER = "chapter", "Book Chapter"
        THESIS = "thesis", "Thesis"
        PREPRINT = "preprint", "Preprint"
        OTHER = "other", "Other"

    # Uploader (who pressed upload; separate from co-authorship)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_publications",
    )

    # Basic info
    title = models.CharField(max_length=500)
    abstract = models.TextField(blank=True)
    authors = models.ManyToManyField(User, related_name="publications", blank=True)
    publication_type = models.CharField(
        max_length=20, choices=PublicationType.choices, default=PublicationType.JOURNAL
    )

    # Publication details
    journal = models.CharField(
        max_length=300, blank=True, help_text="Journal or conference name"
    )
    volume = models.CharField(max_length=50, blank=True)
    issue = models.CharField(max_length=50, blank=True)
    pages = models.CharField(max_length=50, blank=True)
    publisher = models.CharField(max_length=200, blank=True)

    # Dates
    year = models.PositiveIntegerField()
    publication_date = models.DateField(null=True, blank=True)

    # Identifiers
    doi = models.CharField(max_length=100, blank=True, verbose_name="DOI")
    isbn = models.CharField(max_length=20, blank=True, verbose_name="ISBN")
    url = models.URLField(max_length=500, blank=True)

    # Files
    pdf = models.FileField(
        upload_to="publications/pdfs/",
        blank=True,
        null=True,
        validators=[validate_pdf],
        help_text="PDF file of the publication",
    )
    original_filename = models.CharField(max_length=255, blank=True)

    # Metrics
    citations = models.PositiveIntegerField(default=0)

    # Keywords and metadata
    keywords = models.CharField(
        max_length=500, blank=True, help_text="Comma-separated keywords"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-publication_date"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-add uploader to authors (Option A rule)
        if (
            self.uploaded_by
            and not self.authors.filter(pk=self.uploaded_by.pk).exists()
        ):
            self.authors.add(self.uploaded_by)
        # Recalculate H-index for all authors when citations change
        for author in self.authors.all():
            author.recalculate_h_index()

    def delete(self, *args, **kwargs):
        # Remove PDF from disk before deleting the row
        if self.pdf:
            self.pdf.delete(save=False)
        super().delete(*args, **kwargs)


class Report(models.Model):
    class ReportType(models.TextChoices):
        BUG = "bug", "Bug"
        FEATURE = "feature", "Feature Request"

    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports",
    )
    type = models.CharField(
        max_length=10,
        choices=ReportType.choices,
        default=ReportType.BUG,
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    voters = models.ManyToManyField(
        User,
        related_name="voted_reports",
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
