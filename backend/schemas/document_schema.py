from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DocumentInfo(BaseModel):
    id: int
    designation: Optional[str] = None
    statut_name: Optional[str] = None
    statut_id: Optional[int] = None
    count_chunks: int = 0
    nb_chunks_done: int = 0
    uploaded_at: Optional[datetime] = None
    uploaded_by: Optional[str] = None
    
class DocumentDetailResponse(BaseModel):
    id: int
    tender_id: Optional[int] = None
    designation: Optional[str] = None
    file_size: Optional[str] = None
    path: Optional[str] = None
    filetype: Optional[str] = None
    statut_name: Optional[str] = None
    statut_id: Optional[int] = None
    count_chunks: int = 0
    nb_chunks_done: int = 0
    uploaded_at: Optional[datetime] = None
    uploaded_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None