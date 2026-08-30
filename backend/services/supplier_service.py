from fastapi import HTTPException, status

from database.supplier_dao import (
    get_all_suppliers,
    get_supplier_by_id,
    get_supplier_by_email,
    insert_supplier,
    update_supplier,
    delete_supplier,
)
from schemas.supplier_schema import (
    CreateSupplierRequest,
    UpdateSupplierRequest,
    SupplierResponse,
    SuppliersListResponse,
)


async def service_list_suppliers(conn) -> SuppliersListResponse:
    """Liste tous les fournisseurs."""
    rows = await get_all_suppliers(conn)
    suppliers = [SupplierResponse(**row) for row in rows]
    return SuppliersListResponse(total=len(suppliers), suppliers=suppliers)


async def service_get_supplier(conn, supplier_id: int) -> SupplierResponse:
    """Récupère un fournisseur par son ID."""
    row = await get_supplier_by_id(conn, supplier_id)
    if not row:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    return SupplierResponse(**row)


async def service_create_supplier(
    conn,
    request: CreateSupplierRequest,
) -> SupplierResponse:
    """Crée un nouveau fournisseur."""
    # Vérification d'unicité de l'email
    existing = await get_supplier_by_email(conn, request.email.lower())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un fournisseur avec l'email {request.email} existe déjà",
        )

    supplier_id = await insert_supplier(
        conn,
        company_name=request.company_name.strip(),
        email=request.email.lower().strip(),
        description=request.description.strip() if request.description else "",
    )

    return await service_get_supplier(conn, supplier_id)


async def service_update_supplier(
    conn,
    supplier_id: int,
    request: UpdateSupplierRequest,
) -> SupplierResponse:
    """Met à jour un fournisseur."""
    existing = await get_supplier_by_id(conn, supplier_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")

    # Vérifier unicité email si changé
    if existing["email"] != request.email.lower():
        email_exists = await get_supplier_by_email(conn, request.email.lower())
        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"L'email {request.email} est déjà utilisé par un autre fournisseur",
            )

    await update_supplier(
        conn,
        supplier_id,
        company_name=request.company_name.strip(),
        email=request.email.lower().strip(),
        description=request.description.strip() if request.description else "",
    )

    return await service_get_supplier(conn, supplier_id)


async def service_delete_supplier(conn, supplier_id: int) -> dict:
    """Supprime un fournisseur."""
    existing = await get_supplier_by_id(conn, supplier_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")

    deleted = await delete_supplier(conn, supplier_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fournisseur introuvable",
        )

    return {
        "success": True,
        "message": f"Fournisseur '{existing['company_name']}' supprimé",
    }