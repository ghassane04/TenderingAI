from pathlib import Path

import pytest

from services.tender_creation_service import (
    UnsupportedFileTypeError,
    format_file_size,
    resolve_filetype_id,
    validate_file,
)
from utils.email_cleaner import strip_quoted_reply
from utils.safe_filename import sanitize_filename


def test_sanitize_filename_blocks_path_traversal_and_unsafe_characters():
    assert sanitize_filename("../../CPS AO: 28/2026?.pdf") == "2026_.pdf"
    assert sanitize_filename("   ") == "fichier"


@pytest.mark.parametrize(
    ("filename", "expected"),
    [("cps.pdf", 1), ("offre.DOCX", 2), ("prix.xlsx", 3), ("notes.txt", 4)],
)
def test_resolve_filetype_id(filename: str, expected: int):
    assert resolve_filetype_id(Path(filename)) == expected


def test_validate_file_rejects_empty_and_unsupported_files(tmp_path: Path):
    empty_pdf = tmp_path / "empty.pdf"
    empty_pdf.touch()
    with pytest.raises(ValueError, match="Fichier vide"):
        validate_file(empty_pdf)

    unsupported = tmp_path / "payload.exe"
    unsupported.write_bytes(b"test")
    with pytest.raises(UnsupportedFileTypeError):
        validate_file(unsupported)


def test_format_file_size_uses_human_readable_units():
    assert format_file_size(0) == "0.0 B"
    assert format_file_size(1536) == "1.5 KB"
    with pytest.raises(ValueError, match="négative"):
        format_file_size(-1)


def test_strip_quoted_reply_removes_previous_email_thread():
    body = "Bonjour,\nVeuillez trouver notre fiche.\n\nLe lundi 3 août a écrit :\n> ancien message"
    assert strip_quoted_reply(body) == "Bonjour,\nVeuillez trouver notre fiche."
