from fastapi import APIRouter, Depends, status
from core.dependencies import get_db, get_current_user, require_admin

from schemas.technical_lot_schema import (
    CreateTechnicalLotRequest,
    UpdateTechnicalLotRequest,
    TechnicalLotResponse,
    TechnicalLotsListResponse,
)
from services.technical_lot_service import (
    service_list_lots,
    service_get_lot,
    service_create_lot,
    service_update_lot,
    service_delete_lot,
)

router = APIRouter(prefix="/api/technical-lots", tags=["Technical Lots"])


@router.get("", response_model=TechnicalLotsListResponse)
async def api_list_lots(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Liste tous les lots techniques."""
    return await service_list_lots(conn)


@router.get("/{lot_id}", response_model=TechnicalLotResponse)
async def api_get_lot(
    lot_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Récupère un lot technique par son ID."""
    return await service_get_lot(conn, lot_id)


@router.post("", response_model=TechnicalLotResponse, status_code=status.HTTP_201_CREATED)
async def api_create_lot(
    request: CreateTechnicalLotRequest,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """Crée un nouveau lot technique."""
    async with conn.transaction():
        return await service_create_lot(conn, request.name, request.description)


@router.put("/{lot_id}", response_model=TechnicalLotResponse)
async def api_update_lot(
    lot_id: int,
    request: UpdateTechnicalLotRequest,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """Met à jour un lot technique."""
    async with conn.transaction():
        return await service_update_lot(conn, lot_id, request.name, request.description)


@router.delete("/{lot_id}")
async def api_delete_lot(
    lot_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """Supprime un lot technique."""
    async with conn.transaction():
        return await service_delete_lot(conn, lot_id)