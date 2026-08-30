from unittest.mock import AsyncMock, patch

import pytest

from schemas.tender_metadata_schema import TenderManualCreate
from services.tender_creation_service import service_create_tender_manually


@pytest.mark.asyncio
async def test_manual_tender_accepts_missing_optional_client():
    request = TenderManualCreate(
        tender_code=" 28/2026 ",
        designation=" Acquisition de matériels informatiques ",
        nom_client=None,
    )
    conn = object()

    with (
        patch("services.tender_creation_service.get_tender_by_code", new=AsyncMock(return_value=None)),
        patch("services.tender_creation_service.insert_tender", new=AsyncMock(return_value=28)) as insert,
    ):
        response = await service_create_tender_manually(conn, request, created_by="tester")

    assert response["tender_id"] == 28
    assert response["nom_client"] == ""
    insert.assert_awaited_once_with(
        conn,
        "28/2026",
        "Acquisition de matériels informatiques",
        "",
        "tester",
    )


@pytest.mark.asyncio
async def test_manual_tender_rejects_duplicate_code():
    request = TenderManualCreate(tender_code="05/2026", designation="Matériels", nom_client="Culture")
    with patch(
        "services.tender_creation_service.get_tender_by_code",
        new=AsyncMock(return_value={"id": 5}),
    ):
        with pytest.raises(Exception) as error:
            await service_create_tender_manually(object(), request)
    assert getattr(error.value, "status_code", None) == 409
