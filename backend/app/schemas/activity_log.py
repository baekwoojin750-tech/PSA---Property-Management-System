from pydantic import BaseModel
from typing import Optional


class ActivityLogCreate(BaseModel):
    user_id: int
    user_name: str
    email: str
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
    created_at: str

    class Config:
        from_attributes = True
