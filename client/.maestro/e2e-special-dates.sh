#!/bin/bash
set -e

CONTAINER="const-django-container"

# --- Cleanup any previous test users ---
docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
User.objects.filter(email__in=['userA@test.com', 'userB@test.com']).delete()
"

# --- Seed 2 users with birthdays (so default birthday dates auto-create) ---
docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
from relationship_app.models import Partnership
from relationship_app.views import create_default_special_dates
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

# Create active partnership directly (skip the UI send/accept flow)
p = Partnership.objects.create(
    initiator=userA,
    partner=userB,
    status='active',
    relation='romantic',
    anniversary=date(2024, 2, 14),
)
create_default_special_dates(p)
print('Seeded users and active partnership with default special dates')
"

# --- Run the special dates test ---
cd "$(dirname "$0")/.."

maestro test .maestro/special-dates.yaml

echo "Special dates tests passed."
