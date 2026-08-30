from pydantic import BaseModel, EmailStr
from typing import List

class RegisterRequest(BaseModel):
    last_name: str
    first_name: str
    email: EmailStr
    username: str
    password: str
    roles: List[str] = ["ROLE_ACHETEUR"]


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    roles: List[str]