from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func
from app.core.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    property_number = Column(String, unique=True, index=True, nullable=False)
    item_name = Column(String, nullable=False)
    item_description = Column(String)
    asset_tag = Column(String, index=True)
    serial_number = Column(String, index=True)
    serial_code = Column(String, unique=True, index=True, nullable=False)
    equipment_category = Column(String, nullable=False)
    location = Column(String, nullable=False)
    unit = Column(String)
    unit_cost = Column(Float)          # was String — fixed to Float for sorting & math
    date_purchased = Column(String)
    status = Column(String, nullable=False, default="Serviceable")
    custodian = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())