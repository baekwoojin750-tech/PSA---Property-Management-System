from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import traceback
from sqlalchemy import inspect, text
from app.api.routes import auth, assets, borrows, activity_logs
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.models.user import User
from app.models.authorization_request import AuthorizationRequest
from app.models.asset import Asset
from app.models.borrow_request import BorrowRequest
from app.models.activity_log import ActivityLog
from sqlalchemy.orm import Session
from app.core.security import hash_password
import uvicorn
import os

Base.metadata.create_all(bind=engine)


def ensure_user_columns():
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []

    if "reactivation_requested" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN reactivation_requested BOOLEAN DEFAULT FALSE")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

def create_sample_accounts():
    db: Session = next(get_db())
    try:
        if not db.query(User).filter(User.email == "superadmin@psa.gov.ph").first():
            db.add(User(
                email="superadmin@psa.gov.ph",
                full_name="Super Admin",
                hashed_password=hash_password(os.environ.get("SUPERADMIN_PASSWORD", "superadmin123")),
                role="super admin"
            ))

        if not db.query(User).filter(User.email == "admin@psa.gov.ph").first():
            db.add(User(
                email="admin@psa.gov.ph",
                full_name="Admin User",
                hashed_password=hash_password(os.environ.get("ADMIN_PASSWORD", "admin123")),
                role="admin"
            ))

        if not db.query(User).filter(User.email == "user@psa.gov.ph").first():
            db.add(User(
                email="user@psa.gov.ph",
                full_name="Regular User",
                hashed_password=hash_password(os.environ.get("USER_PASSWORD", "user123")),
                role="user"
            ))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_user_columns()
    create_sample_accounts()
    yield

app = FastAPI(title="Property Management System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled error for {request.method} {request.url.path}: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(borrows.router, prefix="/api/borrows", tags=["Borrows"])
app.include_router(activity_logs.router, prefix="/api/activity-logs", tags=["Activity Logs"])

@app.get("/")
def root():
    return {"message": "PMS API is running"}

if __name__ == "__main__":
    # Bind to 0.0.0.0 so ALL devices on the network can reach this server,
    # not just requests coming from 192.168.0.171 itself.
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT)
