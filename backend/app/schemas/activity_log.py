from pydantic import BaseModel
from datetime import datetime


class ActivityLogCreate(BaseModel):
    user_id: int | None = None
    user_name: str | None = None
    email: str | None = None
    action: str
    target: str
    log_type: str  # login, asset, request, user, system


class ActivityLogOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    email: str
    action: str
    target: str
    log_type: str
    created_at: datetime

    class Config:
        from_attributes = True
