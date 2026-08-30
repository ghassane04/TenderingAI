from fastapi import APIRouter, Depends, status
from core.dependencies import get_db, get_current_user, require_acheteur

from schemas.supplier_schema import (
    CreateSupplierRequest,
    UpdateSupplierRequest,
    SupplierResponse,
    SuppliersListResponse,
)
from services.supplier_service import (
    service_list_suppliers,
    service_get_supplier,
    service_create_supplier,
    service_update_supplier,
    service_delete_supplier,
)

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("", response_model=SuppliersListResponse)
async def api_list_suppliers(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Liste tous les fournisseurs."""
    return await service_list_suppliers(conn)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def api_get_supplier(
    supplier_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Récupère un fournisseur par son ID."""
    return await service_get_supplier(conn, supplier_id)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def api_create_supplier(
    request: CreateSupplierRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """Crée un nouveau fournisseur."""
    async with conn.transaction():
        return await service_create_supplier(conn, request)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def api_update_supplier(
    supplier_id: int,
    request: UpdateSupplierRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """Met à jour un fournisseur."""
    async with conn.transaction():
        return await service_update_supplier(conn, supplier_id, request)


@router.delete("/{supplier_id}")
async def api_delete_supplier(
    supplier_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """Supprime un fournisseur."""
    async with conn.transaction():
        return await service_delete_supplier(conn, supplier_id)