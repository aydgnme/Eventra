import calendar
import csv
import io
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt, jwt_required
from sqlalchemy import extract

from app.models.event import Event
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User

reports_bp = Blueprint("reports", __name__)


def _admin_required():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


def _reg_count(event_id: int) -> int:
    return Registration.query.filter_by(
        event_id=event_id, status=RegistrationStatus.REGISTERED
    ).count()


# ---------------------------------------------------------------------------
# GET /admin/reports/summary
# ---------------------------------------------------------------------------

@reports_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    err = _admin_required()
    if err:
        return err

    now = datetime.now(timezone.utc)
    cur_month, cur_year = now.month, now.year
    prev_month = 12 if cur_month == 1 else cur_month - 1
    prev_year = cur_year - 1 if cur_month == 1 else cur_year

    total_events = Event.query.count()
    total_registrations = Registration.query.filter_by(
        status=RegistrationStatus.REGISTERED
    ).count()
    active_organizers = User.query.filter_by(role="organizer", is_active=True).count()

    events_this_month = Event.query.filter(
        extract("month", Event.created_at) == cur_month,
        extract("year", Event.created_at) == cur_year,
    ).count()
    events_last_month = Event.query.filter(
        extract("month", Event.created_at) == prev_month,
        extract("year", Event.created_at) == prev_year,
    ).count()

    regs_this_month = Registration.query.filter(
        Registration.status == RegistrationStatus.REGISTERED,
        extract("month", Registration.registered_at) == cur_month,
        extract("year", Registration.registered_at) == cur_year,
    ).count()
    regs_last_month = Registration.query.filter(
        Registration.status == RegistrationStatus.REGISTERED,
        extract("month", Registration.registered_at) == prev_month,
        extract("year", Registration.registered_at) == prev_year,
    ).count()

    organizers_this_month = User.query.filter(
        User.role == "organizer",
        extract("month", User.created_at) == cur_month,
        extract("year", User.created_at) == cur_year,
    ).count()
    organizers_last_month = User.query.filter(
        User.role == "organizer",
        extract("month", User.created_at) == prev_month,
        extract("year", User.created_at) == prev_year,
    ).count()

    return jsonify({
        "total_events": total_events,
        "total_registrations": total_registrations,
        "average_rating": None,
        "active_organizers": active_organizers,
        "trends": {
            "events_vs_last_month": events_this_month - events_last_month,
            "registrations_vs_last_month": regs_this_month - regs_last_month,
            "rating_vs_last_month": None,
            "organizers_vs_last_month": organizers_this_month - organizers_last_month,
        },
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

    now = datetime.now(timezone.utc)
    month = request.args.get("month", now.month, type=int)
    year = request.args.get("year", now.year, type=int)

    query = Event.query.filter(
        extract("month", Event.created_at) == month,
        extract("year", Event.created_at) == year,
    )
    events = query.order_by(Event.created_at.desc()).all()

    organizer_ids = list({e.organizer_id for e in events})
    organizers = {
        u.id: u for u in User.query.filter(User.id.in_(organizer_ids)).all()
    } if organizer_ids else {}

    result = []
    total_registrations = 0
    for event in events:
        organizer = organizers.get(event.organizer_id)
        reg_count = _reg_count(event.id)
        total_registrations += reg_count
        result.append({
            "id": event.id,
            "title": event.title,
            "organizer_name": organizer.full_name if organizer else None,
            "category": event.category.value if event.category else None,
            "start_datetime": event.start_datetime.isoformat() if event.start_datetime else None,
            "registrations": reg_count,
            "capacity": event.capacity,
            "average_rating": None,
            "status": "published" if event.is_published else "pending",
        })

    period = f"{calendar.month_name[month]} {year}"

    return jsonify({
        "period": period,
        "events": result,
        "totals": {
            "total_events": len(result),
            "total_registrations": total_registrations,
            "average_rating": None,
        },
        "filters": {"month": month, "year": year},
    }), 200


# ---------------------------------------------------------------------------
# GET /admin/reports/attendance — average attendance per event
# ---------------------------------------------------------------------------

@reports_bp.route("/attendance", methods=["GET"])
@jwt_required()
def attendance_report():
    err = _admin_required()
    if err:
        return err

    events = Event.query.filter_by(is_published=True).all()

    result = []
    total_rate = 0
    counted = 0

    for event in events:
        reg_count = _reg_count(event.id)
        capacity = event.capacity
        rate = round((reg_count / capacity) * 100, 1) if capacity else None

        if rate is not None:
            total_rate += rate
            counted += 1

        result.append({
            "id": event.id,
            "title": event.title,
            "capacity": capacity,
            "registered": reg_count,
            "attendance_rate": rate,
        })

    avg_rate = round(total_rate / counted, 1) if counted else None

    return jsonify({
        "events": result,
        "average_attendance_rate": avg_rate,
        "total_events": len(result),
    }), 200


# ---------------------------------------------------------------------------
# GET /admin/reports/organizers
# ---------------------------------------------------------------------------

@reports_bp.route("/organizers", methods=["GET"])
@jwt_required()
def organizers_report():
    err = _admin_required()
    if err:
        return err

    organizers = User.query.filter_by(role="organizer").order_by(User.created_at.desc()).all()

    result = []
    for org in organizers:
        events = Event.query.filter_by(organizer_id=org.id).all()
        event_ids = [e.id for e in events]

        total_registrations = 0
        last_event_date = None

        if event_ids:
            total_registrations = Registration.query.filter(
                Registration.event_id.in_(event_ids),
                Registration.status == RegistrationStatus.REGISTERED,
            ).count()

            latest_event = max(events, key=lambda e: e.start_datetime or datetime.min)
            last_event_date = (
                latest_event.start_datetime.isoformat()
                if latest_event.start_datetime
                else None
            )

        result.append({
            "id": org.id,
            "full_name": org.full_name,
            "email": org.email,
            "total_events": len(events),
            "total_registrations": total_registrations,
            "average_rating": None,
            "last_event_date": last_event_date,
        })

    return jsonify({"organizers": result, "total": len(result)}), 200


# ---------------------------------------------------------------------------
# GET /admin/reports/export  — PDF export
# ---------------------------------------------------------------------------

@reports_bp.route("/export", methods=["GET"])
@jwt_required()
def export_pdf():
    err = _admin_required()
    if err:
        return err

    now = datetime.now(timezone.utc)
    month = request.args.get("month", now.month, type=int)
    year = request.args.get("year", now.year, type=int)

    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError:
        return jsonify({"error": "PDF export not available (reportlab not installed)"}), 501

    total_users = User.query.count()
    total_events = Event.query.count()
    published_events = Event.query.filter_by(is_published=True).count()
    total_registrations = Registration.query.filter_by(
        status=RegistrationStatus.REGISTERED
    ).count()

    recent_events = (
        Event.query.filter(
            extract("month", Event.created_at) == month,
            extract("year", Event.created_at) == year,
        )
        .order_by(Event.created_at.desc())
        .limit(20)
        .all()
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    story = []

    period_label = f"{calendar.month_name[month]} {year}"
    story.append(Paragraph(f"Eventra — Admin Report ({period_label})", styles["Title"]))
    story.append(Paragraph(
        f"Generated: {now.strftime('%Y-%m-%d %H:%M UTC')}",
        styles["Normal"],
    ))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("Platform Summary", styles["Heading2"]))
    summary_data = [
        ["Metric", "Count"],
        ["Total Users", str(total_users)],
        ["Total Events", str(total_events)],
        ["Published Events", str(published_events)],
        ["Total Registrations", str(total_registrations)],
    ]
    summary_table = Table(summary_data, colWidths=[10 * cm, 5 * cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph(f"Events — {period_label}", styles["Heading2"]))
    event_data = [["ID", "Title", "Category", "Capacity", "Created"]]
    for e in recent_events:
        event_data.append([
            str(e.id),
            e.title[:40] + ("…" if len(e.title) > 40 else ""),
            e.category.value if e.category else "—",
            str(e.capacity) if e.capacity else "∞",
            e.created_at.strftime("%Y-%m-%d") if e.created_at else "—",
        ])

    event_table = Table(event_data, colWidths=[1.5 * cm, 7 * cm, 3 * cm, 2.5 * cm, 3 * cm])
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

    filename = f"eventra-report-{calendar.month_name[month].lower()}-{year}.pdf"
    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


# ---------------------------------------------------------------------------
# GET /admin/reports/export/csv  — CSV export
# ---------------------------------------------------------------------------

@reports_bp.route("/export/csv", methods=["GET"])
@jwt_required()
def export_csv():
    err = _admin_required()
    if err:
        return err

    now = datetime.now(timezone.utc)
    month = request.args.get("month", now.month, type=int)
    year = request.args.get("year", now.year, type=int)

    events = (
        Event.query.filter(
            extract("month", Event.created_at) == month,
            extract("year", Event.created_at) == year,
        )
        .order_by(Event.created_at.desc())
        .all()
    )

    organizer_ids = list({e.organizer_id for e in events})
    organizers = {
        u.id: u for u in User.query.filter(User.id.in_(organizer_ids)).all()
    } if organizer_ids else {}

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ID", "Title", "Organizer", "Category", "Date", "Capacity", "Registrations", "Status"])

    for e in events:
        org = organizers.get(e.organizer_id)
        writer.writerow([
            e.id,
            e.title,
            org.full_name if org else "",
            e.category.value if e.category else "",
            e.start_datetime.isoformat() if e.start_datetime else "",
            e.capacity or "",
            _reg_count(e.id),
            "published" if e.is_published else "pending",
        ])

    output = io.BytesIO(buf.getvalue().encode("utf-8"))
    period = f"{calendar.month_name[month].lower()}-{year}"
    return send_file(
        output,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"eventra-events-{period}.csv",
    )
