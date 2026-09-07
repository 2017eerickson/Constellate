# Constellate

For people who want to stay deeply connected to their non-monogamous relationships,
who are separated by distance or want to find new ways to connect amid busy schedules,
Constellate is a non-monogamous, gamified relationship and lifestyle app.
Unlike other gamified relationship and lifestyle apps,
Constellate gives polyamorous people the same connection tools monogamous couples have, built for the realities of polyamory.

## Tech Stack

- **Backend:** Django 6.0 + Django REST Framework
- **Frontend:** React Native (Expo)
- **Database:** PostgreSQL 15
- **Containerization:** Docker Compose

## Project Structure

```
constellate/
├── server/                          # Django backend
│   ├── dockerfile
│   ├── manage.py
│   ├── constellate_proj/            # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── user_app/                    # Auth & identity
│   │   ├── models.py               # Custom User model
│   │   └── migrations/
│   ├── profile_app/                 # Display & social info
│   │   ├── models.py               # Profile model
│   │   └── migrations/
│   ├── relationship_app/            # Partner connections
│   │   ├── models.py               # Partnership model
│   │   ├── signals.py              # Auto-create self-partnership on signup
│   │   └── migrations/
│   └── gamification_app/            # Points & streaks
│       ├── models.py               # Stardust, Streak, StreakActivity
│       └── migrations/
├── client/                          # React Native (Expo) frontend
│   ├── App.js
│   ├── app.json
│   └── package.json
├── docker-compose.yml
├── requirements.txt
├── .env                             # Environment variables (not committed)
└── .gitignore
```

## Models

### User (`user_app`)
Extends `AbstractUser`. Login via email (Google SSO).

| Field | Type | Notes |
|-------|------|-------|
| email | EmailField | unique, used as `USERNAME_FIELD` |
| birthday | DateField | nullable |
| is_verified | BooleanField | default `False` |
| partner_code | CharField(8) | unique, auto-generated, not editable |
| created_at | DateTimeField | auto |
| updated_at | DateTimeField | auto |

### Profile (`profile_app`)
OneToOne → User. Stores relationship preferences.

| Field | Type | Notes |
|-------|------|-------|
| user | OneToOneField → User | cascade delete |
| relationship_style | CharField(30) | choices: hierarchical, non_hierarchical, relationship_anarchy, parallel, other |
| created_at | DateTimeField | auto |
| updated_at | DateTimeField | auto |

### Partnership (`relationship_app`)
Two ForeignKeys to User. A self-partnership (soulmate) is auto-created on signup via signal.

| Field | Type | Notes |
|-------|------|-------|
| initiator | ForeignKey → User | who sent the invite |
| partner | ForeignKey → User | who received the invite |
| status | CharField(20) | pending, active, paused, ended |
| relation | CharField(20) | soulmate, romantic, platonic, metamour, other |
| started_at | DateTimeField | auto |
| ended_at | DateTimeField | nullable |

Constraint: `unique_together = ('initiator', 'partner')`

### Stardust (`gamification_app`)
Points earned per user per partnership.

| Field | Type | Notes |
|-------|------|-------|
| partnership | ForeignKey → Partnership | cascade delete |
| user | ForeignKey → User | cascade delete |
| total | PositiveIntegerField | default 0 |

Constraint: `unique_together = ('partnership', 'user')`

### Streak (`gamification_app`)
OneToOne → Partnership. Shared streak counter.

| Field | Type | Notes |
|-------|------|-------|
| partnership | OneToOneField → Partnership | cascade delete |
| current_count | PositiveIntegerField | default 0 |
| longest_count | PositiveIntegerField | default 0 |
| last_completed_at | DateTimeField | nullable |

### StreakActivity (`gamification_app`)
Tracks each user's last activity within a streak.

| Field | Type | Notes |
|-------|------|-------|
| streak | ForeignKey → Streak | cascade delete |
| user | ForeignKey → User | cascade delete |
| last_activity_at | DateTimeField | auto-updated |

Constraint: `unique_together = ('streak', 'user')`

## Model Relationships

```
User
 ├── 1:1 → Profile
 ├── 1:N → Partnership (as initiator)
 ├── 1:N → Partnership (as partner)
 ├── 1:N → Stardust
 └── 1:N → StreakActivity

Partnership
 ├── 1:1 → Streak
 └── 1:N → Stardust

Streak
 └── 1:N → StreakActivity
```

## Setup

### Prerequisites
- Docker & Docker Compose
- Node.js (for Expo client)

### Environment Variables
Create a `.env` file in the project root:
```
POSTGRES_DB=constellate
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
DATABASE_HOST=db
DATABASE_PORT=5432
```

### Run the Backend
```bash
docker compose up --build
```
This starts PostgreSQL on port 5433 (host) and Django on port 8000.

### Run Migrations
```bash
docker compose exec backend python manage.py migrate
```

### Run the Client
```bash
cd client
npm install
npx expo start
```
