"""
Management command to seed the database with dummy users and publications.
Usage: python manage.py seed
       python manage.py seed --clear   (wipe existing seed data first)
"""
import io
from django.core.management.base import BaseCommand
from api.models import User, Publication


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

USERS = [
    {
        "username": "alice_chen",
        "email": "alice@example.com",
        "password": "password123",
        "first_name": "Alice",
        "last_name": "Chen",
        "university": "MIT",
        "bio": "Machine learning researcher focused on NLP and large language models.",
    },
    {
        "username": "bob_nguyen",
        "email": "bob@example.com",
        "password": "password123",
        "first_name": "Bob",
        "last_name": "Nguyen",
        "university": "Stanford University",
        "bio": "Computer vision and robotics. Building robots that understand the world.",
    },
    {
        "username": "carol_smith",
        "email": "carol@example.com",
        "password": "password123",
        "first_name": "Carol",
        "last_name": "Smith",
        "university": "University of Cambridge",
        "bio": "Quantum computing and cryptography researcher.",
    },
    {
        "username": "david_park",
        "email": "david@example.com",
        "password": "password123",
        "first_name": "David",
        "last_name": "Park",
        "university": "ETH Zurich",
        "bio": "Distributed systems and cloud computing.",
    },
    {
        "username": "elena_russo",
        "email": "elena@example.com",
        "password": "password123",
        "first_name": "Elena",
        "last_name": "Russo",
        "university": "University of Oxford",
        "bio": "Bioinformatics and computational genomics.",
    },
]

PUBLICATIONS = [
    {
        "title": "Attention Is All You Need: Revisited",
        "abstract": "We revisit the transformer architecture and propose improvements that achieve state-of-the-art results on multiple NLP benchmarks with significantly reduced compute.",
        "publication_type": "conference",
        "journal": "NeurIPS 2024",
        "year": 2024,
        "citations": 312,
        "keywords": "transformers, attention, NLP, deep learning",
        "doi": "10.1234/neurips.2024.001",
        "uploader": "alice_chen",
        "authors": ["alice_chen", "bob_nguyen"],
    },
    {
        "title": "Efficient Vision Transformers for Real-Time Object Detection",
        "abstract": "We present EfficientViT, a family of vision transformers optimised for real-time inference on edge devices without sacrificing accuracy.",
        "publication_type": "journal",
        "journal": "IEEE Transactions on Pattern Analysis and Machine Intelligence",
        "year": 2023,
        "citations": 198,
        "keywords": "vision transformer, object detection, edge computing",
        "doi": "10.1109/tpami.2023.1234567",
        "uploader": "bob_nguyen",
        "authors": ["bob_nguyen", "alice_chen"],
    },
    {
        "title": "Post-Quantum Cryptography: A Practical Survey",
        "abstract": "A comprehensive survey of lattice-based, hash-based, and code-based cryptographic schemes suitable for deployment in a post-quantum world.",
        "publication_type": "journal",
        "journal": "ACM Computing Surveys",
        "year": 2024,
        "citations": 87,
        "keywords": "post-quantum, cryptography, lattice, security",
        "doi": "10.1145/csur.2024.987",
        "uploader": "carol_smith",
        "authors": ["carol_smith"],
    },
    {
        "title": "Consensus in Byzantine Fault-Tolerant Distributed Systems",
        "abstract": "We introduce a novel BFT consensus protocol that reduces communication complexity from O(n²) to O(n log n) while maintaining safety and liveness guarantees.",
        "publication_type": "conference",
        "journal": "OSDI 2023",
        "year": 2023,
        "citations": 145,
        "keywords": "distributed systems, BFT, consensus, fault tolerance",
        "doi": "10.5555/osdi.2023.0042",
        "uploader": "david_park",
        "authors": ["david_park", "carol_smith"],
    },
    {
        "title": "Single-Cell RNA Sequencing at Scale: Algorithms and Applications",
        "abstract": "We present scalable algorithms for analysing single-cell RNA sequencing data from millions of cells, enabling new insights into cell-type heterogeneity.",
        "publication_type": "journal",
        "journal": "Nature Methods",
        "year": 2024,
        "citations": 256,
        "keywords": "scRNA-seq, bioinformatics, genomics, clustering",
        "doi": "10.1038/nmeth.2024.005",
        "uploader": "elena_russo",
        "authors": ["elena_russo"],
    },
    {
        "title": "Federated Learning with Differential Privacy Guarantees",
        "abstract": "We propose a federated learning framework that provides rigorous differential privacy guarantees while maintaining model accuracy across heterogeneous data distributions.",
        "publication_type": "conference",
        "journal": "ICML 2023",
        "year": 2023,
        "citations": 421,
        "keywords": "federated learning, differential privacy, distributed ML",
        "doi": "10.1234/icml.2023.0099",
        "uploader": "alice_chen",
        "authors": ["alice_chen", "david_park"],
    },
    {
        "title": "Quantum Advantage in Optimisation Problems",
        "abstract": "We demonstrate a provable quantum advantage for a class of combinatorial optimisation problems using a variational quantum eigensolver approach.",
        "publication_type": "journal",
        "journal": "Physical Review Letters",
        "year": 2022,
        "citations": 534,
        "keywords": "quantum computing, optimisation, VQE, QAOA",
        "doi": "10.1103/PhysRevLett.2022.191",
        "uploader": "carol_smith",
        "authors": ["carol_smith", "david_park"],
    },
    {
        "title": "Robotic Manipulation of Deformable Objects Using Learned Models",
        "abstract": "We develop a model-based reinforcement learning approach for robotic manipulation of deformable objects such as cloth and rope, achieving human-level performance.",
        "publication_type": "conference",
        "journal": "ICRA 2024",
        "year": 2024,
        "citations": 73,
        "keywords": "robotics, reinforcement learning, deformable objects",
        "doi": "10.1109/icra.2024.0201",
        "uploader": "bob_nguyen",
        "authors": ["bob_nguyen", "elena_russo"],
    },
    {
        "title": "Pangenome Graphs for Population-Scale Genomics",
        "abstract": "We introduce a scalable pangenome graph representation that captures genetic variation across thousands of individuals and enables efficient sequence alignment.",
        "publication_type": "journal",
        "journal": "Genome Research",
        "year": 2023,
        "citations": 189,
        "keywords": "pangenome, genomics, graph algorithms, bioinformatics",
        "doi": "10.1101/gr.2023.pangenome",
        "uploader": "elena_russo",
        "authors": ["elena_russo", "alice_chen"],
    },
    {
        "title": "Serverless Computing: Performance Models and Cost Optimisation",
        "abstract": "We present analytical performance models for serverless platforms and a cost-optimisation framework that reduces cloud spending by up to 40% for typical workloads.",
        "publication_type": "journal",
        "journal": "IEEE Transactions on Cloud Computing",
        "year": 2022,
        "citations": 302,
        "keywords": "serverless, cloud computing, performance modelling, cost",
        "doi": "10.1109/tcc.2022.0055",
        "uploader": "david_park",
        "authors": ["david_park"],
    },
]


