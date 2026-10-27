from django.utils import timezone

from gamification_app.models import Streak, StreakActivity


def record_streak_activity(user, partnership):
    """
    Record that a user was active today and check if both partners
    have been active — if so, increment the streak.

    Returns the Streak object.
    """
    streak = partnership.streak
    today = timezone.localdate()

    # Reset streak if more than 2 calendar days since last completion (grace = 1 missed day)
    if streak.last_completed_at and (today - streak.last_completed_at.date()).days > 2:
        streak.current_count = 0

    # Stamp this user's activity for today
    StreakActivity.objects.update_or_create(
        streak=streak,
        user=user,
    )

    # Check if both partners were active today
    both_active = (
        StreakActivity.objects.filter(
            streak=streak,
            last_activity_at__date=today,
        ).count() == 2
    )

    already_completed_today = (
        streak.last_completed_at and streak.last_completed_at.date() == today
    )

    if both_active and not already_completed_today:
        streak.current_count += 1
        if streak.current_count > streak.longest_count:
            streak.longest_count = streak.current_count
        streak.last_completed_at = timezone.now()
        streak.save()

    return streak
