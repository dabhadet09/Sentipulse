import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None
_db_connected: bool = False


async def connect_db():
    global client, db, _db_connected
    client = AsyncIOMotorClient(
        settings.mongodb_url,
        serverSelectionTimeoutMS=10000,
    )
    db = client[settings.database_name]
    await client.admin.command("ping")
    _db_connected = True
    backend = "Atlas" if settings.mongodb_url.startswith("mongodb+srv://") else "Local"
    logger.info("MongoDB connected (%s) — database: %s", backend, settings.database_name)


async def close_db():
    global client, _db_connected
    if client:
        client.close()
        _db_connected = False


def get_db() -> AsyncIOMotorDatabase:
    if db is None:
        raise RuntimeError("Database not initialized")
    return db


def is_db_connected() -> bool:
    return _db_connected
