"""
Email utility using the Resend API.
All public functions are fire-and-forget: failures are logged, never raised.
Set RESEND_API_KEY and MAIL_FROM env vars to enable sending.
"""
import logging

from flask import current_app

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html: str) -> None:
    api_key = current_app.config.get("RESEND_API_KEY", "")
    if not api_key:
        logger.debug("RESEND_API_KEY not set — skipping email to %s", to_email)
        return

    import resend

    resend.api_key = api_key
    from_addr = current_app.config.get("MAIL_FROM", "Eventra <noreply@eventra.app>")

    try:
        resend.Emails.send({
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": html,
        })
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as exc:
        logger.warning("Failed to send email to %s: %s", to_email, exc)


def send_registration_email(to_email: str, event_title: str) -> None:
    _send(
        to_email,
        f"Registration Confirmed: {event_title}",
        f"<h2>Registration Confirmed</h2>"
        f"<p>You've successfully registered for <strong>{event_title}</strong>.</p>",
    )


def send_waitlist_email(to_email: str, event_title: str) -> None:
    _send(
        to_email,
        f"Waitlisted: {event_title}",
        f"<h2>Added to Waitlist</h2>"
        f"<p>The event <strong>{event_title}</strong> is currently full. "
        f"You've been added to the waitlist and will be notified if a spot opens up.</p>",
    )


def send_cancellation_email(to_email: str, event_title: str) -> None:
    _send(
        to_email,
        f"Registration Cancelled: {event_title}",
        f"<h2>Registration Cancelled</h2>"
        f"<p>Your registration for <strong>{event_title}</strong> has been cancelled.</p>",
    )


def send_promotion_email(to_email: str, event_title: str) -> None:
    _send(
        to_email,
        f"Spot Available: {event_title}",
        f"<h2>You've Been Promoted from the Waitlist!</h2>"
        f"<p>A spot opened up for <strong>{event_title}</strong> — you are now confirmed!</p>",
    )
