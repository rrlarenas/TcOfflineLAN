import asyncio
from app.settings import settings
from app.outbox_processor import OutboxProcessor
from app.sync_service import start_health_monitoring, sync_from_central, sync_users_from_central, _load_runtime_config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SyncScheduler:
    """
    Scheduler for periodic synchronization tasks.
    Intervals are re-read from DB at the start of each sleep cycle so that
    admin changes take effect without restarting the service.
    """

    def __init__(self):
        self.is_running = False

    def _get_intervals(self) -> tuple:
        cfg = _load_runtime_config()
        if cfg:
            return cfg.downstream_sync_interval, cfg.upstream_sync_interval
        return settings.DOWNSTREAM_SYNC_INTERVAL, settings.UPSTREAM_SYNC_INTERVAL

    def _get_central_url(self) -> str:
        cfg = _load_runtime_config()
        return cfg.central_url if cfg else settings.CENTRAL_URL

    async def run_downstream_sync(self):
        """Download data from central (GET) without user filters. Filters are applied locally."""
        logger.info("Starting background downstream sync (no user filters)...")
        try:
            await sync_from_central("")
            logger.info("Downstream sync completed")
        except Exception as e:
            logger.error(f"Error in downstream sync: {e}")

        try:
            await sync_users_from_central()
        except Exception as e:
            logger.error(f"Error in user sync: {e}")

    async def run_upstream_sync(self):
        """Send local changes to central (POST HL7)"""
        logger.info("=" * 80)
        logger.info("UPSTREAM SYNC - Sending pending events to central server")
        logger.info("=" * 80)
        try:
            central_url = self._get_central_url()
            processor = OutboxProcessor(central_url)
            await processor.retry_failed_events()
            await processor.process_pending_events()
            logger.info("=" * 80)
            logger.info("UPSTREAM SYNC COMPLETED")
            logger.info("=" * 80)
        except Exception as e:
            logger.error(f"Error in upstream sync: {e}")

    async def downstream_loop(self):
        """Continuous loop for downstream sync"""
        while self.is_running:
            try:
                await self.run_downstream_sync()
            except Exception as e:
                logger.error(f"Error in downstream loop: {e}")
            downstream_interval, _ = self._get_intervals()
            await asyncio.sleep(downstream_interval)

    async def upstream_loop(self):
        """Continuous loop for upstream sync"""
        while self.is_running:
            try:
                await self.run_upstream_sync()
            except Exception as e:
                logger.error(f"Error in upstream loop: {e}")
            _, upstream_interval = self._get_intervals()
            await asyncio.sleep(upstream_interval)

    async def start(self):
        """Start both sync loops"""
        downstream_interval, upstream_interval = self._get_intervals()
        logger.info(f"Starting sync scheduler:")
        logger.info(f"  - Downstream (GET): {downstream_interval}s ({downstream_interval//60}min)")
        logger.info(f"  - Upstream (POST): {upstream_interval}s ({upstream_interval//60}min)")
        self.is_running = True
        await asyncio.gather(
            self.downstream_loop(),
            self.upstream_loop(),
            return_exceptions=True
        )

    def stop(self):
        """Stop the sync scheduler"""
        logger.info("Stopping sync scheduler")
        self.is_running = False


async def start_background_tasks():
    """Start all background tasks."""
    logger.info("Starting background tasks...")
    health_task = asyncio.create_task(start_health_monitoring())
    sync_scheduler = SyncScheduler()
    sync_task = asyncio.create_task(sync_scheduler.start())
    await asyncio.gather(health_task, sync_task, return_exceptions=True)
