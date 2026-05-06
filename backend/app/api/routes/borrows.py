from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.borrow_request import BorrowRequest
from app.schemas.borrow_request import BorrowRequestCreate, BorrowRequestOut, BorrowRequestUpdate
from app.services.status_manager import (
    BORROW_ACTIVE,
    BORROW_RETURNED,
    OPEN_BORROW_STATUSES,
    get_asset_for_borrow,
    mark_asset_borrowed,
    mark_asset_returned,
    require_valid_borrow_status,
    sync_overdue_statuses,
)

router = APIRouter()


@router.post("/create", response_model=BorrowRequestOut)
def create_borrow_request(data: BorrowRequestCreate, db: Session = Depends(get_db)):
    """Create a borrow request and set the asset status in one transaction."""
    existing = db.query(BorrowRequest).filter(
        BorrowRequest.property_number == data.property_number,
        BorrowRequest.status.in_(OPEN_BORROW_STATUSES),
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Asset {data.property_number} already has an open borrow request (ID: {existing.id})",
        )

    asset = get_asset_for_borrow(db, data.property_number)
    borrow = BorrowRequest(**data.model_dump(), status=BORROW_ACTIVE)
    db.add(borrow)
    mark_asset_borrowed(asset)

    db.commit()
    db.refresh(borrow)
    return borrow


@router.get("/all", response_model=List[BorrowRequestOut])
def get_all_borrow_requests(db: Session = Depends(get_db)):
    """Get all borrow requests."""
    borrows = db.query(BorrowRequest).all()
    if sync_overdue_statuses(borrows):
        db.commit()
    return borrows


@router.get("/property/{property_number}", response_model=BorrowRequestOut)
def get_open_borrow_by_property(property_number: str, db: Session = Depends(get_db)):
    """Get the open borrow request for a property."""
    borrows = db.query(BorrowRequest).filter(
        BorrowRequest.property_number == property_number,
        BorrowRequest.status.in_(OPEN_BORROW_STATUSES),
    ).all()
    if sync_overdue_statuses(borrows):
        db.commit()

    borrow = next((item for item in borrows if item.status in OPEN_BORROW_STATUSES), None)
    if not borrow:
        raise HTTPException(status_code=404, detail="No open borrow request found")
    return borrow


@router.get("/{borrow_id}", response_model=BorrowRequestOut)
def get_borrow_request(borrow_id: int, db: Session = Depends(get_db)):
    """Get borrow request by ID."""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    if sync_overdue_statuses([borrow]):
        db.commit()
    return borrow


@router.put("/{borrow_id}", response_model=BorrowRequestOut)
def update_borrow_request(borrow_id: int, data: BorrowRequestUpdate, db: Session = Depends(get_db)):
    """Update a borrow request and keep the asset status in sync."""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")

    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data:
        new_status = require_valid_borrow_status(update_data["status"])
        if new_status == BORROW_RETURNED:
            mark_asset_returned(db, borrow.property_number)

    for field, value in update_data.items():
        setattr(borrow, field, value)

    db.commit()
    db.refresh(borrow)
    return borrow


@router.delete("/{borrow_id}")
def delete_borrow_request(borrow_id: int, db: Session = Depends(get_db)):
    """Delete a borrow request."""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")

    db.delete(borrow)
    db.commit()
    return {"message": "Borrow request deleted successfully"}
