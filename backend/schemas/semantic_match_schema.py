from pydantic import BaseModel
from typing import Optional, List

class ProductCandidate(BaseModel):
    product_id: int
    designation: str
    score: float


class SupplierProductInfo(BaseModel):
    supplier_product_id: int
    nom_produit: str
    candidats: List[ProductCandidate]


class SemanticMatchRequest(BaseModel):
    tender_id: int
    lot_id: int
    top_n: int = 5


class SemanticMatchResponse(BaseModel):
    success: bool
    datasheet_id: int
    produits: List[SupplierProductInfo]
    message: Optional[str] = None