"""
Management command to download and assign avatar photos to seed users.
Usage: python manage.py add_avatars
"""
import io
import urllib.request
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from api.models import User

# Pravatar.cc provides free placeholder portrait photos.
# Each URL returns a consistent photo for that seed number.
AVATARS = {
    "alice_chen":  "https://i.pravatar.cc/200?img=47",
    "bob_nguyen":  "https://i.pravatar.cc/200?img=11",
    "carol_smith": "https://i.pravatar.cc/200?img=49",
    "david_park":  "https://i.pravatar.cc/200?img=15",
    "elena_russo": "https://i.pravatar.cc/200?img=45",
}


class Command(BaseCommand):
    help = "Download and assign avatar photos to seed users."

    def handle(self, *args, **options):
        for username, url in AVATARS.items():
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  User '{username}' not found, skipping."))
                continue

            self.stdout.write(f"  Downloading avatar for {username}…")
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    image_data = resp.read()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed to download: {e}"))
                continue

            filename = f"{username}.jpg"
            # Delete old avatar file if present
            if user.avatar:
                user.avatar.delete(save=False)
            user.avatar.save(filename, ContentFile(image_data), save=True)
            self.stdout.write(self.style.SUCCESS(f"  Assigned avatar to {username}"))

        self.stdout.write(self.style.SUCCESS("\nDone."))
