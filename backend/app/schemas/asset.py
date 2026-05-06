from pydantic import BaseModel
from typing import Optional


class AssetCreate(BaseModel):
    property_number: str
    item_name: str
    item_description: Optional[str] = None
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    serial_code: str                        # required — used as unique identifier
    equipment_category: str
    location: str
    unit: Optional[str] = None
    unit_cost: Optional[str] = None
    date_purchased: Optional[str] = None
    status: Optional[str] = "Serviceable"
    custodian: Optional[str] = None


class AssetOut(BaseModel):
    id: int
    property_number: str
    item_name: str
    item_description: Optional[str] = None
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    serial_code: str
    equipment_category: str
    location: str
    unit: Optional[str] = None
    unit_cost: Optional[str] = None
    date_purchased: Optional[str] = None
    status: str
    custodian: Optional[str] = None

    class Config:
        from_attributes = True


class AssetUpdate(BaseModel):
    item_name: Optional[str] = None
    item_description: Optional[str] = None
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    serial_code: Optional[str] = None
    equipment_category: Optional[str] = None
    location: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[str] = None
    date_purchased: Optional[str] = None
    status: Optional[str] = None
    custodian: Optional[str] = None