from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    get_current_super_admin, get_current_user
)
from app.models.user import User
from app.models.authorization_request import AuthorizationRequest
from app.schemas.user import UserRegister, UserLogin, UserOut, ForgotPassword, ResetPassword
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
import os

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# ── Schemas ───────────────────────────────────────────────────────────────────

class PageAuthorizationRequest(BaseModel):
    page: str                       # "Dashboard" | "Assets" | "Inventory"
    remarks: Optional[str] = None   # admin's reason


class GrantAuthorizationBody(BaseModel):
    admin_id: int
    days: int           # 1–7
    request_id: int     # the specific AuthorizationRequest being approved


class RejectAuthorizationBody(BaseModel):
    request_id: int


class RevokeAuthorizationBody(BaseModel):
    admin_id: int
    page: Optional[str] = None   # if omitted, revokes ALL pages for this admin


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "full_name": user.full_name,
        "id": user.id,
    }


@router.post("/forgot-password")
def forgot_password(data: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    reset_token = create_access_token({"sub": str(user.id), "type": "reset"})

    # Build the clickable reset URL that points to the frontend reset page
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"

    # Send email with the reset URL (not just the raw token)
    from app.services.mailer import send_reset_email
    email_sent = send_reset_email(data.email, reset_url)

    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    return {"message": "Reset link sent to your email"}


@router.post("/reset-password")
def reset_password(data: ResetPassword, db: Session = Depends(get_db)):
    from app.core.security import decode_access_token
    payload = decode_access_token(data.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password reset successful"}


@router.post("/oauth-user")
def oauth_user(email_data: dict, db: Session = Depends(get_db)):
    """Handle OAuth user login/registration. Auto-create user if doesn't exist."""
    email = email_data.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            email=email,
            full_name=email_data.get('full_name', email.split('@')[0]),
            hashed_password=hash_password(''),
            role='user'
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "authorization_expiry": user.authorization_expiry
    }


@router.post("/create-admin", response_model=UserOut)
def create_admin(data: UserRegister, db: Session = Depends(get_db), current_user: User = Depends(get_current_super_admin)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    admin = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.get("/all-users", response_model=List[UserOut])
def get_all_users(db: Session = Depends(get_db)):
    """Get all users in the system"""
    users = db.query(User).all()
    return users


# ── Per-page Authorization endpoints ─────────────────────────────────────────

VALID_PAGES = {"Dashboard", "Assets", "Inventory"}


def _get_active_grant(db: Session, admin_id: int, page: str) -> Optional[AuthorizationRequest]:
    """Return the approved, non-expired AuthorizationRequest for this admin+page, or None."""
    return db.query(AuthorizationRequest).filter(
        AuthorizationRequest.admin_id == admin_id,
        AuthorizationRequest.page == page,
        AuthorizationRequest.status == "approved",
        AuthorizationRequest.expires_at > datetime.utcnow()
    ).first()


@router.post("/request-authorization")
def request_authorization(
    body: PageAuthorizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin requests access to a specific locked page with optional remarks."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can request authorization")

    if body.page not in VALID_PAGES:
        raise HTTPException(status_code=400, detail=f"Invalid page. Must be one of: {', '.join(VALID_PAGES)}")

    if _get_active_grant(db, current_user.id, body.page):
        raise HTTPException(status_code=400, detail=f"Already authorized for {body.page}")

    existing = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.admin_id == current_user.id,
        AuthorizationRequest.page == body.page,
        AuthorizationRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Already has a pending request for {body.page}")

    req = AuthorizationRequest(
        admin_id=current_user.id,
        page=body.page,
        remarks=body.remarks,
        status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": f"Authorization request submitted for {body.page}", "request_id": req.id}


@router.get("/authorization-status")
def get_authorization_status(
    page: str = Query(..., description="The page to check authorization for"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")

    if page not in VALID_PAGES:
        raise HTTPException(status_code=400, detail=f"Invalid page. Must be one of: {', '.join(VALID_PAGES)}")

    grant = _get_active_grant(db, current_user.id, page)

    if grant:
        page_status = "authorized"
        expiry = grant.expires_at
    else:
        pending = db.query(AuthorizationRequest).filter(
            AuthorizationRequest.admin_id == current_user.id,
            AuthorizationRequest.page == page,
            AuthorizationRequest.status == "pending"
        ).first()
        page_status = "pending" if pending else "none"
        expiry = None

    return {
        "page": page,
        "status": page_status,
        "expiry": expiry.isoformat() if expiry else None,
    }


@router.get("/pending-authorizations")
def get_pending_authorizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    pending = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.status == "pending"
    ).all()

    return [
        {
            "request_id": r.id,
            "admin_id": r.admin_id,
            "full_name": r.admin.full_name,
            "email": r.admin.email,
            "page": r.page,
            "remarks": r.remarks,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in pending
    ]


@router.get("/all-admins")
def get_all_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    admins = db.query(User).filter(User.role == "admin").all()
    now = datetime.utcnow()

    result = []
    for u in admins:
        active_grants = db.query(AuthorizationRequest).filter(
            AuthorizationRequest.admin_id == u.id,
            AuthorizationRequest.status == "approved",
            AuthorizationRequest.expires_at > now
        ).all()

        pending_reqs = db.query(AuthorizationRequest).filter(
            AuthorizationRequest.admin_id == u.id,
            AuthorizationRequest.status == "pending"
        ).all()

        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "granted_pages": [
                {
                    "page": g.page,
                    "expires_at": g.expires_at.isoformat(),
                }
                for g in active_grants
            ],
            "pending_requests": [
                {
                    "request_id": r.id,
                    "page": r.page,
                    "remarks": r.remarks,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in pending_reqs
            ]
        })

    return result


@router.post("/grant-authorization")
def grant_authorization(
    body: GrantAuthorizationBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    if body.days < 1 or body.days > 7:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 7")

    admin = db.query(User).filter(User.id == body.admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    req = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.id == body.request_id,
        AuthorizationRequest.admin_id == body.admin_id,
        AuthorizationRequest.status == "pending"
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Pending request not found")

    now = datetime.utcnow()

    existing_grant = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.admin_id == body.admin_id,
        AuthorizationRequest.page == req.page,
        AuthorizationRequest.status == "approved",
        AuthorizationRequest.expires_at > now
    ).first()

    base = existing_grant.expires_at if existing_grant else now

    req.status = "approved"
    req.resolved_at = now
    req.expires_at = base + timedelta(days=body.days)

    db.commit()
    db.refresh(req)
    return {
        "message": f"Authorization granted for {body.days} day(s) on {req.page}",
        "admin_id": admin.id,
        "page": req.page,
        "expires_at": req.expires_at.isoformat(),
    }


@router.post("/revoke-authorization")
def revoke_authorization(
    body: RevokeAuthorizationBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    admin = db.query(User).filter(User.id == body.admin_id, User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    now = datetime.utcnow()

    query = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.admin_id == body.admin_id,
        AuthorizationRequest.status == "approved",
        AuthorizationRequest.expires_at > now
    )
    if body.page:
        if body.page not in VALID_PAGES:
            raise HTTPException(status_code=400, detail=f"Invalid page. Must be one of: {', '.join(VALID_PAGES)}")
        query = query.filter(AuthorizationRequest.page == body.page)

    revoked = query.all()
    if not revoked:
        raise HTTPException(status_code=404, detail="No active authorization found to revoke")

    for grant in revoked:
        grant.expires_at = now

    db.commit()

    pages_revoked = [g.page for g in revoked]
    return {
        "message": f"Authorization revoked for page(s): {', '.join(pages_revoked)}",
        "admin_id": body.admin_id,
        "revoked_pages": pages_revoked,
    }


@router.post("/reject-authorization")
def reject_authorization(
    body: RejectAuthorizationBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    req = db.query(AuthorizationRequest).filter(
        AuthorizationRequest.id == body.request_id,
        AuthorizationRequest.status == "pending"
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = "rejected"
    req.resolved_at = datetime.utcnow()
    db.commit()
    return {"message": "Authorization request rejected", "request_id": req.id}


@router.post("/authorize_page")
def authorize_page(
    page_request: PageAuthorizationRequest,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    user = get_current_user(token, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can authorize pages.")

    permissions = {page_request.page: True}
    new_token = create_access_token({"sub": user.id}, permissions)
    return {"access_token": new_token, "token_type": "bearer"}