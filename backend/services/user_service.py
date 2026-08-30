import json
from fastapi import HTTPException, status

from core.security import hash_password, verify_password, create_access_token
from database.user_dao import (
    get_user_by_id,
    get_user_by_username,
    list_users,
    update_user,
    delete_user,
    count_admins,
)
from schemas.user_schema import UserPublicInfo, UsersListResponse, UserUpdateRequest
from core.roles import parse_roles, VALID_ROLES

async def service_get_user(conn, user_id: int) -> UserPublicInfo:
    """Récupère un utilisateur par son ID."""
    user = await get_user_by_id(conn, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    return UserPublicInfo(
        id=user["id"],
        last_name=user["last_name"],
        first_name=user["first_name"],
        email=user["email"],
        username=user["username"],
        roles=parse_roles(user.get("roles", "[]")),
        created_at=user.get("created_at"),
        updated_at=user.get("updated_at"),
    )


async def service_list_users(conn) -> UsersListResponse:
    """Liste tous les utilisateurs."""
    rows = await list_users(conn)
    users = []
    for r in rows:
        users.append(
            UserPublicInfo(
                id=r["id"],
                last_name=r["last_name"],
                first_name=r["first_name"],
                email=r["email"],
                username=r["username"],
                roles=parse_roles(r.get("roles", "[]")),
                created_at=r.get("created_at"),
                updated_at=r.get("updated_at"),
            )
        )
    return UsersListResponse(total=len(users), users=users)


async def service_delete_user(
    conn, user_id: int, current_user_id: int
) -> dict:
    """
    Supprime un utilisateur.
    - Vérifie que l'utilisateur existe.
    - Empêche la suppression du dernier admin.
    - Empêche un utilisateur de se supprimer lui-même.
    """
    user = await get_user_by_id(conn, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    roles = parse_roles(user.get("roles", "[]"))

    # Bloquer la suppression du dernier admin
    if "ROLE_ADMIN" in roles:
        remaining_admins = await count_admins(conn)
        if remaining_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Impossible de supprimer le dernier administrateur du système",
            )

    # Un user ne peut pas se supprimer lui-même (sécurité UX)
    if user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas supprimer votre propre compte",
        )

    deleted = await delete_user(conn, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable",
        )

    return {
        "success": True,
        "message": f"Compte de {user['first_name']} {user['last_name']} supprimé",
    }


async def service_update_user(
    conn, user_id: int, request: UserUpdateRequest
) -> dict:
    """
    Met à jour un utilisateur (PATCH sémantique).
    - Vérifie que l'utilisateur existe.
    - Vérifie les rôles.
    - Protège contre la destitution du dernier admin.
    """
    user = await get_user_by_id(conn, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    update_data = {}

    # 1. Champs simples
    if request.first_name is not None:
        update_data["first_name"] = request.first_name.strip()
    if request.last_name is not None:
        update_data["last_name"] = request.last_name.strip()
    if request.email is not None:
        update_data["email"] = request.email.lower().strip()

    # 2. Sécurisation et hachage du mot de passe
    if request.password and request.password.strip():
        update_data["hashed_password"] = hash_password(request.password)

    # 3. Mise à jour des rôles (avec validation)
    if request.roles is not None:
        invalid = set(request.roles) - VALID_ROLES
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Rôles invalides : {invalid}. Autorités autorisées : {VALID_ROLES}",
            )

        current_roles = parse_roles(user.get("roles", "[]"))

        # Protection : Empêcher la destitution du dernier Admin restant
        if "ROLE_ADMIN" in current_roles and "ROLE_ADMIN" not in request.roles:
            remaining_admins = await count_admins(conn)
            if remaining_admins <= 1:
                raise HTTPException(
                    status_code=403,
                    detail="Action interdite : Impossible de révoquer le rôle du dernier administrateur.",
                )

        update_data["roles"] = json.dumps(request.roles)

    # 4. Exécution de la mise à jour
    if update_data:
        await update_user(
            conn,
            user_id,
            last_name=update_data.get("last_name"),
            first_name=update_data.get("first_name"),
            email=update_data.get("email"),
            hashed_password=update_data.get("hashed_password"),
            roles=update_data.get("roles"),
        )

    return {"success": True, "message": "Utilisateur mis à jour avec succès"}