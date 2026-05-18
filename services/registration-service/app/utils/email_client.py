"""
Email utility using the Resend API.
All public functions are fire-and-forget: failures are logged, never raised.
Set RESEND_API_KEY and MAIL_FROM env vars to enable sending.
"""
import logging

from flask import current_app

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html: str, attachments: list | None = None) -> None:
    api_key = current_app.config.get("RESEND_API_KEY", "")
    if not api_key:
        logger.debug("RESEND_API_KEY not set — skipping email to %s", to_email)
        return

    import resend

    resend.api_key = api_key
    from_addr = current_app.config.get("MAIL_FROM", "Eventra <noreply@eventra.app>")

    payload = {
        "from": from_addr,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if attachments:
        payload["attachments"] = attachments

    try:
        resend.Emails.send(payload)
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as exc:
        logger.warning("Failed to send email to %s: %s", to_email, exc)


def _ticket_html(to_email: str, event_title: str, event_date: str, event_location: str, qr_b64: str | None) -> str:
    qr_section = ""
    if qr_b64:
        qr_section = f"""
        <div style="text-align:center;margin:24px 0">
          <img src="data:image/png;base64,{qr_b64}"
               alt="QR Ticket" width="200" height="200"
               style="border-radius:12px;border:1px solid #e2e8f0" />
          <p style="color:#64748b;font-size:12px;margin-top:8px">
            Show this QR code at the entrance · also attached as <em>ticket.png</em>
          </p>
        </div>
        """

    return f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;
                background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,.7);letter-spacing:.05em;text-transform:uppercase">Eventra · USV</p>
        <h1 style="margin:8px 0 0;font-size:22px;color:#fff">Entry Ticket</h1>
      </div>
      <!-- Body -->
      <div style="padding:28px 32px">
        <h2 style="margin:0 0 4px;font-size:18px;color:#f1f5f9">{event_title}</h2>
        <p style="margin:0 0 4px;color:#94a3b8;font-size:14px">📅 {event_date}</p>
        {"<p style='margin:0 0 4px;color:#94a3b8;font-size:14px'>📍 " + event_location + "</p>" if event_location else ""}
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px">Registered: <strong style="color:#e2e8f0">{to_email}</strong></p>
        <hr style="border:none;border-top:1px solid #1e293b;margin:20px 0"/>
        {qr_section}
        <p style="font-size:13px;color:#64748b;margin:0">
          If you can no longer attend, please cancel via the Eventra app so
          someone on the waitlist can take your spot.
        </p>
      </div>
    </div>
    """


def send_registration_email(to_email: str, event_title: str, event_date: str = "",
                             event_location: str = "", qr_bytes: bytes | None = None) -> None:
    import base64
    qr_b64 = base64.b64encode(qr_bytes).decode() if qr_bytes else None

    attachments = []
    if qr_bytes:
        attachments.append({
            "filename": "ticket.png",
            "content": list(qr_bytes),
        })

    _send(
        to_email,
        f"Your Ticket: {event_title}",
        _ticket_html(to_email, event_title, event_date, event_location, qr_b64),
        attachments or None,
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


def send_reminder_email(to_email: str, event_title: str, event_date: str, frontend_url: str) -> None:
    _send(
        to_email,
        f"Action Required: Confirm Attendance — {event_title}",
        f"""
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#6366f1">Attendance Confirmation Required</h2>
          <p>The event <strong>{event_title}</strong> is coming up on <strong>{event_date}</strong>.</p>
          <p>Please confirm your attendance within <strong>24 hours</strong>.
             If you don't confirm, your spot will be released to the next person on the waitlist.</p>
          <a href="{frontend_url}/my-registrations"
             style="display:inline-block;margin-top:16px;padding:12px 24px;
                    background:#6366f1;color:#fff;border-radius:8px;
                    text-decoration:none;font-weight:bold">
            Confirm Attendance
          </a>
          <p style="margin-top:24px;color:#888;font-size:13px">
            Open Eventra → My Registrations → click <em>Confirm</em> next to this event.
          </p>
        </div>
        """,
    )


def send_spot_released_email(to_email: str, event_title: str) -> None:
    _send(
        to_email,
        f"Spot Released: {event_title}",
        f"<h2>Your spot has been released</h2>"
        f"<p>You did not confirm your attendance for <strong>{event_title}</strong> in time. "
        f"Your spot has been given to the next person on the waitlist.</p>",
    )
