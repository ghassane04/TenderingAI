from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TenderMetadata(BaseModel):
    id: int
    code: str
    designation: str
    nom_client: Optional[str] = None
    status_name: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    uploaded_by: Optional[str] = None

class TenderListResponse(BaseModel):
    total: int
    tenders: List[TenderMetadata]

class TenderMetadataCorrection(BaseModel):
    code: str
    designation: str
    nom_client: Optional[str] = None
    updated_by: Optional[str] = "UI_React"