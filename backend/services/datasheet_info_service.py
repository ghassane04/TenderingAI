from fastapi import HTTPException

from database.datasheets_dao import get_datasheet_by_id, get_datasheets_by_tender
from schemas.datasheet_info_schema import DatasheetInfo, ListDatasheet, DatasheetDetail


async def service_get_datasheets_by_tender(conn, tender_id: int) -> ListDatasheet:
    rows = await get_datasheets_by_tender(conn, tender_id)
    datasheets = [
        DatasheetInfo(
            id=r["id"],
            designation=r.get("designation"),
            file_path=r.get("file_path"),
            file_size=r.get("file_size"),
            supplier_name=r.get("supplier_name"),
            technical_lot_id=r.get("technical_lot_id"),
            lot_name=r.get("lot_name"),
            status=r.get("status"),
            status_id=r.get("supplier_datasheet_status_id"),
            uploaded_at=r.get("uploaded_at"),
            uploaded_by=r.get("uploaded_by"),
            products_count=r.get("products_count") or 0,
        )
        for r in rows
    ]
    return ListDatasheet(total=len(datasheets), datasheets=datasheets)


async def service_get_datasheet_detail(conn, datasheet_id: int) -> DatasheetDetail:
    ds = await get_datasheet_by_id(conn, datasheet_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Fiche technique introuvable")
    return DatasheetDetail(
        datasheet_id=ds["id"],
        designation=ds.get("designation"),
        file_path=ds.get("file_path"),
        file_size=ds.get("file_size"),
        supplier_id=ds.get("supplier_id"),
        supplier_name=ds.get("company_name"),
        technical_lot_id=ds.get("technical_lot_id"),
        lot_name=ds.get("lot_name"),
        status=ds.get("status_name"),
        status_id=ds.get("supplier_datasheet_status_id"),
        filetype=ds.get("filetype"),
        uploaded_by=ds.get("uploaded_by"),
        uploaded_at=ds.get("uploaded_at"),
    )