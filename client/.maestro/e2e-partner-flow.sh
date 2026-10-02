#!/bin/bash
set -e

CONTAINER="const-django-container"

# --- Cleanup any previous test users ---
docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
User.objects.filter(email__in=['userA@test.com', 'userB@test.com', 'userC@test.com']).delete()
"

# --- Seed all 3 users (with onboarding complete + known passwords) ---
PARTNER_A_CODE=$(docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
u = User.objects.create_user(username='userA@test.com', email='userA@test.com', password='testpassword123', first_name='PartnerA', onboarding_complete=True)
print(u.partner_code)
" | tail -1 | tr -d '\r\n')

PARTNER_B_CODE=$(docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
u = User.objects.create_user(username='userB@test.com', email='userB@test.com', password='testpassword123', first_name='PartnerB', onboarding_complete=True)
print(u.partner_code)
" | tail -1 | tr -d '\r\n')

PARTNER_C_CODE=$(docker exec "$CONTAINER" python manage.py shell -c "
from user_app.models import User
u = User.objects.create_user(username='userC@test.com', email='userC@test.com', password='testpassword123', first_name='PartnerC', onboarding_complete=True)
print(u.partner_code)
" | tail -1 | tr -d '\r\n')

export PARTNER_A_CODE PARTNER_B_CODE PARTNER_C_CODE

echo "Seeded User A (code: $PARTNER_A_CODE), User B (code: $PARTNER_B_CODE), User C (code: $PARTNER_C_CODE)"

# --- Run tests sequentially ---
cd "$(dirname "$0")/.."

maestro test .maestro/partner-send-request.yaml -e PARTNER_B_CODE="$PARTNER_B_CODE"
maestro test .maestro/partner-accept-request.yaml
maestro test .maestro/partner-decline-request.yaml -e PARTNER_C_CODE="$PARTNER_C_CODE"
maestro test .maestro/partner-3way.yaml -e PARTNER_C_CODE="$PARTNER_C_CODE"

echo "All partner flow tests passed."