def _make_dummy_pdf(title: str) -> io.BytesIO:
    """Return a minimal valid PDF in memory."""
    content = (
        f"%PDF-1.4\n"
        f"1 0 obj\n<< /Type /Catalog >>\nendobj\n"
        f"2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n"
        f"% {title}\n"
        f"%%EOF\n"
    ).encode()
    buf = io.BytesIO(content)
    buf.name = f"{title[:40].replace(' ', '_').lower()}.pdf"
    return buf


class Command(BaseCommand):
    help = "Seed the database with dummy users and publications for testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing seed users and their publications before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            seed_usernames = [u["username"] for u in USERS]
            deleted, _ = User.objects.filter(username__in=seed_usernames).delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted} seed records."))

        # Create users
        user_map = {}
        for data in USERS:
            username = data["username"]
            if User.objects.filter(username=username).exists():
                self.stdout.write(f"  User '{username}' already exists, skipping.")
                user_map[username] = User.objects.get(username=username)
                continue
            u = User.objects.create_user(
                username=username,
                email=data["email"],
                password=data["password"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                university=data.get("university", ""),
                bio=data.get("bio", ""),
            )
            user_map[username] = u
            self.stdout.write(self.style.SUCCESS(f"  Created user: {username}"))

        # Create publications (skip h-index recalc until all are created)
        created_pubs = []
        for data in PUBLICATIONS:
            uploader = user_map.get(data["uploader"])
            if not uploader:
                self.stdout.write(self.style.ERROR(f"  Uploader '{data['uploader']}' not found, skipping."))
                continue

            pdf_file = _make_dummy_pdf(data["title"])

            pub = Publication(
                title=data["title"],
                abstract=data.get("abstract", ""),
                publication_type=data["publication_type"],
                journal=data.get("journal", ""),
                year=data["year"],
                citations=data.get("citations", 0),
                keywords=data.get("keywords", ""),
                doi=data.get("doi", ""),
                uploaded_by=uploader,
                original_filename=pdf_file.name,
            )
            pub.pdf.save(pdf_file.name, pdf_file, save=False)
            # Use save() without triggering h-index recalc for now
            Publication.save(pub)

            author_users = [user_map[a] for a in data["authors"] if a in user_map]
            pub.authors.set(author_users)
            # Ensure uploader is an author
            pub.authors.add(uploader)

            created_pubs.append(pub)
            self.stdout.write(self.style.SUCCESS(f"  Created publication: {data['title'][:60]}"))

        # Recalculate h-index for all seed users now that publications are set
        for u in user_map.values():
            u.recalculate_h_index()

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {len(user_map)} users, {len(created_pubs)} publications seeded."
        ))
