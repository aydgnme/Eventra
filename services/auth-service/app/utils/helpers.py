import re
import time
import hashlib
import hmac
from flask import current_app


def is_valid_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_student_email(email: str) -> bool:
    return email.endswith('@student.usv.ro')

def _full_name_from_email(email: str) -> str:
    local_part = email.split("@", 1)[0].strip()
    if not local_part:
        return ""

    parts = [part for part in local_part.split(".") if part]
    if not parts:
        return ""

    cleaned_parts = []
    for i, part in enumerate(parts):
        cleaned = re.sub(r"\d+$", "", part) if i == len(parts) - 1 else part
        if cleaned:
            cleaned_parts.append(cleaned)

    return " ".join(part.capitalize() for part in cleaned_parts)

def _make_state() -> str:
    ts = str(int(time.time()))
    secret = current_app.config["SECRET_KEY"]
    sig = hmac.new(secret.encode(), ts.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{ts}:{sig}"


def _verify_state(state: str, max_age: int = 300) -> bool:
    try:
        ts, sig = state.split(":")
        secret = current_app.config["SECRET_KEY"]
        expected = hmac.new(secret.encode(), ts.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected):
            return False
        if int(time.time()) - int(ts) > max_age:
            return False
        return True
    except Exception:
        return False
