from pathlib import Path
from fastapi import HTTPException, status
import shutil

from database.tender_product_dao import (
    get_tender_products_by_id,
    update_tender_product,
    insert_product,
    delete_tender_product,
    get_tender_product_by_id,
)
from database.requirement_dao import (
    get_product_requirements_by_id,
    insert_requirement,
    update_requirement,
    delete_requirement,
    get_requirement_by_id,
)
from schemas.product_schema import (
    ProductInfo,
    RequirementInfo,
    ProductCorrection,
    RequirementCorrection,
)


async def service_get_tender_products(conn, tender_id: int) -> list[ProductInfo]:
    """
    Récupère tous les produits d'un tender avec leurs exigences.
    """
    db_products = await get_tender_products_by_id(conn, tender_id)
    result = []

    for p in db_products:
        db_reqs = await get_product_requirements_by_id(conn, p["id"])
        result.append(
            ProductInfo(
                id=p["id"],
                designation=p["designation"],
                technical_lot_id=p.get("technical_lot_id"),
                technical_lot_name=p.get("technical_lot_name"),
                tender_document_id=p.get("tender_document_id"),
                requirements=[
                    RequirementInfo(
                        id=r["id"],
                        requirement=r["requirement"],
                        value=r.get("value"),
                        operateur=r.get("operateur"),
                    )
                    for r in db_reqs
                ],
            )
        )
    return result


async def service_update_tender_product(
    conn,
    request: ProductCorrection,
) -> dict:
    """
    Met à jour un produit (designation, technical_lot_id).
    """
    existing = await get_tender_product_by_id(conn, request.id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit introuvable",
        )

    await update_tender_product(
        conn,
        designation=request.designation,
        technical_lot_id=request.technical_lot_id,
        product_id=request.id,
    )

    return {"success": True}


async def service_update_requirement(
    conn,
    request: RequirementCorrection,
) -> dict:
    """
    Met à jour une exigence.
    """
    existing = await get_requirement_by_id(conn, request.id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exigence introuvable",
        )

    await update_requirement(
        conn,
        requirement_id=request.id,
        requirement=request.requirement,
        operateur=request.operateur,
        value=request.value,
    )

    return {"success": True}


async def service_add_product(
    conn,
    tender_id: int,
    request: ProductCorrection,
) -> int:
    """
    Ajoute un nouveau produit à un tender.
    """
    try:
        new_id = await insert_product(
            conn,
            designation=request.designation,
            tender_id=tender_id,
            technical_lot_id=request.technical_lot_id,
            tender_document_id=request.tender_document_id,
        )
        return new_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur ajout produit : {str(e)}",
        )


async def service_add_requirement(
    conn,
    product_id: int,
    request: RequirementCorrection,
) -> int:
    """
    Ajoute une nouvelle exigence à un produit.
    """
    try:
        new_id = await insert_requirement(
            conn,
            requirement=request.requirement,
            operateur=request.operateur,
            value=request.value,
            product_id=product_id,
        )
        return new_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur ajout exigence : {str(e)}",
        )


async def service_delete_product(
    conn,
    product_id: int,
) -> dict:
    """
    Supprime un produit et ses exigences (CASCADE SQL).
    """
    existing = await get_tender_product_by_id(conn, product_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit introuvable",
        )

    deleted = await delete_tender_product(conn, product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit introuvable",
        )

    return {
        "success": True,
        "message": "Produit et ses exigences supprimés",
    }


async def service_delete_requirement(
    conn,
    requirement_id: int,
) -> dict:
    """
    Supprime une exigence.
    """
    existing = await get_requirement_by_id(conn, requirement_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exigence introuvable",
        )

    deleted = await delete_requirement(conn, requirement_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exigence introuvable",
        )

    return {"success": True}