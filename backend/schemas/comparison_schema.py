from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class RequirementEvaluation(BaseModel):
    requirement_id: int = Field(description="ID de l'exigence évaluée, copié depuis l'input.")
    matched_characteristic_ids: List[int] = Field(
        default_factory=list,
        description="IDs de TOUTES les caractéristiques fournisseur pertinentes pour cette exigence, "
                    "même si elles décrivent chacune un aspect partiel (ex: modèle, fréquence, nombre de "
                    "cœurs pour un processeur). Vide si aucune caractéristique ne couvre cette exigence."
    )
    evaluation: Literal[1, 2, 3] = Field(
        description="1=CONFORME, 2=NON CONFORME, 3=NON SPECIFIE (aucune caractéristique correspondante)."
    )


class ComparaisonTechnique(BaseModel):
    evaluations: List[RequirementEvaluation] = Field(default_factory=list)
    caracteristiques_hors_exigences: List[int] = Field(
        default_factory=list,
        description="IDs des caractéristiques fournisseur qui ne correspondent à AUCUNE exigence du tender."
    )

class CompareTechnicalRequest(BaseModel):
    supplier_product_id: int