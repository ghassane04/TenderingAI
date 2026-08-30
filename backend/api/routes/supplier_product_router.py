from fastapi import APIRouter, Depends, HTTPException, status

from core.dependencies import get_db, get_current_user, require_acheteur
from schemas.supplier_product_schema import (
    SupplierProductCorrection,
    TechnicalCharacteristicCorrection,
    SupplierProductAddRequest,
    CharacteristicAddRequest,
    SupplierProductDetail,
    SupplierProductsListResponse,
)
from services.supplier_product_service import (
    service_update_supplier_product,
    service_add_supplier_product,
    service_add_characteristic,
    service_delete_supplier_product,
    service_update_characteristic,
    service_delete_characteristic,
    service_get_datasheet_products,
    service_get_supplier_product_detail,
)

router = APIRouter(prefix="/api/supplier_product", tags=["Supplier Product"])


@router.get("/{datasheet_id}", response_model=SupplierProductsListResponse)
async def api_get_datasheet_products(
    datasheet_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère tous les produits d'une fiche fournisseur.
    """
    return await service_get_datasheet_products(conn, datasheet_id)


@router.get("/{supplier_product_id}/detail", response_model=SupplierProductDetail)
async def api_get_supplier_product_detail(
    supplier_product_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère les détails d'un produit fournisseur avec ses caractéristiques.
    """
    return await service_get_supplier_product_detail(conn, supplier_product_id)


@router.post("/{datasheet_id}", status_code=status.HTTP_201_CREATED)
async def api_add_supplier_product(
    datasheet_id: int,
    request: SupplierProductAddRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Ajoute un nouveau produit à une fiche fournisseur.
    """
    async with conn.transaction():
        return await service_add_supplier_product(conn, datasheet_id, request)


@router.post("/{supplier_product_id}/characteristic", status_code=status.HTTP_201_CREATED)
async def api_add_characteristic(
    supplier_product_id: int,
    request: CharacteristicAddRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Ajoute une caractéristique à un produit fournisseur.
    """
    async with conn.transaction():
        return await service_add_characteristic(conn, supplier_product_id, request)


@router.patch("/{supplier_product_id}")
async def api_update_supplier_product(
    supplier_product_id: int, request: SupplierProductCorrection,
    conn=Depends(get_db), current_user=Depends(require_acheteur),
):
    async with conn.transaction():
        return await service_update_supplier_product(conn, supplier_product_id, request)


@router.patch("/characteristics/{characteristic_id}")
async def api_update_characteristic(
    characteristic_id: int, request: TechnicalCharacteristicCorrection,
    conn=Depends(get_db), current_user=Depends(require_acheteur),
):
    async with conn.transaction():
        return await service_update_characteristic(conn, characteristic_id, request)

@router.delete("/{supplier_product_id}")
async def api_delete_supplier_product(
    supplier_product_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Supprime un produit fournisseur et ses caractéristiques (CASCADE SQL).
    """
    async with conn.transaction():
        return await service_delete_supplier_product(conn, supplier_product_id)


@router.delete("/characteristics/{characteristic_id}")
async def api_delete_characteristic(
    characteristic_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Supprime une caractéristique technique.
    """
    async with conn.transaction():
        return await service_delete_characteristic(conn, characteristic_id)