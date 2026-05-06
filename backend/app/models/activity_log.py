from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    user_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    action = Column(String, nullable=False)  # e.g., Logged in, Registered asset, Approved borrow request
    target = Column(String, nullable=False)  # e.g., Asset name, user email
    log_type = Column(String, nullable=False)  # login, asset, request, user, system
    created_at = Column(DateTime(timezone=True), server_default=func.now())
