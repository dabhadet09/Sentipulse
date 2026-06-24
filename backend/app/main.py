from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import analysis

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from ml.model_manager import get_model_manager
        get_model_manager().load_models()
    except Exception:
        pass
    yield


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

app.include_router(analysis.router, prefix="/api")


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

    manager = get_model_manager()
    return {
        "status": "healthy",
        "ml_models_loaded": manager.is_ready(),
    }
