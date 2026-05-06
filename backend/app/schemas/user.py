from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

PSA_DOMAIN = "psa.gov.ph"

class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str

    @field_validator('email')
    @classmethod
    def email_must_be_psa(cls, v):
        if not str(v).endswith(f"@{PSA_DOMAIN}"):
            raise ValueError('Only @psa.gov.ph email addresses are allowed')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator('email')
    @classmethod
    def email_must_be_psa(cls, v):
        if not str(v).endswith(f"@{PSA_DOMAIN}"):
            raise ValueError('Only @psa.gov.ph email addresses are allowed')
        return v

class UserRole(BaseModel):
    role: str
    authorization_expiry: Optional[datetime] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    authorization_expiry: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str