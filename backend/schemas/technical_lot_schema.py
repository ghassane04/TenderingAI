from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CreateTechnicalLotRequest(BaseModel):
    name: str
    description: Optional[str] = None

class UpdateTechnicalLotRequest(BaseModel):
    name: str
    description: Optional[str] = None

class TechnicalLotResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TechnicalLotsListResponse(BaseModel):
    total: int
    lots: List[TechnicalLotResponse]