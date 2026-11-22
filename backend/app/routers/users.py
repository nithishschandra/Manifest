from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import ProfileUpdateIn, UserOut
from ..security import current_user, hash_password, verify_password

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserOut)
def get_profile(user: User = Depends(current_user)):
    return UserOut.model_validate(user)


@router.put("", response_model=UserOut)
def update_profile(data: ProfileUpdateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.name is not None:
        user.name = data.name.strip()
    if data.new_password:
        if not data.current_password or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password is incorrect")
        user.password_hash = hash_password(data.new_password)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
