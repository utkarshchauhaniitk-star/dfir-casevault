import hashlib
import os
import re
import uuid
from pathlib import Path
from typing import BinaryIO, Tuple
from fastapi import HTTPException, status
from app.core.config import settings

SAFE_FILENAME_REGEX = re.compile(r'[^a-zA-Z0-9_.-]')

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and remove problematic characters."""
    base_name = os.path.basename(filename).strip()
    if not base_name:
        base_name = "unnamed_artifact"
    # Replace unsafe characters with underscore
    clean_name = SAFE_FILENAME_REGEX.sub('_', base_name)
    # Truncate if excessively long
    if len(clean_name) > 120:
        parts = clean_name.rsplit('.', 1)
        if len(parts) == 2:
            clean_name = f"{parts[0][:110]}.{parts[1]}"
        else:
            clean_name = clean_name[:120]
    return clean_name

def generate_stored_filename(original_filename: str) -> str:
    """Generate a collision-resistant unique filename while preserving safe extension."""
    sanitized = sanitize_filename(original_filename)
    unique_prefix = uuid.uuid4().hex[:12]
    return f"{unique_prefix}_{sanitized}"

def calculate_sha256_bytes(data: bytes) -> str:
    """Calculate SHA-256 hash of byte buffer."""
    return hashlib.sha256(data).hexdigest()

def calculate_sha256_file(file_path: Path) -> str:
    """Stream-calculate SHA-256 of file on disk."""
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def resolve_safe_storage_path(stored_filename: str) -> Path:
    """Ensure resolved file path stays strictly within the configured storage directory."""
    storage_root = settings.storage_path
    target_path = (storage_root / stored_filename).resolve()
    if not target_path.is_relative_to(storage_root):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security violation: Detected illegal path traversal attempt."
        )
    return target_path
