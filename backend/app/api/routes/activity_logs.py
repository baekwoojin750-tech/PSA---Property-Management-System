from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogCreate, ActivityLogOut
from typing import List

router = APIRouter()


@router.post("/create", response_model=ActivityLogOut)
def create_activity_log(data: ActivityLogCreate, db: Session = Depends(get_db)):
    """Create a new activity log"""
    log = ActivityLog(**data.dict())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/all", response_model=List[ActivityLogOut])
def get_all_activity_logs(db: Session = Depends(get_db)):
    """Get all activity logs"""
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).all()
    return logs


@router.get("/{log_id}", response_model=ActivityLogOut)
def get_activity_log(log_id: int, db: Session = Depends(get_db)):
    """Get activity log by ID"""
    log = db.query(ActivityLog).filter(ActivityLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")
    return log


@router.get("/user/{user_id}", response_model=List[ActivityLogOut])
def get_user_activity_logs(user_id: int, db: Session = Depends(get_db)):
    """Get all activity logs for a specific user"""
    logs = db.query(ActivityLog).filter(ActivityLog.user_id == user_id).order_by(ActivityLog.created_at.desc()).all()
    return logs
