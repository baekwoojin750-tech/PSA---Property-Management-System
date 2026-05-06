from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuthorizationRequest(Base):
    __tablename__ = "authorization_requests"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page = Column(String, nullable=False)          # e.g. "Dashboard", "Assets", "Inventory"
    remarks = Column(String, nullable=True)         # admin's reason for requesting
    status = Column(String, default="pending")      # "pending" | "approved" | "rejected"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)

    admin = relationship("User")