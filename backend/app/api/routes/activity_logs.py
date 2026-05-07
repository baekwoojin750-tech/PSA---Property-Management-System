from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_super_admin, get_current_user
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity_log import ActivityLogCreate, ActivityLogOut
from typing import List

router = APIRouter()


@router.post("/create", response_model=ActivityLogOut)
def create_activity_log(data: ActivityLogCreate, db: Session = Depends(get_db)):
    """Create a new activity log (internal use — called by other routes)"""
    log = ActivityLog(**data.dict())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/all", response_model=List[ActivityLogOut])
def get_all_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),  # 🔒 super admin only
):
    """Get all activity logs in the system — super admin only"""
    return db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).all()


@router.get("/mine", response_model=List[ActivityLogOut])
def get_my_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 🔒 any authenticated user
):
    """Get activity logs for the currently authenticated user (admin or regular user)"""
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )


@router.get("/{log_id}", response_model=ActivityLogOut)
def get_activity_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 🔒 authenticated users only
):
    """Get a single activity log by ID — only accessible if it belongs to the current user (or super admin)"""
    log = db.query(ActivityLog).filter(ActivityLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")

    # Super admin can view any log; others can only view their own
    if current_user.role != "super admin" and log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return log