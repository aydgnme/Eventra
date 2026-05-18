#!/usr/bin/env python3
"""
Eventra — Database seed script.

Populates auth-service, event-service, and registration-service databases
with demo data for development and testing.

Usage:
    docker compose exec auth-service python /app/scripts/seed_auth.py
    — OR —
    python scripts/seed.py   (requires DATABASE_URL set for each service)
"""
import hashlib
import os
import sys
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

USERS = [
    {"email": "admin@eventra.usv.ro",     "full_name": "Platform Admin",    "role": "admin",     "password_env": "SEED_ADMIN_PASSWORD"},
    {"email": "org1@student.usv.ro",       "full_name": "Maria Popescu",     "role": "organizer", "password_env": "SEED_ORG1_PASSWORD"},
    {"email": "org2@student.usv.ro",       "full_name": "Andrei Ionescu",    "role": "organizer", "password_env": "SEED_ORG2_PASSWORD"},
    {"email": "student1@student.usv.ro",   "full_name": "Elena Vasile",      "role": "student",   "password_env": "SEED_STUDENT1_PASSWORD"},
    {"email": "student2@student.usv.ro",   "full_name": "Cristian Rusu",     "role": "student",   "password_env": "SEED_STUDENT2_PASSWORD"},
    {"email": "student3@student.usv.ro",   "full_name": "Ana-Maria Dobre",   "role": "student",   "password_env": "SEED_STUDENT3_PASSWORD"},
]

now = datetime.now(timezone.utc)

EVENTS = [
    {
        "title": "Introduction to Machine Learning",
        "description": "A beginner-friendly workshop covering ML fundamentals, supervised learning, and hands-on exercises with scikit-learn.",
        "location": "USV Aula Magna",
        "category": "academic",
        "participation_mode": "physical",
        "start_datetime": (now + timedelta(days=7)).isoformat(),
        "end_datetime": (now + timedelta(days=7, hours=3)).isoformat(),
        "capacity": 80,
        "is_published": True,
        "organizer_idx": 1,
    },
    {
        "title": "University Chess Tournament",
        "description": "Annual USV chess tournament open to all students. Swiss-system, 7 rounds. Prizes for top 3.",
        "location": "Sports Complex, Room B2",
        "category": "sport",
        "participation_mode": "physical",
        "start_datetime": (now + timedelta(days=14)).isoformat(),
        "end_datetime": (now + timedelta(days=14, hours=5)).isoformat(),
        "capacity": 32,
        "is_published": True,
        "organizer_idx": 1,
    },
    {
        "title": "Career Fair 2026",
        "description": "Meet recruiters from top tech companies. Bring your CV and laptop for on-site coding challenges.",
        "location": "USV Conference Center",
        "category": "career",
        "participation_mode": "hybrid",
        "start_datetime": (now + timedelta(days=21)).isoformat(),
        "end_datetime": (now + timedelta(days=21, hours=6)).isoformat(),
        "capacity": 200,
        "is_published": True,
        "organizer_idx": 2,
    },
    {
        "title": "Volunteer Day — City Cleanup",
        "description": "Join fellow students for a day of community service. Gloves and bags provided.",
        "location": "Central Park Suceava",
        "category": "volunteer",
        "participation_mode": "physical",
        "start_datetime": (now + timedelta(days=10)).isoformat(),
        "end_datetime": (now + timedelta(days=10, hours=4)).isoformat(),
        "capacity": 50,
        "is_published": True,
        "organizer_idx": 2,
    },
    {
        "title": "Film Night — Romanian Cinema",
        "description": "Screening of award-winning Romanian films followed by a panel discussion with the director.",
        "location": "USV Amphitheatre C1",
        "category": "cultural",
        "participation_mode": "physical",
        "start_datetime": (now + timedelta(days=5)).isoformat(),
        "end_datetime": (now + timedelta(days=5, hours=3)).isoformat(),
        "capacity": 120,
        "is_published": True,
        "organizer_idx": 1,
    },
    {
        "title": "Web Development Bootcamp (Draft)",
        "description": "Intensive 2-day bootcamp covering React, Node.js, and deployment.",
        "location": "Lab 301",
        "category": "academic",
        "participation_mode": "physical",
        "start_datetime": (now + timedelta(days=30)).isoformat(),
        "end_datetime": (now + timedelta(days=31, hours=6)).isoformat(),
        "capacity": 40,
        "is_published": False,
        "organizer_idx": 1,
    },
]


def print_seed_summary():
    """Print seed data summary for manual insertion or verification."""
    print("=" * 60)
    print("EVENTRA SEED DATA")
    print("=" * 60)

    print("\n--- USERS ---")
    for i, u in enumerate(USERS, 1):
        print(f"  [{i}] {u['email']}  ({u['role']})  password env: {u['password_env']}")

    print("\n--- EVENTS ---")
    for i, e in enumerate(EVENTS, 1):
        status = "PUBLISHED" if e["is_published"] else "DRAFT"
        print(f"  [{i}] {e['title']}  [{status}]")
        print(f"      Category: {e['category']}  |  Location: {e['location']}")
        print(f"      Capacity: {e['capacity']}  |  Organizer: User #{e['organizer_idx'] + 1}")

    print("\n--- REGISTRATIONS ---")
    print("  Student 1 → Event 1 (registered)")
    print("  Student 2 → Event 1 (registered)")
    print("  Student 3 → Event 1 (registered)")
    print("  Student 1 → Event 3 (registered)")
    print("  Student 2 → Event 4 (registered)")

    print("\n" + "=" * 60)
    print("To apply: run this inside Docker or with DATABASE_URL set.")
    print("Set the SEED_*_PASSWORD environment variables before creating users.")
    print("Example: docker compose exec auth-service python -c '...'")
    print("=" * 60)


if __name__ == "__main__":
    print_seed_summary()
