from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver

from .models import (
    Comment,
    KeywordSubscription,
    Notification,
    Publication,
    SubjectSubscription,
    User,
)


@receiver(m2m_changed, sender=Publication.authors.through)
def notify_co_authors(sender, instance, action, pk_set, **kwargs):
    if action != "post_add" or not pk_set:
        return
    uploader = instance.uploaded_by
    new_author_pks = list(pk_set)

    for user_pk in new_author_pks:
        if uploader and user_pk == uploader.pk:
            continue
        Notification.objects.create(
            recipient_id=user_pk,
            actor=uploader,
            notification_type=Notification.Type.CO_AUTHORED,
            publication=instance,
        )

    followers_qs = (
        User.objects.filter(following__in=new_author_pks)
        .exclude(pk__in=new_author_pks)
        .exclude(pk=uploader.pk if uploader else None)
        .distinct()
    )
    already_notified = set(
        Notification.objects.filter(
            publication=instance,
            recipient__in=followers_qs,
        ).values_list("recipient_id", flat=True)
    )
    for follower in followers_qs:
        if follower.pk in already_notified:
            continue
        Notification.objects.create(
            recipient=follower,
            actor=uploader,
            notification_type=Notification.Type.NEW_PUB_AUTHOR,
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


@receiver(post_save, sender=Publication)
def notify_subscribers_on_new_publication(sender, instance, created, **kwargs):
    if not created:
        return
    pub = instance
    uploader = pub.uploaded_by
    uploader_pk = uploader.pk if uploader else None
    notified: set = set()

    if pub.subject:
        subject_subs = (
            SubjectSubscription.objects.filter(subject=pub.subject)
            .exclude(user_id=uploader_pk)
            .select_related("user")
        )
        for sub in subject_subs:
            Notification.objects.create(
                recipient=sub.user,
                actor=uploader,
                notification_type=Notification.Type.NEW_PUB_SUBJECT,
                publication=pub,
            )
            notified.add(sub.user_id)

    pub_kw_set = {
        kw.strip().lower() for kw in (pub.keywords or "").split(",") if kw.strip()
    }
    if pub_kw_set:
        keyword_subs = (
            KeywordSubscription.objects.filter(keyword__in=pub_kw_set)
            .exclude(user_id=uploader_pk)
            .select_related("user")
        )
        for sub in keyword_subs:
            if sub.user_id in notified:
                continue
            Notification.objects.create(
                recipient=sub.user,
                actor=uploader,
                notification_type=Notification.Type.NEW_PUB_KEYWORD,
                publication=pub,
            )
            notified.add(sub.user_id)
