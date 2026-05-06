from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetOut, AssetUpdate
from typing import List

router = APIRouter()


@router.post("/create", response_model=AssetOut)
def create_asset(data: AssetCreate, db: Session = Depends(get_db)):
    """Create a new asset"""
    existing = db.query(Asset).filter(Asset.serial_code == data.serial_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset with this serial code already exists")
    
    asset = Asset(**data.dict())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/all", response_model=List[AssetOut])
def get_all_assets(db: Session = Depends(get_db)):
    """Get all assets"""
    assets = db.query(Asset).all()
    return assets


# ⚠️ Specific paths MUST come before /{serial_code} — FastAPI matches top-down
# and /{serial_code} would greedily intercept /by-property/... otherwise.
@router.get("/by-property/{property_number}", response_model=AssetOut)
def get_asset_by_property_number(property_number: str, db: Session = Depends(get_db)):
    """Get asset by property number"""
    asset = db.query(Asset).filter(Asset.property_number == property_number).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/{serial_code}", response_model=AssetOut)
def get_asset(serial_code: str, db: Session = Depends(get_db)):
    """Get asset by serial code"""
    asset = db.query(Asset).filter(Asset.serial_code == serial_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset



@router.put("/by-property/{property_number}", response_model=AssetOut)
def update_asset_by_property_number(property_number: str, data: AssetUpdate, db: Session = Depends(get_db)):
    """Update an asset by property number (used when serial_code is unavailable)"""
    asset = db.query(Asset).filter(Asset.property_number == property_number).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)

    db.commit()
    db.refresh(asset)
    return asset

@router.put("/{serial_code}", response_model=AssetOut)
def update_asset(serial_code: str, data: AssetUpdate, db: Session = Depends(get_db)):
    """Update an asset"""
    asset = db.query(Asset).filter(Asset.serial_code == serial_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)
    
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{serial_code}")
def delete_asset(serial_code: str, db: Session = Depends(get_db)):
    """Delete an asset"""
    asset = db.query(Asset).filter(Asset.serial_code == serial_code).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(asset)
    db.commit()
    return {"detail": "Asset deleted successfully"}