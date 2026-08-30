from typing import List, Optional
from pydantic import BaseModel


class MatchedCharacteristic(BaseModel):
    characteristic_id: int
    technical_data: str
    value: Optional[str] = None

class ComparisonLineResult(BaseModel):
    requirement_id: Optional[int] = None
    exigence: str
    valeur_requise: Optional[str] = None
    operateur: Optional[str] = None
    caracteristiques_fournies: List[MatchedCharacteristic] = []
    score: int
    conformite: str
    conformite_description: str
    is_non_couverte: bool = False

class ExtraCharacteristic(BaseModel):
    characteristic_id: int
    technical_data: str
    value: Optional[str] = None

class SupplierProductComparisonResult(BaseModel):
    supplier_product_id: int
    supplier_product_designation: str
    tender_product_id: int
    tender_product_designation: str
    score: float
    nb_conformes: int
    nb_non_conformes: int
    nb_non_specifies: int
    nb_exigences_total: int
    lignes: List[ComparisonLineResult]
    caracteristiques_hors_exigences: List[ExtraCharacteristic] = []

class RequirementLineCorrection(BaseModel):
    requirement_id: Optional[int] = None
    characteristic_ids: List[int]
    evaluation: int

class ComparisonCorrectionRequest(BaseModel):
    corrections: List[RequirementLineCorrection]

class LotProductCoverage(BaseModel):
    tender_product_id: int
    tender_product_designation: str
    supplier_product_id: Optional[int] = None
    datasheet_id: Optional[int] = None
    score: float = 0.0
    addressed: bool = False

class SupplierLotAggregateResult(BaseModel):
    supplier_id: int
    supplier_name: str
    nb_tender_products: int
    nb_tender_products_addressed: int
    score_global: float
    products: List[LotProductCoverage]

class LotSupplierRankingResponse(BaseModel):
    lot_id: int
    lot_name: str
    suppliers: List[SupplierLotAggregateResult]