from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class CreateSupplierRequest(BaseModel):
    company_name: str
    email: EmailStr
    description: Optional[str] = None


class UpdateSupplierRequest(BaseModel):
    company_name: str
    email: EmailStr
    description: Optional[str] = None


class SupplierResponse(BaseModel):
    id: int
    company_name: str
    email: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SuppliersListResponse(BaseModel):
    total: int
    suppliers: list[SupplierResponse]