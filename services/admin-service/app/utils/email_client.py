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
        resend.Emails.send({"from": from_addr, "to": [to_email], "subject": subject, "html": html})
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as exc:
        logger.warning("Failed to send email to %s: %s", to_email, exc)


def send_event_validated_email(to_email: str, event_title: str) -> None:
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:24px 32px">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.05em">Eventra · USV</p>
        <h1 style="margin:8px 0 0;font-size:22px;color:#fff">Event Approved ✓</h1>
      </div>
      <div style="padding:28px 32px">
        <p>Your event <strong style="color:#a5b4fc">{event_title}</strong> has been reviewed and <strong style="color:#4ade80">approved</strong> by the USV admin team.</p>
        <p>It is now <strong>published and visible</strong> to all students. Participants can register immediately.</p>
        <div style="margin-top:24px;padding:16px;background:#1e293b;border-radius:8px;border-left:4px solid #22c55e">
          <p style="margin:0;font-size:13px;color:#94a3b8">You can view your event in the Organizer Dashboard.</p>
        </div>
      </div>
    </div>
    """
    _send(to_email, f'✅ Your event "{event_title}" has been approved', html)


def send_event_rejected_email(to_email: str, event_title: str, reason: str) -> None:
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:24px 32px">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.05em">Eventra · USV</p>
        <h1 style="margin:8px 0 0;font-size:22px;color:#fff">Event Not Approved</h1>
      </div>
      <div style="padding:28px 32px">
        <p>Your event <strong style="color:#a5b4fc">{event_title}</strong> was reviewed by the USV admin team but could not be approved at this time.</p>
        <div style="margin:20px 0;padding:16px;background:#1e293b;border-radius:8px;border-left:4px solid #ef4444">
          <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8">Rejection Reason</p>
          <p style="margin:0;color:#e2e8f0">{reason}</p>
        </div>
        <p style="color:#94a3b8;font-size:14px">Please revise your event details and resubmit for review. If you have questions, contact the USV admin team.</p>
      </div>
    </div>
    """
    _send(to_email, f'❌ Your event "{event_title}" was not approved', html)
