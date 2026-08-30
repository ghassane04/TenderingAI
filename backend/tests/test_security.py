from fastapi import HTTPException
import pytest

from core.roles import parse_roles
from core.security import create_access_token, decode_token, hash_password, verify_password


def test_password_hash_and_verification():
    hashed = hash_password("MotDePasse!2026")
    assert hashed != "MotDePasse!2026"
    assert verify_password("MotDePasse!2026", hashed)
    assert not verify_password("incorrect", hashed)


def test_access_token_round_trip_contains_identity_and_jti():
    token = create_access_token({"sub": "42", "roles": ["ROLE_ACHETEUR"]})
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["roles"] == ["ROLE_ACHETEUR"]
    assert payload["jti"]
    assert payload["exp"]


def test_decode_token_rejects_invalid_token():
    with pytest.raises(HTTPException) as error:
        decode_token("invalid.token.value")
    assert error.value.status_code == 401


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(["ROLE_ADMIN"], ["ROLE_ADMIN"]), ('["ROLE_ACHETEUR"]', ["ROLE_ACHETEUR"]), ("invalid", [])],
)
def test_parse_roles(raw, expected):
    assert parse_roles(raw) == expected
