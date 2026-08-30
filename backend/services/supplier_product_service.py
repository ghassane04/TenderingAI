from fastapi import HTTPException, status
from typing import List

from schemas.supplier_product_schema import (
    SupplierProductCorrection,
    TechnicalCharacteristicCorrection,
    SupplierProductAddRequest,
    CharacteristicAddRequest,
    SupplierProductDetail,
    SupplierProductsListResponse,
    CharacteristicInfo,
)
from database.supplier_product_dao import (
    get_supplier_product_by_id,
    update_supplier_product_full,
    delete_supplier_product,
    insert_supplier_product,
    get_supplier_products_by_datasheet,
)
from database.characteristics_dao import (
    get_characteristic_by_id,
    insert_technical_characteristics,
    insert_technical_characteristic,
    update_characteristic_data,
    delete_characteristic,
    get_technical_characteristics_by_supplier_product,
)


def _build_product_detail(sp: dict, chars: list[dict]) -> SupplierProductDetail:
    """Construit un objet SupplierProductDetail à partir des données brutes."""
    return SupplierProductDetail(
        id=sp["id"],
        designation=sp["designation"],
        product_id=sp.get("product_id"),
        tender_product_designation=sp.get("tender_product_designation"),
        supplier_datasheet_id=sp.get("supplier_datasheet_id"),
        datasheet_designation=sp.get("datasheet_designation"),
        supplier_id=sp.get("supplier_id"),
        supplier_name=sp.get("supplier_name"),
        tender_id=sp.get("tender_id"),
        tender_designation=sp.get("tender_designation"),
        score=sp.get("score"),
        characteristics=[
            CharacteristicInfo(
                id=c["id"],
                technical_data=c["technical_data"],
                value=c.get("value"),
                requirement_id=c.get("requirement_id"),
                evaluation=c.get("evaluation"),
                conformite=c.get("evaluation_label"),
                conformite_description=c.get("evaluation_description"),
            )
            for c in chars
        ],
    )


async def service_get_supplier_product_detail(
    conn,
    supplier_product_id: int,
) -> SupplierProductDetail:
    """
    Récupère les détails d'un produit fournisseur avec ses caractéristiques.
    """
    sp = await get_supplier_product_by_id(conn, supplier_product_id)
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit fournisseur introuvable",
        )

    chars = await get_technical_characteristics_by_supplier_product(
        conn, sp["id"]
    )
    return _build_product_detail(sp, chars)


async def service_get_datasheet_products(
    conn,
    datasheet_id: int,
) -> SupplierProductsListResponse:
    """
    Récupère tous les produits d'une fiche fournisseur.
    """
    sp_rows = await get_supplier_products_by_datasheet(conn, datasheet_id)
    products = []

    for sp in sp_rows:
        chars = await get_technical_characteristics_by_supplier_product(
            conn, sp["id"]
        )
        products.append(_build_product_detail(sp, chars))

    return SupplierProductsListResponse(total=len(products), products=products)


async def service_update_supplier_product(
    conn,
    supplier_product_id: int,
    request: SupplierProductCorrection,
) -> dict:
    """
    Met à jour un produit fournisseur.
    """
    sp = await get_supplier_product_by_id(conn, supplier_product_id)
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit fournisseur introuvable",
        )

    await update_supplier_product_full(
        conn,
        supplier_product_id=supplier_product_id,
        designation=request.designation,
        product_id=request.product_id,
    )

    return {"success": True}


async def service_update_characteristic(
    conn,
    characteristic_id: int,
    request: TechnicalCharacteristicCorrection,
) -> dict:
    """
    Met à jour une caractéristique technique.
    """
    existing = await get_characteristic_by_id(conn, characteristic_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caractéristique introuvable",
        )

    await update_characteristic_data(
        conn,
        characteristic_id=characteristic_id,
        technical_data=request.technical_data,
        value=request.value,
        requirement_id=request.requirement_id,
    )

    return {"success": True}


async def service_add_supplier_product(
    conn,
    datasheet_id: int,
    request: SupplierProductAddRequest,
) -> dict:
    """
    Ajoute un nouveau produit à une fiche fournisseur.
    """
    try:
        new_id = await insert_supplier_product(
            conn,
            designation=request.designation,
            supplier_datasheet_id=datasheet_id,
            product_id=None,
        )
        return {"success": True, "supplier_product_id": new_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur ajout produit : {str(e)}",
        )


async def service_add_characteristic(
    conn,
    supplier_product_id: int,
    request: CharacteristicAddRequest,
) -> dict:
    """
    Ajoute une caractéristique à un produit fournisseur.
    """
    try:
        new_id = await insert_technical_characteristic(
            conn,
            technical_data=request.technical_data,
            value=request.value,
            supplier_product_id=supplier_product_id,
        )
        return {"success": True, "characteristic_id": new_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur ajout caractéristique : {str(e)}",
        )


async def service_delete_supplier_product(
    conn,
    supplier_product_id: int,
) -> dict:
    """
    Supprime un produit fournisseur et ses caractéristiques (CASCADE SQL).
    """
    sp = await get_supplier_product_by_id(conn, supplier_product_id)
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit fournisseur introuvable",
        )

    deleted = await delete_supplier_product(conn, supplier_product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit fournisseur introuvable",
        )

    return {
        "success": True,
        "message": "Produit et ses caractéristiques supprimés",
    }


async def service_delete_characteristic(
    conn,
    characteristic_id: int,
) -> dict:
    """
    Supprime une caractéristique technique.
    """
    existing = await get_characteristic_by_id(conn, characteristic_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caractéristique introuvable",
        )

    deleted = await delete_characteristic(conn, characteristic_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caractéristique introuvable",
        )

    return {"success": True}