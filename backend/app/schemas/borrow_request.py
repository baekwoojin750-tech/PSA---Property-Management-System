from pydantic import BaseModel
from typing import Optional


class BorrowRequestCreate(BaseModel):
    property_number: str
    item_name: str
    borrower_name: str
    borrower_designation: Optional[str] = None
    department: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    purpose: Optional[str] = None
    destination: Optional[str] = None


class BorrowRequestOut(BaseModel):
    id: int
    property_number: str
    item_name: str
    borrower_name: str
    borrower_designation: Optional[str]
    department: Optional[str]
    status: str
    start_date: str
    end_date: Optional[str]
    purpose: Optional[str]
    destination: Optional[str]

    class Config:
        from_attributes = True


class BorrowRequestUpdate(BaseModel):
    status: Optional[str] = None
    end_date: Optional[str] = None
    borrower_name: Optional[str] = None
    borrower_designation: Optional[str] = None
    department: Optional[str] = None
    purpose: Optional[str] = None
    destination: Optional[str] = None
