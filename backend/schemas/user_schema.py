from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserPublicInfo(BaseModel):
    id: int
    last_name: str
    first_name: str
    email: str
    username: str
    roles: List[str]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
class UsersListResponse(BaseModel):
    total: int
    users: List[UserPublicInfo]

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    roles: Optional[List[str]] = None