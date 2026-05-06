from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.borrow_request import BorrowRequest
from app.schemas.borrow_request import BorrowRequestCreate, BorrowRequestOut, BorrowRequestUpdate
from typing import List

router = APIRouter()


@router.post("/create", response_model=BorrowRequestOut)
def create_borrow_request(data: BorrowRequestCreate, db: Session = Depends(get_db)):
    """Create a new borrow request"""
    borrow = BorrowRequest(**data.dict(), status="Active")
    db.add(borrow)
    db.commit()
    db.refresh(borrow)
    return borrow


@router.get("/all", response_model=List[BorrowRequestOut])
def get_all_borrow_requests(db: Session = Depends(get_db)):
    """Get all borrow requests"""
    borrows = db.query(BorrowRequest).all()
    return borrows


@router.get("/{borrow_id}", response_model=BorrowRequestOut)
def get_borrow_request(borrow_id: int, db: Session = Depends(get_db)):
    """Get borrow request by ID"""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    return borrow


@router.put("/{borrow_id}", response_model=BorrowRequestOut)
def update_borrow_request(borrow_id: int, data: BorrowRequestUpdate, db: Session = Depends(get_db)):
    """Update a borrow request"""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(borrow, field, value)
    
    db.commit()
    db.refresh(borrow)
    return borrow


@router.delete("/{borrow_id}")
def delete_borrow_request(borrow_id: int, db: Session = Depends(get_db)):
    """Delete a borrow request"""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    
    db.delete(borrow)
    db.commit()
    return {"message": "Borrow request deleted successfully"}


@router.get("/property/{property_number}", response_model=BorrowRequestOut)
def get_active_borrow_by_property(property_number: str, db: Session = Depends(get_db)):
    """Get active borrow request for a property"""
    borrow = db.query(BorrowRequest).filter(
        BorrowRequest.property_number == property_number,
        BorrowRequest.status == "Active"
    ).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="No active borrow request found")
    return borrow
