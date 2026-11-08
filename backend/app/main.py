from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine, Base
import app.models  # ensure all models are registered

# Routers
from app.api import (
    health,
    dashboard,
    cases,
    evidence,
    custody,
    analysis,
    timeline,
    notes,
    reports
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    # Ensure storage directories exist
    settings.storage_path
    (settings.storage_path / "reports").mkdir(parents=True, exist_ok=True)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Digital Forensics & Incident Response Platform — Case management, SHA-256 integrity, chain of custody, and forensic reporting.",
    lifespan=lifespan
)

# CORS setup
origins = settings.cors_origins if settings.cors_origins else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(cases.router)
app.include_router(evidence.router)
app.include_router(custody.router)
app.include_router(analysis.router)
app.include_router(timeline.router)
app.include_router(notes.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "tagline": "Digital Evidence. Investigation. Integrity.",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }
