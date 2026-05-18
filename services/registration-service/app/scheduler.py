"""
Background scheduler: sends attendance reminders and promotes waitlisted
users when confirmed participants don't respond in time.

Reminder logic:
  - 3 days before event: send confirmation email to all REGISTERED participants
  - 24 h after reminder sent with no confirmation: cancel spot → promote first
    waitlisted user (FIFO)
"""
import logging
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def start_scheduler(app):
    global _scheduler
    # Avoid double-start in Flask debug reloader
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.add_job(_send_reminders, "interval", hours=1, args=[app], id="reminders")
        _scheduler.add_job(_promote_unconfirmed, "interval", hours=1, args=[app], id="promote")
        _scheduler.start()
        logger.info("Scheduler started")


def _send_reminders(app):
    with app.app_context():
        from app import db
        from app.models.registration import Registration, RegistrationStatus
        from app.utils.email_client import send_reminder_email
        from app.utils.event_client import get_event, EventNotFound, EventServiceUnavailable

        now = datetime.now(timezone.utc)
        frontend_url = app.config.get("FRONTEND_URL", "http://localhost:5173")

        unreminded = (
            Registration.query
            .filter(
                Registration.status == RegistrationStatus.REGISTERED,
                Registration.confirmation_sent_at.is_(None),
            )
            .all()
        )

        for reg in unreminded:
            if not reg.user_email:
                continue
            try:
                event = get_event(reg.event_id)
                raw = event.get("start_datetime", "")
                if not raw:
                    continue
                start_dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                time_left = start_dt - now

                # Send reminder when event is between 2.5 and 3.5 days away
                if timedelta(days=2, hours=12) <= time_left <= timedelta(days=3, hours=12):
                    event_date = start_dt.strftime("%A, %B %d at %H:%M UTC")
                    send_reminder_email(
                        reg.user_email,
                        event.get("title", f"Event #{reg.event_id}"),
                        event_date,
                        frontend_url,
                    )
                    reg.confirmation_sent_at = now
                    db.session.commit()
                    logger.info("Reminder sent to %s for event %s", reg.user_email, reg.event_id)
            except (EventNotFound, EventServiceUnavailable):
                pass
            except Exception as exc:
                logger.warning("Reminder job error for reg %s: %s", reg.id, exc)


def _promote_unconfirmed(app):
    with app.app_context():
        from app import db
        from app.models.registration import Registration, RegistrationStatus
        from app.utils.email_client import send_promotion_email, send_spot_released_email
        from app.utils.event_client import get_event, EventNotFound, EventServiceUnavailable

        now = datetime.now(timezone.utc)
        deadline = now - timedelta(hours=24)

        # Registrations where reminder was sent > 24 h ago and user didn't confirm
        unconfirmed = (
            Registration.query
            .filter(
                Registration.status == RegistrationStatus.REGISTERED,
                Registration.confirmation_sent_at.isnot(None),
                Registration.confirmation_sent_at <= deadline,
                Registration.confirmed_at.is_(None),
            )
            .all()
        )

        for reg in unconfirmed:
            try:
                event = get_event(reg.event_id)
                raw = event.get("start_datetime", "")
                if not raw:
                    continue
                start_dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))

                # Only act if event hasn't started yet
                if start_dt <= now:
                    continue

                event_title = event.get("title", f"Event #{reg.event_id}")

                # Notify unconfirmed user
                if reg.user_email:
                    send_spot_released_email(reg.user_email, event_title)

                # Cancel their spot
                reg.status = RegistrationStatus.CANCELLED
                reg.cancelled_at = now

                # Promote next waitlisted (FIFO)
                next_up = (
                    Registration.query
                    .filter_by(event_id=reg.event_id, status=RegistrationStatus.WAITLISTED)
                    .order_by(Registration.registered_at.asc())
                    .first()
                )
                if next_up:
                    next_up.status = RegistrationStatus.REGISTERED
                    next_up.confirmation_sent_at = None
                    next_up.confirmed_at = None
                    if next_up.user_email:
                        send_promotion_email(next_up.user_email, event_title)

                db.session.commit()
                logger.info(
                    "Unconfirmed reg %s cancelled; promoted %s",
                    reg.id,
                    next_up.id if next_up else "nobody",
                )
            except (EventNotFound, EventServiceUnavailable):
                pass
            except Exception as exc:
                logger.warning("Promote job error for reg %s: %s", reg.id, exc)
