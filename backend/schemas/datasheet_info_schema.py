from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DatasheetInfo(BaseModel):
    id: int
    designation: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[str] = None
    supplier_name: Optional[str] = None
    technical_lot_id: Optional[int] = None
    lot_name: Optional[str] = None
    status: Optional[str] = None
    status_id: Optional[int] = None
    uploaded_at: Optional[datetime] = None
    uploaded_by: Optional[str] = None
    products_count: int = 0

class ListDatasheet(BaseModel):
    total: int
    datasheets: List[DatasheetInfo] = []

class DatasheetDetail(BaseModel):
    datasheet_id: int
    designation: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    technical_lot_id: Optional[int] = None
    lot_name: Optional[str] = None
    status: Optional[str] = None
    status_id: Optional[int] = None
    filetype: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: Optional[datetime] = None