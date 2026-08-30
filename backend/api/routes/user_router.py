from fastapi import APIRouter, Depends, status

from core.dependencies import get_db, require_admin, get_current_user
from schemas.user_schema import (
    UsersListResponse,
    UserUpdateRequest,
    UserPublicInfo,
)
from services.user_service import (
    service_get_user,
    service_list_users,
    service_delete_user,
    service_update_user,
)

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserPublicInfo)
async def api_me(current_user=Depends(get_current_user)):
    """Récupère les informations de l'utilisateur courant."""
    import json

    roles = current_user.get("roles", "[]")
    if isinstance(roles, str):
        try:
            roles = json.loads(roles)
        except json.JSONDecodeError:
            roles = []

    return UserPublicInfo(
        id=current_user["id"],
        last_name=current_user["last_name"],
        first_name=current_user["first_name"],
        email=current_user["email"],
        username=current_user["username"],
        roles=roles,
    )


@router.get("/{user_id}", response_model=UserPublicInfo)
async def api_get_user(
    user_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Récupère un utilisateur par son ID."""
    return await service_get_user(conn, user_id)


@router.get("/", response_model=UsersListResponse)
async def api_list_users(
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """Liste tous les utilisateurs (admin uniquement)."""
    return await service_list_users(conn)


@router.put("/{user_id}", status_code=status.HTTP_200_OK)
async def api_update_user(
    user_id: int,
    request: UserUpdateRequest,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """Met à jour un utilisateur (admin uniquement)."""
    return await service_update_user(conn, user_id, request)


@router.delete("/{user_id}")
async def api_delete_user(
    user_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """Supprime un utilisateur (admin uniquement)."""
    return await service_delete_user(conn, user_id, current_user_id=current_user["id"])