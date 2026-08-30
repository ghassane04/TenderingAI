import os
from pathlib import Path

from dotenv import dotenv_values


_PROJECT_ROOT = Path(__file__).resolve().parents[1]
_ENV = dotenv_values(_PROJECT_ROOT / ".env")

# Le plugin pytest de LangSmith lit directement l'environnement. On charge les
# valeurs du .env sans jamais les afficher et on accepte les anciens noms.
for _name in (
    "LANGSMITH_API_KEY",
    "LANGSMITH_TRACING",
    "LANGSMITH_PROJECT",
    "LANGSMITH_WORKSPACE_ID",
    "LANGCHAIN_API_KEY",
    "LANGCHAIN_TRACING_V2",
    "LANGCHAIN_PROJECT",
):
    if _ENV.get(_name):
        os.environ.setdefault(_name, str(_ENV[_name]))

if not os.getenv("LANGSMITH_API_KEY") and os.getenv("LANGCHAIN_API_KEY"):
    os.environ["LANGSMITH_API_KEY"] = os.environ["LANGCHAIN_API_KEY"]
if not os.getenv("LANGSMITH_PROJECT"):
    os.environ["LANGSMITH_PROJECT"] = os.getenv(
        "LANGCHAIN_PROJECT", "tendering-ia"
    )

# Sans clé, les mêmes évaluations s'exécutent en mode local (dry-run). Avec une
# clé, il suffit de retirer/écraser cette variable pour publier l'expérience.
if not os.getenv("LANGSMITH_API_KEY"):
    os.environ.setdefault("LANGSMITH_TEST_TRACKING", "false")
os.environ.setdefault("LANGSMITH_TEST_SUITE", "Tendering-IA - évaluations LLM")

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-at-least-32-characters-long")
os.environ.setdefault("LLM_PROVIDER", "ollama")
os.environ.setdefault("PG_USER", "test")
os.environ.setdefault("PG_PASSWORD", "test")
os.environ.setdefault("PG_DATABASE", "tendering_test")


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "llm_eval: évaluations lentes qui exécutent le modèle Ollama local"
    )
