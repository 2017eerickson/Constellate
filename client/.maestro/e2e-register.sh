#!/bin/bash
# Delete test user from Django DB (if exists), then run the register flow
docker exec const-django-container python manage.py shell -c \
  "from user_app.models import User; User.objects.filter(email='testuser@example.com').delete()"

cd "$(dirname "$0")/.." && maestro test .maestro/register.yaml
