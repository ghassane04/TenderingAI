from pydantic import BaseModel, Field
from typing import Optional, List

class CharacteristicInfo(BaseModel):
    id: int
    technical_data: str
    value: Optional[str] = None
    requirement_id: Optional[int] = None
    evaluation: Optional[int] = None
    conformite: Optional[str] = None
    conformite_description: Optional[str] = None

class SupplierProductDetail(BaseModel):
    id: int
    designation: str
    product_id: Optional[int] = None
    tender_product_designation: Optional[str] = None
    supplier_datasheet_id: Optional[int] = None
    datasheet_designation: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    tender_id: Optional[int] = None
    tender_designation: Optional[str] = None
    score: Optional[float] = None
    characteristics: List[CharacteristicInfo] = Field(default_factory=list)

class SupplierProductsListResponse(BaseModel):
    total: int
    products: List[SupplierProductDetail] = Field(default_factory=list)

class SupplierProductCorrection(BaseModel):
    designation: str
    product_id: Optional[int] = None

class TechnicalCharacteristicCorrection(BaseModel):
    technical_data: str
    value: Optional[str] = None
    requirement_id: Optional[int] = None

class SupplierProductAddRequest(BaseModel):
    designation: str

class CharacteristicAddRequest(BaseModel):
    technical_data: str
    value: Optional[str] = None
