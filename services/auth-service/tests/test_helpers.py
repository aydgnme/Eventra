"""
Tests for app/utils/helpers.py — pure utility functions.
"""
import time

import pytest

from app.utils.helpers import (
    _full_name_from_email,
    _make_state,
    _verify_state,
    is_student_email,
    is_university_staff_email,
    is_valid_email,
    role_from_university_email,
)


class TestIsValidEmail:
    @pytest.mark.parametrize(
        "email",
        [
            "user@example.com",
            "user.name+tag@domain.co",
            "user123@student.usv.ro",
            "a@b.io",
            "CAPS@Domain.COM",
        ],
    )
    def test_valid_emails(self, email):
        assert is_valid_email(email) is True

    @pytest.mark.parametrize(
        "email",
        [
            "not-an-email",
            "missing@",
            "@nodomain.com",
            "double@@domain.com",
            "spaces in@domain.com",
            "nodot@domain",
            "",
            "   ",
        ],
    )
    def test_invalid_emails(self, email):
        assert is_valid_email(email) is False


class TestIsStudentEmail:
    @pytest.mark.parametrize(
        "email",
        [
            "student@student.usv.ro",
            "john.doe@student.usv.ro",
            "a.b.c@student.usv.ro",
        ],
    )
    def test_student_domain_accepted(self, email):
        assert is_student_email(email) is True

    @pytest.mark.parametrize(
        "email",
        [
            "teacher@usv.ro",
            "person@gmail.com",
            "admin@student.usv.ro.evil.com",
            "fakestudent.usv.ro@malicious.com",
            "student@STUDENT.USV.RO",  # case-sensitive check
        ],
    )
    def test_non_student_domains_rejected(self, email):
        assert is_student_email(email) is False


class TestIsUniversityStaffEmail:
    @pytest.mark.parametrize(
        "email",
        [
            "teacher@usv.ro",
            "profesor@eed.usv.ro",
            "researcher@atlas.usv.ro",
        ],
    )
    def test_staff_domain_accepted(self, email):
        assert is_university_staff_email(email) is True

    @pytest.mark.parametrize(
        "email",
        [
            "student@student.usv.ro",
            "person@gmail.com",
            "teacher@usv.ro.evil.com",
            "teacherusv.ro@malicious.com",
        ],
    )
    def test_non_staff_domain_rejected(self, email):
        assert is_university_staff_email(email) is False


class TestRoleFromUniversityEmail:
    @pytest.mark.parametrize(
        "email, expected_role",
        [
            ("student@student.usv.ro", "student"),
            ("teacher@usv.ro", "organizer"),
            ("profesor@eed.usv.ro", "organizer"),
            ("guest@gmail.com", None),
        ],
    )
    def test_role_resolution(self, email, expected_role):
        assert role_from_university_email(email) == expected_role


class TestFullNameFromEmail:
    @pytest.mark.parametrize(
        "email, expected",
        [
            ("john.doe@student.usv.ro", "John Doe"),
            ("ion.popescu123@student.usv.ro", "Ion Popescu"),
            ("maria@student.usv.ro", "Maria"),
            ("a.b.c@student.usv.ro", "A B C"),
        ],
    )
    def test_name_extraction(self, email, expected):
        assert _full_name_from_email(email) == expected

    def test_empty_local_part_returns_empty(self):
        # Edge case: email starting with @
        result = _full_name_from_email("@student.usv.ro")
        assert result == ""


class TestStateCreationAndVerification:
    def test_make_state_format(self, app):
        with app.app_context():
            state = _make_state()
        parts = state.split(":")
        assert len(parts) == 2
        ts, sig = parts
        assert ts.isdigit()
        assert len(sig) == 16

    def test_valid_state_verifies(self, app):
        with app.app_context():
            state = _make_state()
            assert _verify_state(state) is True

    def test_tampered_signature_fails(self, app):
        with app.app_context():
            state = _make_state()
            ts, _ = state.split(":")
            bad_state = f"{ts}:0000000000000000"
            assert _verify_state(bad_state) is False

    def test_expired_state_fails(self, app):
        with app.app_context():
            old_ts = str(int(time.time()) - 400)
            import hashlib
            import hmac as _hmac

            secret = app.config["SECRET_KEY"]
            sig = _hmac.new(
                secret.encode(), old_ts.encode(), hashlib.sha256
            ).hexdigest()[:16]
            expired_state = f"{old_ts}:{sig}"
            assert _verify_state(expired_state, max_age=300) is False

    def test_garbage_state_fails(self, app):
        with app.app_context():
            assert _verify_state("notavalidstate") is False
            assert _verify_state("") is False
            assert _verify_state(":") is False

    def test_future_timestamp_fails(self, app):
        """A state with a timestamp far in the future must be rejected."""
        with app.app_context():
            import hashlib
            import hmac as _hmac

            future_ts = str(int(time.time()) + 9999)
            secret = app.config["SECRET_KEY"]
            sig = _hmac.new(
                secret.encode(), future_ts.encode(), hashlib.sha256
            ).hexdigest()[:16]
            future_state = f"{future_ts}:{sig}"
            assert _verify_state(future_state, max_age=300) is False
