import asyncio
import getpass
import json
import re
import sys

from database.connection import init_pool, close_pool, get_pool
from database.user_dao import get_user_by_username, get_user_by_email, insert_user
from core.security import hash_password

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _prompt_non_empty(label: str) -> str:
    while True:
        value = input(f"{label} : ").strip()
        if value:
            return value
        print("  -> Ce champ est requis.")


def _prompt_email() -> str:
    while True:
        value = input("Email : ").strip().lower()
        if EMAIL_REGEX.match(value):
            return value
        print("  -> Adresse email invalide.")


def _prompt_username() -> str:
    while True:
        value = input("Nom d'utilisateur : ").strip()
        if len(value) >= 3:
            return value
        print("  -> Le nom d'utilisateur doit contenir au moins 3 caractères.")


def _prompt_password() -> str:
    while True:
        pwd = getpass.getpass("Mot de passe (min 8 caractères) : ")
        if len(pwd) < 8:
            print("  -> Le mot de passe doit contenir au moins 8 caractères.")
            continue
        confirm = getpass.getpass("Confirmer le mot de passe : ")
        if pwd != confirm:
            print("  -> Les mots de passe ne correspondent pas, recommencez.")
            continue
        return pwd


async def create_first_admin() -> None:
    print("=== Création du premier compte administrateur ===\n")

    last_name = _prompt_non_empty("Nom")
    first_name = _prompt_non_empty("Prénom")
    email = _prompt_email()
    username = _prompt_username()
    password = _prompt_password()

    await init_pool()
    try:
        pool = await get_pool()
        async with pool.connection() as conn:
            if await get_user_by_username(conn, username):
                print(f"\nErreur : le nom d'utilisateur '{username}' existe déjà.")
                sys.exit(1)

            if await get_user_by_email(conn, email):
                print(f"\nErreur : l'email '{email}' est déjà enregistré.")
                sys.exit(1)

            async with conn.transaction():
                user_id = await insert_user(
                    conn,
                    last_name=last_name,
                    first_name=first_name,
                    email=email,
                    username=username,
                    hashed_password=hash_password(password),
                    roles=json.dumps(["ROLE_ADMIN"]),
                )

        print(f"\nCompte administrateur créé avec succès (id={user_id}).")
        print(f"Nom d'utilisateur : {username}")
        print("Mot de passe : (celui que vous venez de saisir — non affiché ni stocké en clair)")

    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(create_first_admin())