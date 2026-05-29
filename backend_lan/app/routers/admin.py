from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas
from app.db import get_db
from app.auth_utils import get_current_admin_user
from app.settings import settings

router = APIRouter(prefix="/admin", tags=["admin"])

_CONFIG_KEYS = [
    "central_url",
    "central_api_endpoint",
    "central_hl7_endpoint",
    "central_users_endpoint",
    "central_api_username",
    "central_api_password",
    "health_check_interval",
    "downstream_sync_interval",
    "upstream_sync_interval",
    "max_retries",
]

_INT_KEYS = {"health_check_interval", "downstream_sync_interval", "upstream_sync_interval", "max_retries"}


def _get_config_value(db: Session, key: str, default: str) -> str:
    row = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    return row.value if row and row.value is not None else default


def get_runtime_config(db: Session) -> schemas.SystemConfigResponse:
    """Read all configurable parameters from DB, falling back to .env defaults."""
    def _str(key: str, fallback: str) -> str:
        return _get_config_value(db, key, fallback)

    def _int(key: str, fallback: int) -> int:
        raw = _get_config_value(db, key, str(fallback))
        try:
            return int(raw)
        except (ValueError, TypeError):
            return fallback

    return schemas.SystemConfigResponse(
        central_url=_str("central_url", settings.CENTRAL_URL),
        central_api_endpoint=_str("central_api_endpoint", settings.CENTRAL_API_ENDPOINT),
        central_hl7_endpoint=_str("central_hl7_endpoint", settings.CENTRAL_HL7_ENDPOINT),
        central_users_endpoint=_str("central_users_endpoint", settings.CENTRAL_USERS_ENDPOINT),
        central_api_username=_str("central_api_username", settings.CENTRAL_API_USERNAME),
        central_api_password=_str("central_api_password", settings.CENTRAL_API_PASSWORD),
        health_check_interval=_int("health_check_interval", settings.HEALTH_CHECK_INTERVAL),
        downstream_sync_interval=_int("downstream_sync_interval", settings.DOWNSTREAM_SYNC_INTERVAL),
        upstream_sync_interval=_int("upstream_sync_interval", settings.UPSTREAM_SYNC_INTERVAL),
        max_retries=_int("max_retries", settings.MAX_RETRIES),
    )


@router.get("/config", response_model=schemas.SystemConfigResponse)
def get_system_config(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user),
):
    return get_runtime_config(db)


@router.put("/config", response_model=schemas.SystemConfigResponse)
def update_system_config(
    update: schemas.SystemConfigUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user),
):
    changes = update.model_dump(exclude_none=True)
    for key, val in changes.items():
        str_val = str(val)
        row = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
        if row:
            row.value = str_val
        else:
            db.add(models.SystemConfig(key=key, value=str_val))
    db.commit()
    return get_runtime_config(db)
