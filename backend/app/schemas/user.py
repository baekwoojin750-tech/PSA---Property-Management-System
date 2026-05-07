from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

PSA_DOMAIN = "psa.gov.ph"


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str

    @field_validator("email")
    @classmethod
    def email_must_be_psa(cls, value: EmailStr):
        if not str(value).endswith(f"@{PSA_DOMAIN}"):
            raise ValueError("Only @psa.gov.ph email addresses are allowed")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def email_must_be_psa(cls, value: EmailStr):
        if not str(value).endswith(f"@{PSA_DOMAIN}"):
            raise ValueError("Only @psa.gov.ph email addresses are allowed")
        return value


class UserRole(BaseModel):
    role: str
    authorization_expiry: Optional[datetime] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    reactivation_requested: bool = False
    created_at: Optional[datetime] = None
    authorization_expiry: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str


class ToggleUserStatusBody(BaseModel):
    user_id: int
    is_active: bool


class ReactivationRequestBody(BaseModel):
    email: EmailStr


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_must_be_psa(cls, value: Optional[EmailStr]):
        if value is not None and not str(value).endswith(f"@{PSA_DOMAIN}"):
            raise ValueError("Only @psa.gov.ph email addresses are allowed")
        return value
