from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CreateTslRequest(BaseModel):
    supplier_id: int
    technical_lot_id: int

class CreateTslResponse(BaseModel):
    id: int
    supplier_name: str
    lot_name: str
    status_name: Optional[str] = None

class TslSummary(BaseModel):
    tsl_id: int
    tender_id: Optional[int] = None
    supplier_id: Optional[int] = None
    supplier_name: str
    supplier_email: Optional[str] = None
    technical_lot_id: Optional[int] = None
    lot_name: str
    status_id: Optional[int] = None
    status_name: Optional[str] = None
    email_sent_at: Optional[datetime] = None
    email_received_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    pdf_exists: bool = False