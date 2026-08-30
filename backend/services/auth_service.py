import json
from fastapi import HTTPException, status

from core.security import hash_password, verify_password, create_access_token
from database.user_dao import (
    get_user_by_username,
    get_user_by_email,
    insert_user,
)
from schemas.auth_schema import RegisterRequest, TokenResponse
from core.roles import parse_roles, VALID_ROLES

async def register_user(conn, request: RegisterRequest) -> dict:
    """
    Inscription d'un nouvel utilisateur.
    - Validation des rôles.
    - Vérification d'unicité username/email.
    - Hachage du mot de passe.
    """
    # 1. Validation des rôles
    invalid = set(request.roles) - VALID_ROLES
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rôles invalides : {invalid}. Rôles autorisés : {VALID_ROLES}",
        )

    # 2. Vérification d'unicité
    existing_username = await get_user_by_username(conn, request.username.strip())
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nom d'utilisateur déjà pris",
        )

    existing_email = await get_user_by_email(conn, request.email.lower().strip())
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email déjà enregistré",
        )

    # 3. Création de l'utilisateur
    user_id = await insert_user(
        conn,
        last_name=request.last_name.strip(),
        first_name=request.first_name.strip(),
        email=request.email.lower().strip(),
        username=request.username.strip(),
        hashed_password=hash_password(request.password),
        roles=json.dumps(request.roles),
    )

    return {
        "success": True,
        "user_id": user_id,
        "message": f"Compte créé pour {request.first_name} {request.last_name}",
    }


async def login_user(conn, username: str, password: str) -> TokenResponse:
    """
    Authentification d'un utilisateur.
    - Vérifie les identifiants.
    - Génère un token JWT.
    """
    user = await get_user_by_username(conn, username.strip())

    if not user or not verify_password(password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    roles = parse_roles(user.get("roles", "[]"))
    token = create_access_token(
        {"sub": str(user["id"]), "username": user["username"]}
    )

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        full_name=f"{user['first_name']} {user['last_name']}",
        roles=roles,
    )