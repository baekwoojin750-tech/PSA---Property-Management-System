from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.routes import auth, assets, borrows, activity_logs
from app.core.database import Base, engine, get_db
from app.models.user import User
from app.models.authorization_request import AuthorizationRequest
from app.models.asset import Asset
from app.models.borrow_request import BorrowRequest
from app.models.activity_log import ActivityLog
from sqlalchemy.orm import Session
from app.core.security import hash_password
import uvicorn

Base.metadata.create_all(bind=engine)

def create_sample_accounts():
    db: Session = next(get_db())
    try:
        if not db.query(User).filter(User.email == "superadmin@psa.gov.ph").first():
            db.add(User(
                email="superadmin@psa.gov.ph",
                full_name="Super Admin",
                hashed_password=hash_password("superadmin123"),
                role="super admin"
            ))

        if not db.query(User).filter(User.email == "admin@psa.gov.ph").first():
            db.add(User(
                email="admin@psa.gov.ph",
                full_name="Admin User",
                hashed_password=hash_password("admin123"),
                role="admin"
            ))

        if not db.query(User).filter(User.email == "user@psa.gov.ph").first():
            db.add(User(
                email="user@psa.gov.ph",
                full_name="Regular User",
                hashed_password=hash_password("user123"),
                role="user"
            ))

        db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_sample_accounts()
    yield

app = FastAPI(title="Property Management System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://psa-property-management-system.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000)