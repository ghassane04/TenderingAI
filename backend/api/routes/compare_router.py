from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from core.dependencies import get_db, get_current_user, require_acheteur
from services.comparison_info_service import (
    build_supplier_product_comparison,
    service_get_tender_lot_rankings,
)
from services.comparison_service import launch_comparison_background, service_correct_comparison
from schemas.comparison_info_schema import (
    SupplierProductComparisonResult,
    ComparisonCorrectionRequest,
    LotSupplierRankingResponse,
)

router = APIRouter(prefix="/api", tags=["Comparison"])


@router.post("/compare/{supplier_product_id}", status_code=status.HTTP_202_ACCEPTED)
async def api_compare(
    supplier_product_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    launch_comparison_background(supplier_product_id)
    return {
        "success": True,
        "supplier_product_id": supplier_product_id,
        "message": "Comparaison démarrée en arrière-plan.",
    }


@router.patch("/compare/{supplier_product_id}/corrections", response_model=SupplierProductComparisonResult)
async def api_correct_comparison(
    supplier_product_id: int, request: ComparisonCorrectionRequest,
    conn=Depends(get_db), current_user=Depends(require_acheteur),
):
    corrections = [c.model_dump() for c in request.corrections]
    return await service_correct_comparison(conn, supplier_product_id, corrections)

@router.get("/compare/{supplier_product_id}/supplier_product", response_model=SupplierProductComparisonResult)
async def api_supplier_product_comparison(
    supplier_product_id: int, conn=Depends(get_db), current_user=Depends(get_current_user),
):
    return await build_supplier_product_comparison(conn, supplier_product_id)

@router.get("/compare/{tender_id}/rankings", response_model=List[LotSupplierRankingResponse])
async def api_tender_lot_rankings(
    tender_id: int, conn=Depends(get_db), current_user=Depends(get_current_user),
):
    return await service_get_tender_lot_rankings(conn, tender_id)
