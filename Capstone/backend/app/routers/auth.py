import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, UserRole
from app.schemas.common import ForgotPasswordIn, ForgotPasswordOut, LoginIn, LoginOut
from app.services.security import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    role = UserRole(payload.role)
    identifier = payload.identifier.strip().lower()

    user = db.scalar(select(User).where(User.email == identifier)) if identifier else None
    if user is None:
        # Fall back to the demo account registered for the selected role.
        user = db.scalar(select(User).where(User.role == role).order_by(User.id))
    if user is None:
        raise HTTPException(status_code=401, detail="No account found for this role")
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    password_ok = verify_password(payload.password, user.password_hash)
    if not password_ok and not settings.allow_demo_login:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token_seed = f"{user.id}:{secrets.token_urlsafe(24)}:{datetime.now(timezone.utc).isoformat()}"
    token = hashlib.sha256(token_seed.encode()).hexdigest()
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": payload.identifier if "@" in payload.identifier else user.email,
            "role": user.role.value,
            "initials": user.initials,
        },
    }


@router.post("/forgot-password", response_model=ForgotPasswordOut)
def forgot_password(payload: ForgotPasswordIn) -> dict:
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    # Paperless workflow: a reset link would be emailed here.
    return {"sent": True}
