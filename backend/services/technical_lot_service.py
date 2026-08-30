from fastapi import HTTPException, status

from database.technical_lots_dao import (
    get_all_technical_lots,
    get_technical_lot_by_id,
    get_technical_lot_by_name,
    insert_technical_lot,
    update_technical_lot,
    delete_technical_lot,
)
from schemas.technical_lot_schema import (
    TechnicalLotResponse,
    TechnicalLotsListResponse,
)


async def service_list_lots(conn) -> TechnicalLotsListResponse:
    """Liste tous les lots techniques."""
    rows = await get_all_technical_lots(conn)
    return TechnicalLotsListResponse(
        total=len(rows),
        lots=[TechnicalLotResponse(**r) for r in rows],
    )


async def service_get_lot(conn, lot_id: int) -> TechnicalLotResponse:
    """Récupère un lot technique par son ID."""
    row = await get_technical_lot_by_id(conn, lot_id)
    if not row:
        raise HTTPException(status_code=404, detail="Lot technique introuvable")
    return TechnicalLotResponse(**row)


async def service_create_lot(
    conn,
    name: str,
    description: str,
) -> TechnicalLotResponse:
    """Crée un nouveau lot technique."""
    # Vérification d'unicité du nom
    existing = await get_technical_lot_by_name(conn, name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Le lot '{name}' existe déjà",
        )

    lot_id = await insert_technical_lot(conn, name, description.strip() if description else "")
    return await service_get_lot(conn, lot_id)


async def service_update_lot(
    conn,
    lot_id: int,
    name: str,
    description: str,
) -> TechnicalLotResponse:
    """Met à jour un lot technique."""
    # Vérification d'existence
    existing_lot = await get_technical_lot_by_id(conn, lot_id)
    if not existing_lot:
        raise HTTPException(status_code=404, detail="Lot technique introuvable")

    # Vérification d'unicité du nom (si changé)
    existing_by_name = await get_technical_lot_by_name(conn, name)
    if existing_by_name and existing_by_name["id"] != lot_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Le nom '{name}' est déjà utilisé",
        )

    await update_technical_lot(
        conn,
        lot_id,
        name=name.strip(),
        description=description.strip() if description else "",
    )

    return await service_get_lot(conn, lot_id)


async def service_delete_lot(conn, lot_id: int) -> dict:
    """Supprime un lot technique."""
    row = await get_technical_lot_by_id(conn, lot_id)
    if not row:
        raise HTTPException(status_code=404, detail="Lot technique introuvable")

    async with conn.cursor() as cur:
        # Produits tender liés
        await cur.execute(
            "SELECT COUNT(*) FROM tenders_products WHERE technical_lot_id = %s",
            (lot_id,),
        )
        result = await cur.fetchone()
        if result and result[0] > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Impossible de supprimer : des produits sont encore associés au lot '{row['name']}'",
            )

        # Fiches fournisseurs liées
        await cur.execute(
            "SELECT COUNT(*) FROM supplier_datasheets WHERE technical_lot_id = %s",
            (lot_id,),
        )
        result = await cur.fetchone()
        if result and result[0] > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Impossible de supprimer : des fiches fournisseurs sont encore associées au lot '{row['name']}'",
            )

    await delete_technical_lot(conn, lot_id)

    return {
        "success": True,
        "message": f"Lot '{row['name']}' supprimé",
    }