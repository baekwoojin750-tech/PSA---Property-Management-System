from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.borrow_request import BorrowRequest
from app.models.asset import Asset
from app.schemas.borrow_request import BorrowRequestCreate, BorrowRequestOut, BorrowRequestUpdate
from typing import List

router = APIRouter()


@router.post("/create", response_model=BorrowRequestOut)
def create_borrow_request(data: BorrowRequestCreate, db: Session = Depends(get_db)):
    """Create a borrow request AND atomically set the asset status to Borrowed.
    Both operations are committed in one transaction — if either fails, neither is saved.
    """
    # Check for existing active borrow on this property
    existing = db.query(BorrowRequest).filter(
        BorrowRequest.property_number == data.property_number,
        BorrowRequest.status == "Active"
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Asset {data.property_number} already has an active borrow request (ID: {existing.id})"
        )

    # Create the borrow record
    borrow = BorrowRequest(**data.dict(), status="Active")
    db.add(borrow)

    # Update the asset status in the same transaction
    asset = db.query(Asset).filter(
        Asset.property_number == data.property_number
    ).first()
    if asset:
        asset.status = "Borrowed"
    # If asset not found we still allow the borrow — admin may have the record

    db.commit()
    db.refresh(borrow)
    return borrow


@router.get("/all", response_model=List[BorrowRequestOut])
def get_all_borrow_requests(db: Session = Depends(get_db)):
    """Get all borrow requests"""
    return db.query(BorrowRequest).all()


# ⚠️ /property/{property_number} MUST come before /{borrow_id}
# FastAPI matches top-down — the generic int param would swallow "property" otherwise.
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


@router.get("/{borrow_id}", response_model=BorrowRequestOut)
def get_borrow_request(borrow_id: int, db: Session = Depends(get_db)):
    """Get borrow request by ID"""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    return borrow


@router.put("/{borrow_id}", response_model=BorrowRequestOut)
def update_borrow_request(borrow_id: int, data: BorrowRequestUpdate, db: Session = Depends(get_db)):
    """Update a borrow request. When status → Returned, asset is set back to Serviceable atomically."""
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")

    update_data = data.dict(exclude_unset=True)

    # If status is being changed to Returned, flip the asset back to Serviceable
    # in the same transaction so they never get out of sync.
    if update_data.get("status") == "Returned":
        asset = db.query(Asset).filter(
            Asset.property_number == borrow.property_number
        ).first()
        if asset and asset.status == "Borrowed":
            asset.status = "Serviceable"

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