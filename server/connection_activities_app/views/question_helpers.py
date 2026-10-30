from django.utils import timezone

from connection_activities_app.models import Question, PartnershipQuestion


CATEGORY_ORDER = [
    'communication',
    'time_logistics',
    'security',
    'agreements',
    'polycule',
    'affection',
    'growth',
]


def get_or_assign_current_question(partnership):
    """
    Return the active PartnershipQuestion for this partnership.
    If none exists, assign a new one using category rotation.

    Rotation logic:
    - Cycles through CATEGORY_ORDER, picking a random unused question per category.
    - If a category is exhausted, skips to the next one with available questions.
    - When all 60 questions are exhausted, clears tracking and starts over
      (Answer records are preserved since they reference Question directly).
    - Completed questions stay visible until the next calendar day.
    """
    # 1. Return existing active question
    active = PartnershipQuestion.objects.filter(
        partnership=partnership,
        status=PartnershipQuestion.Status.ACTIVE,
    ).select_related('question').first()

    if active:
        return active

    # 2. If the most recent question was completed today, keep showing it
    today = timezone.localdate()
    recent_completed = PartnershipQuestion.objects.filter(
        partnership=partnership,
        status=PartnershipQuestion.Status.COMPLETED,
        completed_at__date=today,
    ).select_related('question').first()

    if recent_completed:
        return recent_completed

    # 3. Determine next category index
    last_pq = PartnershipQuestion.objects.filter(
        partnership=partnership,
        status__in=[
            PartnershipQuestion.Status.COMPLETED,
            PartnershipQuestion.Status.SKIPPED,
        ],
    ).order_by('-assigned_at').first()

    next_index = (last_pq.category_order_index + 1) % len(CATEGORY_ORDER) if last_pq else 0

    # 4. Get already-used question IDs
    used_ids = set(
        PartnershipQuestion.objects.filter(partnership=partnership)
        .values_list('question_id', flat=True)
    )

    # 5. Try each category starting from next_index
    for offset in range(len(CATEGORY_ORDER)):
        cat_index = (next_index + offset) % len(CATEGORY_ORDER)
        category = CATEGORY_ORDER[cat_index]

        available = Question.objects.filter(label=category).exclude(id__in=used_ids)

        if available.exists():
            question = available.order_by('?').first()
            return PartnershipQuestion.objects.create(
                partnership=partnership,
                question=question,
                category_order_index=cat_index,
            )

    # 6. All 60 exhausted — reset tracking and start over
    PartnershipQuestion.objects.filter(partnership=partnership).delete()

    return get_or_assign_current_question(partnership)