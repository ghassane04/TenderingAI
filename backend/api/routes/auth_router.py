from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from core.dependencies import get_db, get_current_user, require_admin
from schemas.auth_schema import RegisterRequest, TokenResponse
from services.auth_service import register_user, login_user
from database.blacklist_dao import blacklist_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def api_register(
    request: RegisterRequest,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """Création d'un utilisateur — réservé aux administrateurs."""
    return await register_user(conn, request)


@router.post("/login", response_model=TokenResponse)
async def api_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn=Depends(get_db),
):
    """
    Compatible OAuth2 : accepte username + password en form-data.
    Retourne le JWT + infos utilisateur lisibles (nom complet, rôles).
    """
    return await login_user(conn, form_data.username, form_data.password)


@router.post("/logout")
async def api_logout(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Invalide le token JWT courant en l'ajoutant à la blacklist.
    Le token reste structurellement valide mais est rejeté à chaque requête.
    """
    jti = current_user.get("_jti")
    if jti:
        await blacklist_token(conn, jti)

    return {"success": True, "message": "Déconnexion réussie"}