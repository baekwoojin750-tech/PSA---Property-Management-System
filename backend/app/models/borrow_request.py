from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class BorrowRequest(Base):
    __tablename__ = "borrow_requests"

    id = Column(Integer, primary_key=True, index=True)
    property_number = Column(String, index=True, nullable=False)
    item_name = Column(String, nullable=False)
    borrower_name = Column(String, nullable=False)
    borrower_designation = Column(String)
    department = Column(String)
    status = Column(String, nullable=False, default="Active")  # Active, Returned, Overdue
    start_date = Column(String, nullable=False)
    end_date = Column(String)
    purpose = Column(String)
    destination = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
