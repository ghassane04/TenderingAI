"""Évaluations LLM traçables dans LangSmith.

Exécution locale sans publication :
    LANGSMITH_TEST_TRACKING=false pytest -m llm_eval tests/evals -v

Publication dans LangSmith :
    définir LANGSMITH_API_KEY et LANGSMITH_TRACING=true, puis exécuter la même
    commande. Aucun secret n'est enregistré dans ce fichier.
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
import urllib.request
from pathlib import Path

import pytest
from langsmith import testing as t

from llm.client import (
    compare_requirements_with_characteristics,
    extract_supplier_products,
    extract_tender_info,
)


FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def _normalize(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", text.casefold()).strip()


def _contains(actual: object, expected: object) -> bool:
    return _normalize(expected) in _normalize(actual)


def _ollama_available() -> bool:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    try:
        with urllib.request.urlopen(f"{base_url}/api/tags", timeout=3) as response:
            return response.status == 200
    except Exception:
        return False


@pytest.fixture(autouse=True)
def require_ollama():
    if not _ollama_available():
        pytest.skip("Ollama n'est pas disponible sur OLLAMA_BASE_URL")


@pytest.fixture(scope="session")
def langsmith_experiment_metadata():
    return {
        "application": "Tendering-IA",
        "provider": os.getenv("LLM_PROVIDER", "ollama"),
        "model": os.getenv("OLLAMA_MODEL", "qwen3.5:4b"),
        "evaluation_type": "offline-pfe",
    }


@pytest.mark.llm_eval
@pytest.mark.langsmith(test_suite_name="Tendering-IA - extraction et comparaison")
@pytest.mark.asyncio(loop_scope="session")
async def test_metadata_extraction_accuracy():
    source = """
    APPEL D'OFFRES OUVERT INTERNATIONAL N° 28/2026
    Maître d'ouvrage : Ministère de la Justice, Direction provinciale d'Agadir.
    Objet : Acquisition, installation et mise en service de matériels
    informatiques pour le Palais de Justice de Taroudant.
    """
    expected = {
        "code": "28/2026",
        "client": "Ministère de la Justice",
        "designation": "Acquisition, installation et mise en service de matériels informatiques",
    }
    t.log_inputs({"document_text": source.strip()})
    t.log_reference_outputs(expected)

    result = await extract_tender_info(source)
    outputs = result.model_dump()
    t.log_outputs(outputs)

    matches = {
        key: _contains(outputs.get(key), value) for key, value in expected.items()
    }
    accuracy = sum(matches.values()) / len(matches)
    t.log_feedback(key="metadata_field_accuracy", score=accuracy)
    t.log_feedback(key="schema_valid", score=bool(result.code and result.designation))

    assert accuracy >= 2 / 3, {"matches": matches, "outputs": outputs}


@pytest.mark.llm_eval
@pytest.mark.langsmith(test_suite_name="Tendering-IA - extraction et comparaison")
@pytest.mark.asyncio(loop_scope="session")
async def test_supplier_datasheet_characteristic_coverage():
    source = (
        FIXTURES / "fournisseurs" / "offre_atlas_it_ao_28_2026.txt"
    ).read_text(encoding="utf-8")
    expected_terms = [
        "ATLAS-SFF-13",
        "16 Go",
        "SSD 1 To",
        "Windows 11 Professionnel",
        "3 ans",
    ]
    t.log_inputs({"chunk": source})
    t.log_reference_outputs({"expected_terms": expected_terms})

    result = await extract_supplier_products(source)
    outputs = result.model_dump()
    t.log_outputs(outputs)

    flattened = json.dumps(outputs, ensure_ascii=False)
    term_hits = {term: _contains(flattened, term) for term in expected_terms}
    coverage = sum(term_hits.values()) / len(term_hits)
    t.log_feedback(key="supplier_term_coverage", score=coverage)
    t.log_feedback(key="product_detected", score=bool(result.produits))

    assert result.produits, outputs
    assert coverage >= 0.8, {"term_hits": term_hits, "outputs": outputs}


@pytest.mark.llm_eval
@pytest.mark.langsmith(test_suite_name="Tendering-IA - extraction et comparaison")
@pytest.mark.asyncio(loop_scope="session")
async def test_technical_comparison_decision_accuracy():
    requirements = [
        {"id": 1, "requirement": "Mémoire vive", "operateur": "Minimum", "value": "16 Go"},
        {"id": 2, "requirement": "Stockage SSD", "operateur": "Minimum", "value": "1 To"},
        {"id": 3, "requirement": "Système d'exploitation", "operateur": "Egal", "value": "Windows 11 Pro"},
        {"id": 4, "requirement": "Wi-Fi 6", "operateur": "Supporte", "value": "Oui"},
    ]
    technicals = [
        {"id": 11, "technical_data": "Mémoire vive", "value": "32 Go DDR4"},
        {"id": 12, "technical_data": "Stockage", "value": "SSD 512 Go SATA"},
        {"id": 13, "technical_data": "Système", "value": "Windows 11 Famille"},
        {"id": 14, "technical_data": "Couleur", "value": "Noir"},
    ]
    expected = {1: 1, 2: 2, 3: 2, 4: 3}
    t.log_inputs({"requirements": requirements, "technicals": technicals})
    t.log_reference_outputs({"evaluations": expected})

    result = await compare_requirements_with_characteristics(requirements, technicals)
    outputs = result.model_dump()
    t.log_outputs(outputs)

    decisions = {item.requirement_id: item.evaluation for item in result.evaluations}
    valid_requirement_ids = {item["id"] for item in requirements}
    valid_characteristic_ids = {item["id"] for item in technicals}
    returned_characteristic_ids = {
        cid for item in result.evaluations for cid in item.matched_characteristic_ids
    } | set(result.caracteristiques_hors_exigences)
    decision_accuracy = sum(decisions.get(k) == v for k, v in expected.items()) / len(expected)
    id_validity = (
        set(decisions).issubset(valid_requirement_ids)
        and returned_characteristic_ids.issubset(valid_characteristic_ids)
    )
    coverage = len(set(decisions) & valid_requirement_ids) / len(valid_requirement_ids)
    t.log_feedback(key="comparison_decision_accuracy", score=decision_accuracy)
    t.log_feedback(key="requirement_coverage", score=coverage)
    t.log_feedback(key="id_validity", score=id_validity)

    assert id_validity, outputs
    assert coverage == 1.0, outputs
    assert decision_accuracy >= 0.75, {"expected": expected, "actual": decisions}
