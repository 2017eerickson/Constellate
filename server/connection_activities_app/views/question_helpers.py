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

SOULMATE_CATEGORY_ORDER = [
    'self_worth',
    'emotional_awareness',
    'needs_boundaries',
    'identity_values',
    'nonmonogamy_journey',
    'self_care_joy',
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

    # 3. Pick category list based on partnership type
    is_soulmate = partnership.initiator_id == partnership.partner_id
    categories = SOULMATE_CATEGORY_ORDER if is_soulmate else CATEGORY_ORDER

    # 4. Determine next category index
    last_pq = PartnershipQuestion.objects.filter(
        partnership=partnership,
        status__in=[
            PartnershipQuestion.Status.COMPLETED,
            PartnershipQuestion.Status.SKIPPED,
        ],
    ).order_by('-assigned_at').first()

    next_index = (last_pq.category_order_index + 1) % len(categories) if last_pq else 0

    # 5. Get already-used question IDs
    used_ids = set(
        PartnershipQuestion.objects.filter(partnership=partnership)
        .values_list('question_id', flat=True)
    )

    # 6. Try each category starting from next_index
    for offset in range(len(categories)):
        cat_index = (next_index + offset) % len(categories)
        category = categories[cat_index]

        available = Question.objects.filter(
            label=category,
            is_soulmate=is_soulmate,
        ).exclude(id__in=used_ids)

        if available.exists():
            question = available.order_by('?').first()
            return PartnershipQuestion.objects.create(
                partnership=partnership,
                question=question,
                category_order_index=cat_index,
            )

    # 7. All questions exhausted — reset tracking and start over
    PartnershipQuestion.objects.filter(partnership=partnership).delete()

    return get_or_assign_current_question(partnership)