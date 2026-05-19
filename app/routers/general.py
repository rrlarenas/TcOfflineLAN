from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
import httpx
from app import models, schemas
from app.db import get_db
from app.auth_utils import get_current_active_user, get_current_admin_user, get_optional_current_user
from app.settings import settings
from app.dependencies import get_lang

router = APIRouter(tags=["general"])


@router.get("/health")
def health_check(request: Request):
    lang = get_lang(request)
    return {"status": "healthy", "service": "trakcare_offline_local", "language": lang}


@router.get("/health/central")
def check_central_health(
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_optional_current_user)
):
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.head(settings.CENTRAL_URL)
            if response.status_code < 500:
                return {"status": "online", "central_url": settings.CENTRAL_URL}
            return {"status": "offline", "central_url": settings.CENTRAL_URL}
    except Exception:
        return {"status": "offline", "central_url": settings.CENTRAL_URL}


@router.get("/sync/status", response_model=schemas.SyncStatus)
def get_sync_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    pending_events = db.query(models.OutboxEvent).filter(
        models.OutboxEvent.status == "pending"
    ).count()

    failed_events = db.query(models.OutboxEvent).filter(
        models.OutboxEvent.status == "failed"
    ).count()

    total_outbox_events = db.query(models.OutboxEvent).count()

    last_sync_record = db.query(models.SyncState).filter(
        models.SyncState.key == "last_sync"
    ).first()

    last_sync = last_sync_record.value if last_sync_record else None

    return {
        "pending_events": pending_events,
        "failed_events": failed_events,
        "total_outbox_events": total_outbox_events,
        "last_sync": last_sync
    }


@router.get("/settings", response_model=schemas.SystemSettings)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get system settings"""
    def get_bool_setting(key: str, default: bool) -> bool:
        record = db.query(models.SyncState).filter(models.SyncState.key == key).first()
        if record:
            return record.value.lower() == "true"
        return default

    return {
        "enable_read_only_mode": get_bool_setting("enable_read_only_mode", True),
        "enable_new_episode_button": get_bool_setting("enable_new_episode_button", False),
    }


@router.put("/settings", response_model=schemas.SystemSettings)
def update_system_settings(
    settings_update: schemas.SystemSettings,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Update system settings - Admin only"""
    def upsert_setting(key: str, value: bool):
        record = db.query(models.SyncState).filter(models.SyncState.key == key).first()
        str_value = "true" if value else "false"
        if record:
            record.value = str_value
        else:
            db.add(models.SyncState(key=key, value=str_value))

    upsert_setting("enable_read_only_mode", settings_update.enable_read_only_mode)
    upsert_setting("enable_new_episode_button", settings_update.enable_new_episode_button)

    db.commit()

    return {
        "enable_read_only_mode": settings_update.enable_read_only_mode,
        "enable_new_episode_button": settings_update.enable_new_episode_button,
    }
