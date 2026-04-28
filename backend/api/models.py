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
    interests = models.JSONField(default=list, blank=True)
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


class ExternalAuthor(models.Model):
    """Named author who is not yet a registered user.

    Created automatically when publishing from a .tex file and an author name
    cannot be matched to a registered User.  When that person registers later,
    their publications are transferred and this record is removed.
    """

    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


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

    class Subject(models.TextChoices):
        # Physics
        PHYSICS_COND_MAT = "physics.cond-mat", "Condensed Matter"
        PHYSICS_HEP = "physics.hep", "High Energy Physics"
        PHYSICS_GR_QC = "physics.gr-qc", "General Relativity & Quantum Cosmology"
        PHYSICS_QUANT_PH = "physics.quant-ph", "Quantum Physics"
        PHYSICS_ATOM = "physics.atom", "Atomic, Molecular & Optical Physics"
        PHYSICS_NUCLEAR = "physics.nuclear", "Nuclear Physics"
        PHYSICS_FLUID = "physics.fluid", "Fluid Dynamics"
        PHYSICS_PLASMA = "physics.plasma", "Plasma Physics"
        PHYSICS_OTHER = "physics.other", "Physics (Other)"
        # Astrophysics
        ASTRO_COSMOLOGY = "astro.cosmology", "Cosmology"
        ASTRO_GALAXIES = "astro.galaxies", "Galaxies"
        ASTRO_HE = "astro.he", "High Energy Astrophysics"
        ASTRO_PLANETS = "astro.planets", "Planetary Science"
        ASTRO_SOLAR = "astro.solar", "Solar & Stellar Astrophysics"
        ASTRO_INSTRUMENTS = "astro.instruments", "Astronomical Instrumentation"
        # Mathematics
        MATH_AG = "math.ag", "Algebraic Geometry"
        MATH_ANALYSIS = "math.analysis", "Analysis"
        MATH_COMBINATORICS = "math.combinatorics", "Combinatorics"
        MATH_DG = "math.dg", "Differential Geometry"
        MATH_LOGIC = "math.logic", "Logic & Foundations"
        MATH_NT = "math.nt", "Number Theory"
        MATH_PROBABILITY = "math.probability", "Probability"
        MATH_TOPOLOGY = "math.topology", "Topology"
        MATH_OTHER = "math.other", "Mathematics (Other)"
        # Computer Science
        CS_AI = "cs.ai", "Artificial Intelligence"
        CS_CV = "cs.cv", "Computer Vision"
        CS_CRYPTO = "cs.crypto", "Cryptography & Security"
        CS_DB = "cs.db", "Databases"
        CS_DS = "cs.ds", "Data Structures & Algorithms"
        CS_HCI = "cs.hci", "Human-Computer Interaction"
        CS_ML = "cs.ml", "Machine Learning"
        CS_NETWORKS = "cs.networks", "Networking"
        CS_PL = "cs.pl", "Programming Languages"
        CS_SE = "cs.se", "Software Engineering"
        CS_OTHER = "cs.other", "Computer Science (Other)"
        # Biology
        BIO_CELL = "bio.cell", "Cell Biology"
        BIO_ECOLOGY = "bio.ecology", "Ecology & Evolution"
        BIO_GENOMICS = "bio.genomics", "Genomics & Bioinformatics"
        BIO_MOLECULAR = "bio.molecular", "Molecular Biology"
        BIO_NEUROSCIENCE = "bio.neuroscience", "Neuroscience"
        BIO_OTHER = "bio.other", "Biology (Other)"
        # Medicine
        MED_CARDIOLOGY = "med.cardiology", "Cardiology"
        MED_GENETICS = "med.genetics", "Medical Genetics"
        MED_IMAGING = "med.imaging", "Medical Imaging"
        MED_ONCOLOGY = "med.oncology", "Oncology"
        MED_PHARMACOLOGY = "med.pharmacology", "Pharmacology"
        MED_PUBLIC = "med.public", "Public Health & Epidemiology"
        MED_OTHER = "med.other", "Medicine (Other)"
        # Chemistry
        CHEM_ORGANIC = "chem.organic", "Organic Chemistry"
        CHEM_PHYSICAL = "chem.physical", "Physical Chemistry"
        CHEM_MATERIALS = "chem.materials", "Materials Science"
        CHEM_OTHER = "chem.other", "Chemistry (Other)"
        # Earth Sciences
        EARTH_ATMOSPHERIC = "earth.atmospheric", "Atmospheric Science"
        EARTH_GEO = "earth.geo", "Geophysics & Geology"
        EARTH_OCEAN = "earth.ocean", "Oceanography"
        EARTH_OTHER = "earth.other", "Earth Sciences (Other)"
        # Economics
        ECON_FINANCE = "econ.finance", "Finance & Economics"
        ECON_MACRO = "econ.macro", "Macroeconomics"
        ECON_MICRO = "econ.micro", "Microeconomics"
        ECON_OTHER = "econ.other", "Economics (Other)"
        # Social Sciences
        SOC_ANTHROPOLOGY = "soc.anthropology", "Anthropology"
        SOC_LINGUISTICS = "soc.linguistics", "Linguistics"
        SOC_POLITICAL = "soc.political", "Political Science"
        SOC_PSYCHOLOGY = "soc.psychology", "Psychology"
        SOC_SOCIOLOGY = "soc.sociology", "Sociology"
        SOC_OTHER = "soc.other", "Social Sciences (Other)"
        # Statistics
        STAT_APPLIED = "stat.applied", "Applied Statistics"
        STAT_METHODS = "stat.methods", "Statistical Methodology"
        STAT_THEORY = "stat.theory", "Statistical Theory"
        # Engineering
        ENG_CIVIL = "eng.civil", "Civil Engineering"
        ENG_ELECTRICAL = "eng.electrical", "Electrical Engineering"
        ENG_MECHANICAL = "eng.mechanical", "Mechanical Engineering"
        ENG_OTHER = "eng.other", "Engineering (Other)"
        # Other
        OTHER = "other", "Other / Interdisciplinary"

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
    external_authors = models.ManyToManyField(
        ExternalAuthor,
        related_name="publications",
        blank=True,
    )
    publication_type = models.CharField(
        max_length=20, choices=PublicationType.choices, default=PublicationType.JOURNAL
    )
    subject = models.CharField(
        max_length=50,
        choices=Subject.choices,
        blank=True,
        default="",
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


class Comment(models.Model):
    publication = models.ForeignKey(
        Publication,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author.username} on {self.publication.title[:40]}"


class Project(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        PAUSED = "paused", "Paused"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProjectFolder(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="folders",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


def project_file_upload_path(instance, filename):
    return f"project_files/{instance.project_id}/{filename}"


class ProjectFile(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="files",
    )
    folder = models.ForeignKey(
        ProjectFolder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="files",
    )
    file = models.FileField(upload_to=project_file_upload_path, blank=True, null=True)
    original_filename = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["original_filename"]

    def __str__(self):
        return self.original_filename

    def delete(self, *args, **kwargs):
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)


class Notification(models.Model):
    class Type(models.TextChoices):
        CO_AUTHORED = "co_authored", "Co-authored"
        COMMENT = "comment", "Comment"

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="triggered_notifications",
    )
    notification_type = models.CharField(max_length=20, choices=Type.choices)
    publication = models.ForeignKey(
        Publication,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type} → {self.recipient.username}"


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
