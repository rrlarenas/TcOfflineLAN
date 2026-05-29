from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import httpx
from app.db import get_db
from app.auth_utils import get_current_active_user
from app import models
from app.sync_service import SyncStateManager, sync_from_central, _load_runtime_config
from app.outbox_processor import OutboxProcessor
from app.settings import settings
import asyncio

router = APIRouter(prefix="/sync", tags=["sync"])


def _get_processor() -> OutboxProcessor:
    cfg = _load_runtime_config()
    central_url = cfg.central_url if cfg else settings.CENTRAL_URL
    return OutboxProcessor(central_url)


def _check_central_online(db: Session) -> bool:
    from app.routers.admin import get_runtime_config
    cfg = get_runtime_config(db)
    central_url = cfg.central_url if cfg else settings.CENTRAL_URL
    api_endpoint = cfg.central_api_endpoint if cfg else settings.CENTRAL_API_ENDPOINT
    check_url = f"{central_url}{api_endpoint}"
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.head(check_url)
            return response.status_code < 400
    except Exception:
        return False


@router.post("/trigger")
async def trigger_sync_manually(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    processor = _get_processor()
    pending_count = db.query(models.OutboxEvent).filter(models.OutboxEvent.status == "pending").count()

    async def run_sync():
        await processor.process_pending_events()

    asyncio.create_task(run_sync())
    return {"message": "Sync triggered", "pending_events": pending_count}


@router.post("/retry-failed")
async def retry_failed_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    processor = _get_processor()
    failed_count = db.query(models.OutboxEvent).filter(models.OutboxEvent.status == "failed").count()

    async def run_retry():
        await processor.retry_failed_events()
        await processor.process_pending_events()

    asyncio.create_task(run_retry())
    return {"message": "Failed events reset for retry", "failed_events": failed_count}


@router.get("/connection-status")
def get_connection_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    is_online = _check_central_online(db)
    return {"is_online": is_online, "last_check": None}


@router.get("/stats")
def get_sync_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    stats = SyncStateManager.get_sync_stats(db)
    is_online = _check_central_online(db)
    return {**stats, "connection": {"is_online": is_online, "last_check": None}}


@router.post("/from-central")
async def sync_from_central_api(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Sync from central using the current session user's filtros.
    Session-safe: filters come from the JWT token's user, never from last_login query.
    """
    await sync_from_central("")

    episodes = db.query(models.Episode).order_by(models.Episode.fecha_atencion.desc()).all()

    return {
        "message": "Sync from central completed",
        "episodes": [
            {
                "id": ep.id,
                "num_episodio": ep.num_episodio,
                "mrn": ep.mrn,
                "run": ep.run,
                "paciente": ep.paciente,
                "fecha_nacimiento": ep.fecha_nacimiento.isoformat() if ep.fecha_nacimiento else None,
                "sexo": ep.sexo,
                "tipo": ep.tipo,
                "fecha_atencion": ep.fecha_atencion.isoformat() if ep.fecha_atencion else None,
                "hospital": ep.hospital,
                "habitacion": ep.habitacion,
                "cama": ep.cama,
                "ubicacion": ep.ubicacion,
                "estado": ep.estado,
                "synced_flag": ep.synced_flag
            }
            for ep in episodes
        ]
    }
