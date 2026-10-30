#!/bin/bash
set -e

CONTAINER="const-django-container"

# --- Cleanup any previous test users ---
docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
User.objects.filter(email__in=['userA@test.com', 'userB@test.com']).delete()
"

# --- Seed 2 users with active partnership + userB's mood ---
docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
from relationship_app.models import Partnership
from connection_activities_app.models import MoodSetting
from datetime import date

userA = User.objects.create_user(
    username='userA@test.com',
    email='userA@test.com',
    password='testpassword123',
    first_name='PartnerA',
    onboarding_complete=True,
    birthday=date(1990, 1, 15),
)
userB = User.objects.create_user(
    username='userB@test.com',
    email='userB@test.com',
    password='testpassword123',
    first_name='PartnerB',
    onboarding_complete=True,
    birthday=date(1992, 5, 20),
)

p = Partnership.objects.create(
    initiator=userA,
    partner=userB,
    status='active',
    relation='romantic',
    anniversary=date(2024, 2, 14),
)

# Seed userB's mood so the unseen glow appears for userA
MoodSetting.objects.create(
    user=userB,
    partnership=p,
    mood='excited',
    seen=False,
)

print('Seeded users, partnership, and userB mood')
"

cd "$(dirname "$0")/.."

# --- Run mood test ---
maestro test .maestro/mood.yaml
echo "Mood test passed."

# --- Run affection test ---
maestro test .maestro/affection.yaml
echo "Affection test passed."

# --- Run journal test (userA answers) ---
maestro test .maestro/journal.yaml
echo "Journal test passed."

# --- Seed userB's answer to the active question ---
docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
from relationship_app.models import Partnership
from connection_activities_app.models import Answer, PartnershipQuestion
from django.utils import timezone

userA = User.objects.get(email='userA@test.com')
userB = User.objects.get(email='userB@test.com')
p = Partnership.objects.get(initiator=userA, partner=userB)

pq = PartnershipQuestion.objects.filter(
    partnership=p,
    status=PartnershipQuestion.Status.ACTIVE,
).first()

Answer.objects.create(
    partnership=p,
    question=pq.question,
    user=userB,
    answer_text=\"PartnerB's test answer\",
)

# Mark as completed since both answered
pq.status = PartnershipQuestion.Status.COMPLETED
pq.completed_at = timezone.now()
pq.save()

print('Seeded userB journal answer and completed question')
"

# --- Run journal both-answered test ---
maestro test .maestro/journal-both-answered.yaml
echo "Journal both-answered test passed."

echo "All activity tests passed."
