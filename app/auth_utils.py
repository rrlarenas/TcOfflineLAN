from datetime import datetime, timedelta, timezone
from typing import Optional
import base64
import hashlib
import hmac
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db import get_db
from app import models, schemas
from app.settings import settings

ALGORITHM = "HS256"
# Stored format: "pbkdf2central:<base64_salt>:<base64_hash>"
# InterSystems TrakCare: PBKDF2-SHA1, 2500 iterations, dkLen=32
PBKDF2_PREFIX = "pbkdf2central:"
PBKDF2_ITERATIONS = 2500

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def _verify_pbkdf2_central(plain_password: str, stored: str) -> bool:
    """Verify against InterSystems TrakCare PBKDF2-SHA1 hash.
    stored format: pbkdf2central:<base64_salt>:<base64_hash>
    Re-derives locally with PBKDF2-SHA1 / 2500 iters / dkLen=32 and compares.
    """
    payload = stored[len(PBKDF2_PREFIX):]
    salt_b64, hash_b64 = payload.split(":", 1)
    salt = base64.b64decode(salt_b64) if salt_b64 else b""
    expected = base64.b64decode(hash_b64)
    derived = hashlib.pbkdf2_hmac(
        "sha1",
        plain_password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=32,
    )
    return hmac.compare_digest(derived, expected)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith(PBKDF2_PREFIX):
        return _verify_pbkdf2_central(plain_password, hashed_password)
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def make_central_password_hash(raw_password_b64: str, salt_b64: str) -> str:
    """Build the stored string from the central server fields.
    raw_password_b64: the base64-encoded PBKDF2 output from central (field 'password').
    salt_b64: the base64-encoded salt from central (field 'passwordSalt').
    Stored as-is — verification re-derives locally using the plain password.
    """
    return f"{PBKDF2_PREFIX}{salt_b64}:{raw_password_b64}"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> schemas.TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("uid")
        if username is None or user_id is None:
            raise credentials_exception
        return schemas.TokenData(username=username, user_id=user_id)
    except JWTError:
        raise credentials_exception


def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    if not user.active:
        return None
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    token_data = _decode_token(token)
    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user


def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    return current_user


def get_current_admin_user(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action"
        )
    return current_user
