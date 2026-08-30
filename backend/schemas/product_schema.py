from pydantic import BaseModel, Field
from typing import List, Optional

class RequirementInfo(BaseModel):
    id: int
    requirement: str
    value: Optional[str] = None
    operateur: Optional[str] = None

class ProductInfo(BaseModel):
    id: int
    designation: str
    technical_lot_id: Optional[int] = None
    technical_lot_name: Optional[str] = None
    tender_document_id: int | None = None
    requirements: List[RequirementInfo] = []

class ProductCorrection(BaseModel):
    id: Optional[int] = None
    designation: str
    technical_lot_id: Optional[int] = None
    tender_document_id: int | None = None

class RequirementCorrection(BaseModel):
    id: Optional[int] = None
    requirement: str
    value: Optional[str] = None
    operateur: Optional[str] = None

