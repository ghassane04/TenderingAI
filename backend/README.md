# Tendering-IA

## 1. Installer avec Winget
```
winget install --id=astral-sh.uv -e
```

## 2. Télécharge Tesseract pour Windows (OCR)
Télécharge l'installeur depuis le repo UB Mannheim : https://github.com/UB-Mannheim/tesseract/wiki
Pendant l'installation, coche explicitement le pack de langue French dans les options de composants additionnels (souvent décoché par défaut, seul l'anglais est coché de base).
Ajoute le dossier d'installation (typiquement C:\Program Files\Tesseract-OCR) à la variable d'environnement PATH.
Vérifie : tesseract --version et tesseract --list-langs dans un terminal — fra doit apparaître dans la liste.

## 3. Télécharge Poppler pour Windows (pdf2image)
Poppler (requis par pdf2image pour convertir les pages PDF en images) :
Télécharge une release Windows précompilée : https://github.com/oschwartz10612/poppler-windows/releases
Décompresse, ajoute le sous-dossier Library\bin au PATH.
Vérifie : pdftoppm -v dans un terminal doit répondre.

## 4. Créer ton environnement et Installer les autres dépendances
```
uv sync --python 3.11
```
## 5. Activer l'environnement
```
.venv\Scripts\activate
```
ou
```
source .venv/Scripts/activate
```

## 6. Lance l'api

Arrête l'API (CTRL+C)

```
uv run python -m api.main
```

### Page d’accueil : http://127.0.0.1:8000
### Documentation interactive Swagger : http://127.0.0.1:8000/docs
### Documentation ReDoc : http://127.0.0.1:8000/redoc

## 7. Lancer les tests locaux

```powershell
.venv\Scripts\python.exe -m pip install -e ".[test]"
$env:JWT_SECRET_KEY="une-cle-de-test-de-32-caracteres-minimum"
.venv\Scripts\python.exe -m pytest -q
```

Pour obtenir la couverture :

```powershell
.venv\Scripts\python.exe -m pytest -q --cov=api --cov=core --cov=schemas --cov=services --cov=utils
```

Les deux CPS d'exemple et les fiches fournisseurs fictives se trouvent dans `data/samples/`. Les manifestes structurés utilisés par les tests se trouvent dans `tests/fixtures/`.
