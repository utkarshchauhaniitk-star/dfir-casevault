import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "DFIR CaseVault"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./dfir_casevault.db"
    
    # Evidence Storage
    EVIDENCE_STORAGE_DIR: str = "./evidence_storage"
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25MB
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    # Demo Identity
    DEMO_ACTOR_NAME: str = "Lead Forensic Investigator (Demo)"
    DEMO_ACTOR_EMAIL: str = "investigator@casevault.local"
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def storage_path(self) -> Path:
        p = Path(self.EVIDENCE_STORAGE_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p.resolve()

settings = Settings()
