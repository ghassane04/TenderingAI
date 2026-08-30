from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.security import decode_token
from core.roles import parse_roles
from database.connection import get_pool
from database.user_dao import get_user_by_id
from database.blacklist_dao import is_token_blacklisted

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_db():
    """Dépendance pour obtenir une connexion du pool."""
    pool = await get_pool()
    async with pool.connection() as conn:
        yield conn


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    conn=Depends(get_db),
):
    """
    Récupère l'utilisateur courant à partir du token JWT.
    Vérifie également la blacklist.
    """
    payload = decode_token(token)

    jti = payload.get("jti")
    if jti:
        if await is_token_blacklisted(conn, jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expirée, veuillez vous reconnecter",
            )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    user = await get_user_by_id(conn, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable",
        )

    user["_jti"] = jti
    return user


async def require_admin(current_user=Depends(get_current_user)):
    """Vérifie que l'utilisateur a le rôle ADMIN."""
    if "ROLE_ADMIN" not in parse_roles(current_user.get("roles", "[]")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_user


async def require_acheteur(current_user=Depends(get_current_user)):
    """Vérifie que l'utilisateur a le rôle ADMIN ou ACHETEUR."""
    if not {"ROLE_ADMIN", "ROLE_ACHETEUR"} & set(parse_roles(current_user.get("roles", "[]"))):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux acheteurs",
        )
    return current_user