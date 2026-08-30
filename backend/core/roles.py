import json

VALID_ROLES = {"ROLE_ADMIN", "ROLE_ACHETEUR"}

def parse_roles(raw) -> list[str]:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return []
    return []