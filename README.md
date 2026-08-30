# TenderingAI

Application d'analyse et de comparaison des appels d'offres avec traitement documentaire, rapprochement sémantique et comparaison technique assistée par LLM.

## Organisation

- `backend/` : API FastAPI, services métier, PostgreSQL, OCR, embeddings E5 et client Ollama/Qwen.
- `frontend/` : interface React + TypeScript + Vite.

## Démarrage local

Consulter les README de `backend/` et `frontend/`. Copier chaque `.env.example` vers `.env` et renseigner les valeurs locales ; les fichiers `.env` ne doivent jamais être commités.
