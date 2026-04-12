"""
Tests for material endpoints:
  GET    /events/<id>/materials
  POST   /events/<id>/materials
  DELETE /events/<id>/materials/<mid>
  GET    /events/<id>/materials/<mid>/download
"""
import io

from .conftest import BASE_EVENT


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PDF_FILE = (io.BytesIO(b"%PDF-1.4 test content"), "slides.pdf")
IMAGE_FILE = (io.BytesIO(b"\x89PNG\r\n\x1a\n fake png"), "photo.png")
DISALLOWED_FILE = (io.BytesIO(b"<html>bad</html>"), "hack.html")


def _upload(client, event_id, headers, file=None, filename=None):
    if file is None:
        data, name = PDF_FILE
        data = io.BytesIO(data.read())
        data.seek(0)
    else:
        data, name = file
    filename = filename or name
    return client.post(
        f"/events/{event_id}/materials",
        data={"file": (data, filename)},
        content_type="multipart/form-data",
        headers=headers,
    )


def _create_event(client, headers, published=True):
    resp = client.post(
        "/events/",
        json={**BASE_EVENT, "is_published": published},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.get_json()["event"]


# ---------------------------------------------------------------------------
# POST /events/<id>/materials  — upload
# ---------------------------------------------------------------------------

class TestUploadMaterial:
    def test_organizer_can_upload_pdf(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = _upload(client, event["id"], organizer_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert "material" in data
        assert data["material"]["file_name"] == "slides.pdf"
        assert data["material"]["file_type"] == "pdf"

    def test_organizer_can_upload_image(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        file = (io.BytesIO(b"fake png bytes"), "photo.png")
        resp = _upload(client, event["id"], organizer_headers, file=file)
        assert resp.status_code == 201
        assert resp.get_json()["material"]["file_type"] == "image"

    def test_admin_can_upload_to_any_event(self, client, organizer_headers, admin_headers):
        event = _create_event(client, organizer_headers)
        resp = _upload(client, event["id"], admin_headers)
        assert resp.status_code == 201

    def test_other_organizer_cannot_upload(self, client, organizer_headers, another_organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = _upload(client, event["id"], another_organizer_headers)
        assert resp.status_code == 403

    def test_student_cannot_upload(self, client, organizer_headers, student_headers):
        event = _create_event(client, organizer_headers)
        resp = _upload(client, event["id"], student_headers)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_upload(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = _upload(client, event["id"], {})
        assert resp.status_code == 401

    def test_disallowed_extension_returns_400(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        file = (io.BytesIO(b"bad"), "hack.html")
        resp = _upload(client, event["id"], organizer_headers, file=file)
        assert resp.status_code == 400
        assert "not allowed" in resp.get_json()["error"]

    def test_no_file_returns_400(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = client.post(
            f"/events/{event['id']}/materials",
            data={},
            content_type="multipart/form-data",
            headers=organizer_headers,
        )
        assert resp.status_code == 400

    def test_upload_to_nonexistent_event_returns_404(self, client, organizer_headers):
        resp = _upload(client, 99999, organizer_headers)
        assert resp.status_code == 404

    def test_material_response_contains_required_fields(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = _upload(client, event["id"], organizer_headers)
        material = resp.get_json()["material"]
        for field in ("id", "event_id", "file_name", "file_path", "file_type", "file_size", "uploaded_at"):
            assert field in material

    def test_file_size_is_recorded(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        content = b"%PDF-1.4 " + b"x" * 100
        file = (io.BytesIO(content), "sized.pdf")
        resp = _upload(client, event["id"], organizer_headers, file=file)
        assert resp.get_json()["material"]["file_size"] == len(content)

    def test_pptx_is_allowed_and_typed_presentation(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        file = (io.BytesIO(b"fake pptx"), "deck.pptx")
        resp = _upload(client, event["id"], organizer_headers, file=file)
        assert resp.status_code == 201
        assert resp.get_json()["material"]["file_type"] == "presentation"


# ---------------------------------------------------------------------------
# GET /events/<id>/materials  — list
# ---------------------------------------------------------------------------

class TestListMaterials:
    def test_list_returns_empty_for_new_event(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = client.get(f"/events/{event['id']}/materials")
        assert resp.status_code == 200
        assert resp.get_json()["materials"] == []

    def test_list_returns_uploaded_materials(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        _upload(client, event["id"], organizer_headers)
        resp = client.get(f"/events/{event['id']}/materials")
        assert len(resp.get_json()["materials"]) == 1

    def test_list_multiple_materials(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        _upload(client, event["id"], organizer_headers)
        file2 = (io.BytesIO(b"img"), "img.jpg")
        _upload(client, event["id"], organizer_headers, file=file2)
        resp = client.get(f"/events/{event['id']}/materials")
        assert len(resp.get_json()["materials"]) == 2

    def test_list_published_event_unauthenticated(self, client, organizer_headers):
        event = _create_event(client, organizer_headers, published=True)
        _upload(client, event["id"], organizer_headers)
        resp = client.get(f"/events/{event['id']}/materials")
        assert resp.status_code == 200

    def test_list_unpublished_event_as_owner(self, client, organizer_headers):
        event = _create_event(client, organizer_headers, published=False)
        resp = client.get(f"/events/{event['id']}/materials", headers=organizer_headers)
        assert resp.status_code == 200

    def test_list_unpublished_event_unauthenticated_returns_404(self, client, organizer_headers):
        event = _create_event(client, organizer_headers, published=False)
        resp = client.get(f"/events/{event['id']}/materials")
        assert resp.status_code == 404

    def test_list_unpublished_event_as_other_organizer_returns_404(
        self, client, organizer_headers, another_organizer_headers
    ):
        event = _create_event(client, organizer_headers, published=False)
        resp = client.get(f"/events/{event['id']}/materials", headers=another_organizer_headers)
        assert resp.status_code == 404

    def test_list_nonexistent_event_returns_404(self, client):
        resp = client.get("/events/99999/materials")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /events/<id>/materials/<mid>
# ---------------------------------------------------------------------------

class TestDeleteMaterial:
    def _create_and_upload(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = _upload(client, event["id"], organizer_headers)
        return event, resp.get_json()["material"]

    def test_organizer_can_delete_own_material(self, client, organizer_headers):
        event, material = self._create_and_upload(client, organizer_headers)
        resp = client.delete(
            f"/events/{event['id']}/materials/{material['id']}",
            headers=organizer_headers,
        )
        assert resp.status_code == 200
        assert "deleted" in resp.get_json()["message"].lower()

    def test_material_gone_after_delete(self, client, organizer_headers):
        event, material = self._create_and_upload(client, organizer_headers)
        client.delete(
            f"/events/{event['id']}/materials/{material['id']}",
            headers=organizer_headers,
        )
        resp = client.get(f"/events/{event['id']}/materials")
        assert resp.get_json()["materials"] == []

    def test_admin_can_delete_any_material(self, client, organizer_headers, admin_headers):
        event, material = self._create_and_upload(client, organizer_headers)
        resp = client.delete(
            f"/events/{event['id']}/materials/{material['id']}",
            headers=admin_headers,
        )
        assert resp.status_code == 200

    def test_other_organizer_cannot_delete(self, client, organizer_headers, another_organizer_headers):
        event, material = self._create_and_upload(client, organizer_headers)
        resp = client.delete(
            f"/events/{event['id']}/materials/{material['id']}",
            headers=another_organizer_headers,
        )
        assert resp.status_code == 403

    def test_student_cannot_delete(self, client, organizer_headers, student_headers):
        event, material = self._create_and_upload(client, organizer_headers)
        resp = client.delete(
            f"/events/{event['id']}/materials/{material['id']}",
            headers=student_headers,
        )
        assert resp.status_code == 403

    def test_unauthenticated_cannot_delete(self, client, organizer_headers):
        event, material = self._create_and_upload(client, organizer_headers)
        resp = client.delete(f"/events/{event['id']}/materials/{material['id']}")
        assert resp.status_code == 401

    def test_delete_nonexistent_material_returns_404(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = client.delete(f"/events/{event['id']}/materials/99999", headers=organizer_headers)
        assert resp.status_code == 404

    def test_delete_material_from_wrong_event_returns_404(
        self, client, organizer_headers
    ):
        event1 = _create_event(client, organizer_headers)
        event2_resp = client.post(
            "/events/",
            json={**BASE_EVENT, "title": "Event 2"},
            headers=organizer_headers,
        )
        event2 = event2_resp.get_json()["event"]
        upload_resp = _upload(client, event1["id"], organizer_headers)
        material = upload_resp.get_json()["material"]

        resp = client.delete(
            f"/events/{event2['id']}/materials/{material['id']}",
            headers=organizer_headers,
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /events/<id>/materials/<mid>/download
# ---------------------------------------------------------------------------

class TestDownloadMaterial:
    def _create_and_upload(self, client, organizer_headers, published=True):
        event = _create_event(client, organizer_headers, published=published)
        content = b"%PDF-1.4 download test"
        file = (io.BytesIO(content), "report.pdf")
        resp = _upload(client, event["id"], organizer_headers, file=file)
        return event, resp.get_json()["material"], content

    def test_download_published_event_unauthenticated(self, client, organizer_headers):
        event, material, _ = self._create_and_upload(client, organizer_headers, published=True)
        resp = client.get(f"/events/{event['id']}/materials/{material['id']}/download")
        assert resp.status_code == 200

    def test_download_returns_file_content(self, client, organizer_headers):
        event, material, content = self._create_and_upload(client, organizer_headers)
        resp = client.get(f"/events/{event['id']}/materials/{material['id']}/download")
        assert resp.data == content

    def test_download_unpublished_event_as_owner(self, client, organizer_headers):
        event, material, _ = self._create_and_upload(client, organizer_headers, published=False)
        resp = client.get(
            f"/events/{event['id']}/materials/{material['id']}/download",
            headers=organizer_headers,
        )
        assert resp.status_code == 200

    def test_download_unpublished_event_unauthenticated_returns_404(
        self, client, organizer_headers
    ):
        event, material, _ = self._create_and_upload(client, organizer_headers, published=False)
        resp = client.get(f"/events/{event['id']}/materials/{material['id']}/download")
        assert resp.status_code == 404

    def test_download_nonexistent_material_returns_404(self, client, organizer_headers):
        event = _create_event(client, organizer_headers)
        resp = client.get(f"/events/{event['id']}/materials/99999/download")
        assert resp.status_code == 404

    def test_download_material_from_wrong_event_returns_404(self, client, organizer_headers):
        event1 = _create_event(client, organizer_headers)
        event2_resp = client.post(
            "/events/",
            json={**BASE_EVENT, "title": "Event 2"},
            headers=organizer_headers,
        )
        event2 = event2_resp.get_json()["event"]
        upload_resp = _upload(client, event1["id"], organizer_headers)
        material = upload_resp.get_json()["material"]

        resp = client.get(f"/events/{event2['id']}/materials/{material['id']}/download")
        assert resp.status_code == 404
