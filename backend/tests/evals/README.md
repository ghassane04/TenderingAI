# Évaluations LangSmith de Tendering-IA

Cette suite évalue les trois fonctions LLM critiques du projet :

1. extraction des métadonnées d'un appel d'offres ;
2. extraction des produits et caractéristiques d'une fiche fournisseur ;
3. comparaison entre exigences et caractéristiques.

## Exécution locale sans publication

```powershell
cd Tendering-IA
$env:LANGSMITH_TEST_TRACKING="false"
.\.venv\Scripts\python.exe -m pytest -m llm_eval tests\evals -v
```

## Publication dans LangSmith

Définir dans `.env` les variables suivantes sans committer la clé :

```dotenv
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=tendering-ia
```

Puis exécuter :

```powershell
cd Tendering-IA
Remove-Item Env:LANGSMITH_TEST_TRACKING -ErrorAction SilentlyContinue
$env:LANGSMITH_TEST_SUITE="Tendering-IA - évaluations LLM"
$env:LANGSMITH_EXPERIMENT="qwen3.5-4b-baseline"
.\.venv\Scripts\python.exe -m pytest -m llm_eval tests\evals -v --langsmith-output
```

Les métriques publiées sont : précision des métadonnées, couverture des
caractéristiques fournisseur, précision des décisions de conformité,
couverture des exigences et validité des identifiants.
