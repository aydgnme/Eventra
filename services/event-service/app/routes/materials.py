import os
import uuid

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app import db
from app.models.event import Event
from app.models.material import FileType, Material

materials_bp = Blueprint("materials", __name__)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "pptx", "ppt"}


def _ext(filename):
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _allowed(filename):
    return _ext(filename) in ALLOWED_EXTENSIONS


def _infer_file_type(ext):
    if ext == "pdf":
        return FileType.PDF
    if ext in ("pptx", "ppt"):
        return FileType.PRESENTATION
    return FileType.IMAGE


def _get_event_or_404(event_id):
    event = db.session.get(Event, event_id)
    if not event:
        return None, (jsonify({"error": "Event not found"}), 404)
    return event, None


def _can_manage(event, user_id, claims):
    return event.organizer_id == int(user_id) or claims.get("role") == "admin"


# ---------------------------------------------------------------------------
# List materials
# ---------------------------------------------------------------------------

@materials_bp.route("/<int:event_id>/materials", methods=["GET"])
@jwt_required(optional=True)
def list_materials(event_id):
    event, err = _get_event_or_404(event_id)
    if err:
        return err

    if not event.is_published:
        user_id = get_jwt_identity()
        claims = get_jwt()
        if not user_id or not _can_manage(event, user_id, claims):
            return jsonify({"error": "Event not found"}), 404

    return jsonify({"materials": [m.to_dict() for m in event.materials]}), 200


# ---------------------------------------------------------------------------
# Upload material
# ---------------------------------------------------------------------------

@materials_bp.route("/<int:event_id>/materials", methods=["POST"])
@jwt_required()
def upload_material(event_id):
    user_id = get_jwt_identity()
    claims = get_jwt()

    event, err = _get_event_or_404(event_id)
    if err:
        return err

    if not _can_manage(event, user_id, claims):
        return jsonify({"error": "Not authorized"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not _allowed(file.filename):
        return jsonify({
            "error": f"File type not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}"
        }), 400

    upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], str(event_id))
    os.makedirs(upload_dir, exist_ok=True)

    ext = _ext(file.filename)
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    abs_path = os.path.join(upload_dir, safe_name)
    file.save(abs_path)

    material = Material(
        event_id=event_id,
        file_name=file.filename,
        file_path=os.path.join(str(event_id), safe_name),
        file_type=_infer_file_type(ext),
        file_size=os.path.getsize(abs_path),
    )
    db.session.add(material)
    db.session.commit()

    return jsonify({"message": "Material uploaded", "material": material.to_dict()}), 201


# ---------------------------------------------------------------------------
# Delete material
# ---------------------------------------------------------------------------

@materials_bp.route("/<int:event_id>/materials/<int:material_id>", methods=["DELETE"])
@jwt_required()
def delete_material(event_id, material_id):
    user_id = get_jwt_identity()
    claims = get_jwt()

    event, err = _get_event_or_404(event_id)
    if err:
        return err

    if not _can_manage(event, user_id, claims):
        return jsonify({"error": "Not authorized"}), 403

    material = db.session.get(Material, material_id)
    if not material or material.event_id != event_id:
        return jsonify({"error": "Material not found"}), 404

    abs_path = os.path.join(current_app.config["UPLOAD_FOLDER"], material.file_path)
    if os.path.exists(abs_path):
        os.remove(abs_path)

    db.session.delete(material)
    db.session.commit()

    return jsonify({"message": "Material deleted"}), 200


# ---------------------------------------------------------------------------
# Download material
# ---------------------------------------------------------------------------

@materials_bp.route("/<int:event_id>/materials/<int:material_id>/download", methods=["GET"])
@jwt_required(optional=True)
def download_material(event_id, material_id):
    event, err = _get_event_or_404(event_id)
    if err:
        return err

    if not event.is_published:
        user_id = get_jwt_identity()
        claims = get_jwt()
        if not user_id or not _can_manage(event, user_id, claims):
            return jsonify({"error": "Event not found"}), 404

    material = db.session.get(Material, material_id)
    if not material or material.event_id != event_id:
        return jsonify({"error": "Material not found"}), 404

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    serve_dir = os.path.join(upload_folder, str(event_id))
    filename_on_disk = material.file_path.split(os.sep)[-1]

    return send_from_directory(serve_dir, filename_on_disk, download_name=material.file_name)
