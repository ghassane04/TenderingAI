from fastapi import APIRouter, Depends, status

from core.dependencies import get_db, get_current_user, require_acheteur
from schemas.product_schema import (
    ProductCorrection,
    RequirementCorrection,
)
from services.product_service import (
    service_get_tender_products,
    service_update_tender_product,
    service_update_requirement,
    service_add_product,
    service_add_requirement,
    service_delete_product,
    service_delete_requirement,
)

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("/{tender_id}")
async def api_get_tender_products(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère tous les produits d'un tender avec leurs exigences.
    """
    return await service_get_tender_products(conn, tender_id)


@router.post("/{tender_id}", status_code=status.HTTP_201_CREATED)
async def api_add_product(
    tender_id: int,
    request: ProductCorrection,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Ajoute un nouveau produit à un tender.
    """
    async with conn.transaction():
        new_id = await service_add_product(conn, tender_id, request)
        return {"success": True, "product_id": new_id}


@router.post("/{product_id}/requirements", status_code=status.HTTP_201_CREATED)
async def api_add_requirement(
    product_id: int,
    request: RequirementCorrection,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Ajoute une nouvelle exigence à un produit.
    """
    async with conn.transaction():
        new_id = await service_add_requirement(conn, product_id, request)
        return {"success": True, "requirement_id": new_id}


@router.patch("/{product_id}")
async def api_update_product(
    product_id: int,
    request: ProductCorrection,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Met à jour un produit (designation, technical_lot_id, tender_document_id).
    """
    request.id = product_id
    async with conn.transaction():
        return await service_update_tender_product(conn, request)


@router.patch("/requirements/{requirement_id}")
async def api_update_requirement(
    requirement_id: int,
    request: RequirementCorrection,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Met à jour une exigence.
    """
    request.id = requirement_id
    async with conn.transaction():
        return await service_update_requirement(conn, request)


@router.delete("/{product_id}")
async def api_delete_product(
    product_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Supprime un produit et ses exigences (CASCADE SQL).
    """
    async with conn.transaction():
        return await service_delete_product(conn, product_id)


@router.delete("/requirements/{requirement_id}")
async def api_delete_requirement(
    requirement_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Supprime une exigence.
    """
    async with conn.transaction():
        return await service_delete_requirement(conn, requirement_id)