from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from schemas.comparison_schema import CompareTechnicalRequest
from services.comparison_service import execute_technical_comparison


class FakeConnection:
    @asynccontextmanager
    async def transaction(self):
        yield


@pytest.mark.asyncio
async def test_comparison_computes_conformity_score_and_persists_evaluations():
    result = SimpleNamespace(
        evaluations=[
            SimpleNamespace(requirement_id=1, matched_characteristic_ids=[11], evaluation=1),
            SimpleNamespace(requirement_id=2, matched_characteristic_ids=[12], evaluation=2),
            SimpleNamespace(requirement_id=3, matched_characteristic_ids=[], evaluation=3),
        ],
        caracteristiques_hors_exigences=[13],
    )

    update = AsyncMock()
    upsert = AsyncMock()
    with (
        patch("services.comparison_service.get_supplier_product_by_id", new=AsyncMock(return_value={"product_id": 9})),
        patch("services.comparison_service.get_product_requirements_by_id", new=AsyncMock(return_value=[{"id": 1}, {"id": 2}, {"id": 3}])),
            patch(
                "services.comparison_service.get_technical_characteristics_by_supplier_product",
                new=AsyncMock(return_value=[{"id": 11}, {"id": 12}, {"id": 13}]),
            ),
            patch("services.comparison_service.compare_requirements_with_characteristics", new=AsyncMock(return_value=result)),
            patch("services.comparison_service.reset_technical_characteristic_evaluations", new=AsyncMock()),
        patch("services.comparison_service.update_technical_characteristic_evaluation", new=update),
        patch("services.comparison_service.upsert_comparison_result", new=upsert),
    ):
        await execute_technical_comparison(FakeConnection(), CompareTechnicalRequest(supplier_product_id=4))

    assert update.await_count == 3
    assert upsert.await_args.kwargs["score"] == pytest.approx(100 / 3)
    assert upsert.await_args.kwargs["supplier_product_id"] == 4
