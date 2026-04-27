from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver

from .models import Comment, Notification, Publication


@receiver(m2m_changed, sender=Publication.authors.through)
def notify_co_authors(sender, instance, action, pk_set, **kwargs):
    if action != "post_add" or not pk_set:
        return
    uploader = instance.uploaded_by
    for user_pk in pk_set:
        if uploader and user_pk == uploader.pk:
            continue
        Notification.objects.create(
            recipient_id=user_pk,
            actor=uploader,
            notification_type=Notification.Type.CO_AUTHORED,
            publication=instance,
        )


@receiver(post_save, sender=Comment)
def notify_publication_authors_on_comment(sender, instance, created, **kwargs):
    if not created:
        return
    pub = instance.publication
    commenter = instance.author
    for author in pub.authors.exclude(pk=commenter.pk):
        Notification.objects.create(
            recipient=author,
            actor=commenter,
            notification_type=Notification.Type.COMMENT,
            publication=pub,
        )
