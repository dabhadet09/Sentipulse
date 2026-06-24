from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import connect_db, close_db
from app.services.user_service import ensure_admin_exists
from app.routes import auth, analysis, subscription, admin

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await ensure_admin_exists(settings.admin_email, settings.admin_password)
    try:
        from ml.model_manager import get_model_manager
        get_model_manager().load_models()
    except Exception:
        pass
    yield
    await close_db()


app = FastAPI(
    title=settings.app_name,
    description="Transformer-based Sentiment & Emotion Analysis Platform for Social Media",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(subscription.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "description": "ML-powered sentiment & emotion analysis for YouTube, Reddit, X, Instagram",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health():
    from ml.model_manager import get_model_manager
    from app.database import is_db_connected

    manager = get_model_manager()
    db_ok = is_db_connected()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "ml_models_loaded": manager.is_ready(),
    }
