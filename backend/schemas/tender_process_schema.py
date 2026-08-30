from typing import List, Literal
from pydantic import BaseModel, Field


class Exigence(BaseModel):
    nom_exigence: str = Field(
        description="Le libellé ou l'énoncé textuel de l'exigence technique ou de la caractéristique."
    )
    operateur: Literal[
        "Minimum", "Maximum", "Egal", "Superieur", "Inferieur",
        "Superieur ou egal", "Inferieur ou egal", "Entre",
        "Compatible", "Supporte", "Contient", "Non specifie"
    ] = Field(
        default="Non specifie",
        description="L'opérateur logique ou de comparaison identifié pour cette exigence."
    )
    valeur: str = Field(
        default="",
        description="La valeur numérique ou textuelle associée à l'exigence (ex: '10 bar', 'Oui', 'Intel Core i7')."
    )


class Produit(BaseModel):
    nom_produit: str = Field(
        description="Nom ou description longue et explicite du produit technique identifié."
    )
    PREVIOUS_PRODUCT: Literal["Oui", "Non"] = Field(
        description="'Oui' UNIQUEMENT si ce produit est la suite directe du dernier produit du chunk "
                    "précédent (pas de nouveau nom introduit ici). 'Non' pour tout produit nouvellement identifié."
    )
    technical_lot_id: int | None = Field(
        default=None,
        description="ID du lot technique le plus pertinent parmi la liste fournie. "
                    "Utiliser null si aucun lot ne correspond clairement."
    )
    exigences: List[Exigence] = Field(
        default_factory=list,
        description="Liste complète de toutes les exigences techniques rattachées à ce produit."
    )
    source_excerpt: str | None = Field(
        default=None,
        description="Court extrait verbatim (une à deux lignes) du texte source où ce produit apparaît, "
                    "à titre de traçabilité. Ne pas reformuler."
    )


class TenderRequirementsContainer(BaseModel):
    """Conteneur principal pour la sortie structurée globale du modèle."""
    produits: List[Produit] = Field(
        default_factory=list,
        description="Liste de tous les produits techniques identifiés dans le chunk, avec leurs exigences."
    )