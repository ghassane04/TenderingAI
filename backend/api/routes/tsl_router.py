from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from core.dependencies import get_db, get_current_user, require_acheteur
from schemas.tsl_schema import (
    CreateTslRequest,
    CreateTslResponse,
    TslSummary,
)
from services.tsl_service import (
    service_get_tsl,
    service_get_tsl_detail,
    service_create_tsl,
    service_delete_tsl,
)

router = APIRouter(prefix="/api/tender_supplier_lots", tags=["Tender Supplier Lots"])


@router.get("/{tender_id}", response_model=List[TslSummary])
async def api_get_tsl(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère toutes les associations fournisseur/lot pour un tender.
    """
    return await service_get_tsl(conn, tender_id)


@router.post("/{tender_id}", response_model=CreateTslResponse, status_code=status.HTTP_201_CREATED)
async def api_create_tsl(
    tender_id: int,
    request: CreateTslRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Crée une nouvelle association fournisseur/lot.
    """
    async with conn.transaction():
        return await service_create_tsl(
            conn,
            tender_id=tender_id,
            supplier_id=request.supplier_id,
            technical_lot_id=request.technical_lot_id,
        )


@router.get("/detail/{tsl_id}", response_model=TslSummary)
async def api_get_tsl_detail(
    tsl_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère les détails d'une association fournisseur/lot.
    """
    return await service_get_tsl_detail(conn, tsl_id)


@router.delete("/{tsl_id}")
async def api_delete_tsl(
    tsl_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Supprime une association fournisseur/lot.
    """
    async with conn.transaction():
        return await service_delete_tsl(conn, tsl_id)