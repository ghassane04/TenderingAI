import json
from pathlib import Path

import pytest


FIXTURES = Path(__file__).parent / "fixtures" / "appels_offres"


@pytest.mark.parametrize(
    ("filename", "code", "product_count", "delivery_days"),
    [
        ("ao_28_2026.json", "28/2026", 6, 30),
        ("ao_05_daaf_bg_2026.json", "05/DAAF/BG/2026", 17, 30),
    ],
)
def test_reference_tender_manifest(filename, code, product_count, delivery_days):
    data = json.loads((FIXTURES / filename).read_text(encoding="utf-8"))
    assert data["code"] == code
    assert data["lot"] == "Lot unique"
    assert data["delivery_days"] == delivery_days
    assert len(data["products"]) == product_count
    assert all(product["price_number"] > 0 and product["designation"] for product in data["products"])
