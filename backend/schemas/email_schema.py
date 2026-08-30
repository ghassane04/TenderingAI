from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum
from schemas.tsl_schema import TslSummary

class TenderEmailsResponse(BaseModel):
    tender_id: int
    total: int
    items: List[TslSummary] = []

class EmailPreview(BaseModel):
    subject: str
    body: str

class SendSingleEmailRequest(BaseModel):
    subject: str
    body: str

class SendEmailResponse(BaseModel):
    success: bool
    message: str

class TslEmailLogEntry(BaseModel):
    id: int
    direction: str
    subject: Optional[str] = None
    body_envoi: Optional[str] = None
    body_recu: Optional[str] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    sent_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    status_id: Optional[int] = None
    status_name: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None

class EmailCheckRange(str, Enum):
    TODAY = "today"
    LAST_2_DAYS = "last_2_days"
    LAST_7_DAYS = "last_7_days"
    ALL_UNSEEN = "all"

class CheckEmailsRequest(BaseModel):
    range: EmailCheckRange = EmailCheckRange.LAST_2_DAYS

class CheckEmailsResponse(BaseModel):
    success: bool
    message: str
    inserted_count: int = 0