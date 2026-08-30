from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class TenderMetadata(BaseModel):
    code: str = Field(
        default="", 
        description="Le code de l'appel d'offre (ex: N° 12/2026). Retourner une chaîne vide si non trouvé."
    )
    designation: str = Field(
        default="", 
        description="La désignation ou l'objet de l'appel d'offre. Retourner une chaîne vide si non trouvé."
    )
    client: str = Field(
        default="", 
        description="Le nom du client ou Maître d'ouvrage. Retourner une chaîne vide si non trouvé."
    )

class TenderManualCreate(BaseModel):
    tender_code: str
    designation: str
    nom_client: Optional[str] = None

class CreateTenderResponse(BaseModel):
    success: bool
    tender_id: int
    code: str
    designation: str
    nom_client: Optional[str] = None
    message: str