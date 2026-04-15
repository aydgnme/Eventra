import io
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt, jwt_required

from app.models.event import Event
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User

reports_bp = Blueprint("reports", __name__)


def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


# ---------------------------------------------------------------------------
# GET /admin/reports/summary
# ---------------------------------------------------------------------------

@reports_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    err = _admin_required()
    if err:
        return err

    total_users = User.query.count()
    total_events = Event.query.count()
    published_events = Event.query.filter_by(is_published=True).count()
    pending_events = Event.query.filter_by(is_published=False).count()
    total_registrations = Registration.query.filter_by(
        status=RegistrationStatus.REGISTERED
    ).count()
    total_waitlisted = Registration.query.filter_by(
        status=RegistrationStatus.WAITLISTED
    ).count()
    total_cancelled = Registration.query.filter_by(
        status=RegistrationStatus.CANCELLED
    ).count()

    return jsonify({
        "total_users": total_users,
        "total_events": total_events,
        "published_events": published_events,
        "pending_events": pending_events,
        "total_registrations": total_registrations,
        "total_waitlisted": total_waitlisted,
        "total_cancelled": total_cancelled,
    }), 200


# ---------------------------------------------------------------------------
# GET /admin/reports/events?month=4&year=2026
# ---------------------------------------------------------------------------

@reports_bp.route("/events", methods=["GET"])
@jwt_required()
def events_report():
    err = _admin_required()
    if err:
        return err

    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)

    query = Event.query
    if year:
        query = query.filter(
            db_extract("year", Event.created_at) == year
        )
    if month:
        query = query.filter(
            db_extract("month", Event.created_at) == month
        )

    events = query.order_by(Event.created_at.desc()).all()

    result = []
    for event in events:
        data = event.to_dict()
        reg_count = Registration.query.filter_by(
            event_id=event.id, status=RegistrationStatus.REGISTERED
        ).count()
        waitlist_count = Registration.query.filter_by(
            event_id=event.id, status=RegistrationStatus.WAITLISTED
        ).count()
        data["registered_count"] = reg_count
        data["waitlisted_count"] = waitlist_count
        result.append(data)

    return jsonify({
        "events": result,
        "total": len(result),
        "filters": {"month": month, "year": year},
    }), 200


# ---------------------------------------------------------------------------
# GET /admin/reports/export  — PDF export
# ---------------------------------------------------------------------------

@reports_bp.route("/export", methods=["GET"])
@jwt_required()
def export_pdf():
    err = _admin_required()
    if err:
        return err

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        from reportlab.lib import colors
    except ImportError:
        return jsonify({"error": "PDF export not available (reportlab not installed)"}), 501

    total_users = User.query.count()
    total_events = Event.query.count()
    published_events = Event.query.filter_by(is_published=True).count()
    total_registrations = Registration.query.filter_by(
        status=RegistrationStatus.REGISTERED
    ).count()

    recent_events = (
        Event.query.filter_by(is_published=True)
        .order_by(Event.created_at.desc())
        .limit(10)
        .all()
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Eventra — Admin Report", styles["Title"]))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("Summary", styles["Heading2"]))
    summary_data = [
        ["Metric", "Count"],
        ["Total Users", str(total_users)],
        ["Total Events", str(total_events)],
        ["Published Events", str(published_events)],
        ["Total Registrations", str(total_registrations)],
    ]
    summary_table = Table(summary_data, colWidths=[10*cm, 5*cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph("Recent Published Events", styles["Heading2"]))
    event_data = [["ID", "Title", "Category", "Capacity", "Created"]]
    for e in recent_events:
        event_data.append([
            str(e.id),
            e.title[:40] + ("…" if len(e.title) > 40 else ""),
            e.category.value if e.category else "—",
            str(e.capacity) if e.capacity else "∞",
            e.created_at.strftime("%Y-%m-%d") if e.created_at else "—",
        ])

    event_table = Table(event_data, colWidths=[1.5*cm, 7*cm, 3*cm, 2.5*cm, 3*cm])
    event_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(event_table)

    doc.build(story)
    buf.seek(0)

    filename = f"eventra-report-{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


def db_extract(field: str, column):
    """SQLAlchemy extract helper."""
    from sqlalchemy import extract
    return extract(field, column)
