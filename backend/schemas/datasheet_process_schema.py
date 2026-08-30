from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class Caracteristique(BaseModel):
    nom: str = Field(description="Nom de la caractéristique technique, tel qu'écrit dans le texte source.")
    valeur: str = Field(description="Valeur associée, avec son unité si présente, exactement comme écrite.")


class Produit(BaseModel):
    nom_produit: str = Field(
        description="Nom descriptif du produit, incluant marque, modèle et version si disponibles."
    )
    PREVIOUS_PRODUCT: Literal["Oui", "Non"] = Field(
        description="'Oui' UNIQUEMENT si ce produit est la suite directe du dernier produit identifié "
                    "dans le chunk précédent (tableau de caractéristiques coupé en plein milieu, "
                    "pas de nouveau nom introduit). 'Non' pour tout produit nouvellement identifié, "
                    "même s'il ressemble à un produit déjà vu plus tôt."
    )
    caracteristiques: List[Caracteristique] = Field(
        default_factory=list,
        description="Toutes les caractéristiques techniques trouvées pour ce produit dans ce chunk."
    )

class ExtractionFicheFournisseur(BaseModel):
    produits: list[Produit] = Field(
        default_factory=list,
        description="Liste des produits identifiés dans ce segment de texte. Liste vide si aucun produit trouvé.",
    )

class ProcessStoredDatasheetResponse(BaseModel):
    success: bool
    datasheet_id: int
    message: Optional[str] = None