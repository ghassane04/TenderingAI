import logging
from fastapi import HTTPException

from database.supplier_product_dao import get_supplier_product_by_id, update_supplier_product
from schemas.confirm_schema import ConfirmProductRequest, ConfirmProductResponse

logger = logging.getLogger(__name__)


async def confirm(conn, request: ConfirmProductRequest) -> ConfirmProductResponse:

    sp = await get_supplier_product_by_id(conn, request.supplier_product_id)
    if not sp:
        raise HTTPException(status_code=404, detail="Produit fournisseur introuvable")

    async with conn.transaction():
        await update_supplier_product(
            conn=conn,
            supplier_product_id=request.supplier_product_id,
            product_id=request.chosen_product_id,
        )

    return ConfirmProductResponse(
        success=True,
        message="Produit confirmé. Lancez la comparaison technique séparément.",
    )