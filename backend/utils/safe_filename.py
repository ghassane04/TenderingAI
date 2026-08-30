import re
import uuid
from pathlib import Path

_UNSAFE_CHARS = re.compile(r"[^\w\-. ]", re.UNICODE)


def sanitize_filename(raw_name: str, fallback_ext: str = "") -> str:
    name = Path(raw_name).name
    name = _UNSAFE_CHARS.sub("_", name).strip(" .")
    if not name:
        name = f"fichier{fallback_ext}"
    return name


def unique_storage_name(raw_name: str) -> str:
    safe = sanitize_filename(raw_name)
    return f"{uuid.uuid4().hex[:12]}_{safe}"