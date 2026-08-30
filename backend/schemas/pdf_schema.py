from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GenerateLotsPDFRequest(BaseModel):
    tender_id: int

class GenerateLotPDFRequest(BaseModel):
    tender_id: int
    technical_lot_id: int

class GenerateLotsPDFResponse(BaseModel):
    success: bool
    message: str
    warnings: List[str] = []

class PdfInfo(BaseModel):
    id: Optional[int] = None
    lot_id: int
    lot_name: str
    filename: str
    file_path: Optional[str] = None
    file_size: Optional[str] = None
    generated_at: Optional[datetime] = None
    generated_by: Optional[str] = None
    exists: bool = False