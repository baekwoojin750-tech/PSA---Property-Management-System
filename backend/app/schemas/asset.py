from pydantic import BaseModel, ConfigDict, field_validator
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
    unit_cost: Optional[float] = None
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
    serial_code: Optional[str] = None
    equipment_category: str
    location: str
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    date_purchased: Optional[str] = None
    status: str
    custodian: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("unit_cost", mode="before")
    @classmethod
    def parse_unit_cost(cls, value):
        if value in (None, ""):
            return None
        if isinstance(value, str):
            value = value.replace(",", "").strip()
            if not value:
                return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


class AssetUpdate(BaseModel):
    item_name: Optional[str] = None
    item_description: Optional[str] = None
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    serial_code: Optional[str] = None
    equipment_category: Optional[str] = None
    location: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    date_purchased: Optional[str] = None
    status: Optional[str] = None
    custodian: Optional[str] = None
