import re

_QUOTE_HEADER_PATTERNS = [
    re.compile(r"^Le\s.+\sa écrit\s*:\s*$", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^On\s.+\swrote\s*:\s*$", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^-{2,}\s*Original Message\s*-{2,}", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^De\s*:\s.+$", re.MULTILINE),  # en-tête "De :" réintroduit dans le corps par certains clients
]

_QUOTED_LINE = re.compile(r"^\s*>", re.MULTILINE)


def strip_quoted_reply(body: str) -> str:
    if not body:
        return body

    earliest_cut = len(body)
    for pattern in _QUOTE_HEADER_PATTERNS:
        match = pattern.search(body)
        if match and match.start() < earliest_cut:
            earliest_cut = match.start()

    cleaned = body[:earliest_cut]

    lines = cleaned.split("\n")
    lines = [ln for ln in lines if not _QUOTED_LINE.match(ln)]

    return "\n".join(lines).strip()