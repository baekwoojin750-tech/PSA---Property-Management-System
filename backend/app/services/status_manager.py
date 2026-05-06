from datetime import date
from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.borrow_request import BorrowRequest


ASSET_SERVICEABLE = "Serviceable"
ASSET_NON_SERVICEABLE = "Non-Serviceable"
ASSET_BORROWED = "Borrowed"
VALID_ASSET_STATUSES = {ASSET_SERVICEABLE, ASSET_NON_SERVICEABLE, ASSET_BORROWED}

BORROW_ACTIVE = "Active"
BORROW_RETURNED = "Returned"
BORROW_OVERDUE = "Overdue"
VALID_BORROW_STATUSES = {BORROW_ACTIVE, BORROW_RETURNED, BORROW_OVERDUE}
OPEN_BORROW_STATUSES = {BORROW_ACTIVE, BORROW_OVERDUE}


def require_valid_asset_status(status: str) -> str:
    if status not in VALID_ASSET_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid asset status. Must be one of: {', '.join(sorted(VALID_ASSET_STATUSES))}",
        )
    return status


def require_valid_borrow_status(status: str) -> str:
    if status not in VALID_BORROW_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid borrow status. Must be one of: {', '.join(sorted(VALID_BORROW_STATUSES))}",
        )
    return status


def normalize_asset_status(status: Optional[str]) -> str:
    return require_valid_asset_status(status or ASSET_SERVICEABLE)


def set_asset_status(asset: Asset, status: str) -> None:
    asset.status = require_valid_asset_status(status)


def get_asset_for_borrow(db: Session, property_number: str) -> Asset:
    asset = db.query(Asset).filter(Asset.property_number == property_number).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {property_number} not found")
    if asset.status == ASSET_BORROWED:
        raise HTTPException(status_code=400, detail=f"Asset {property_number} is already borrowed")
    if asset.status != ASSET_SERVICEABLE:
        raise HTTPException(status_code=400, detail=f"Asset {property_number} is not serviceable")
    return asset


def mark_asset_borrowed(asset: Asset) -> None:
    set_asset_status(asset, ASSET_BORROWED)


def mark_asset_returned(db: Session, property_number: str) -> None:
    asset = db.query(Asset).filter(Asset.property_number == property_number).first()
    if asset:
        set_asset_status(asset, ASSET_SERVICEABLE)


def sync_overdue_statuses(borrows: Iterable[BorrowRequest]) -> bool:
    changed = False
    today = date.today()

    for borrow in borrows:
        if borrow.status != BORROW_ACTIVE or not borrow.end_date:
            continue

        try:
            end_date = date.fromisoformat(str(borrow.end_date)[:10])
        except ValueError:
            continue

        if end_date < today:
            borrow.status = BORROW_OVERDUE
            changed = True

    return changed
