from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    avatar_url = Column(Text, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    reactivation_requested = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(String, nullable=False, default="user")
    authorization_expiry = Column(DateTime, nullable=True)
