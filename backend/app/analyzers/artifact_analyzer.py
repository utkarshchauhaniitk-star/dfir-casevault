import os
import json
import csv
import io
import zipfile
from pathlib import Path
from typing import Dict, Any, Tuple, List
from PIL import Image
import pypdf

from app.analyzers.ioc_extractor import extract_iocs_from_text
from app.core.security import calculate_sha256_file

def analyze_artifact(file_path: Path, original_filename: str) -> Tuple[str, Dict[str, Any], List[Dict[str, str]]]:
    """
    Safely analyzes an artifact without executing it.
    Returns:
        (summary_text, metadata_dict, list_of_iocs)
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Artifact not found on disk: {file_path}")

    ext = Path(original_filename).suffix.lower().lstrip('.')
    file_size = file_path.stat().st_size
    sha256 = calculate_sha256_file(file_path)

    metadata: Dict[str, Any] = {
        "original_filename": original_filename,
        "extension": ext or "unknown",
        "file_size_bytes": file_size,
        "sha256": sha256
    }
    extracted_text_for_iocs = ""
    summary_parts = []

    try:
        if ext in ("csv",):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                rows = list(reader)
                row_count = len(rows)
                metadata["columns"] = header if header else []
                metadata["total_rows"] = row_count
                summary_parts.append(f"CSV file containing {len(header) if header else 0} columns and {row_count} data rows.")
                # Read sample content for IOCs
                f.seek(0)
                extracted_text_for_iocs = f.read(500000)

        elif ext in ("json",):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(1000000)
                extracted_text_for_iocs = content
                try:
                    data = json.loads(content)
                    if isinstance(data, dict):
                        metadata["json_type"] = "Object"
                        metadata["top_level_keys"] = list(data.keys())[:25]
                        summary_parts.append(f"JSON Object with keys: {', '.join(list(data.keys())[:10])}")
                    elif isinstance(data, list):
                        metadata["json_type"] = "Array"
                        metadata["record_count"] = len(data)
                        summary_parts.append(f"JSON Array containing {len(data)} items.")
                except Exception as e:
                    metadata["json_error"] = f"Partial/Malformed JSON: {str(e)}"
                    summary_parts.append("JSON text file (partial or malformed JSON syntax).")

        elif ext in ("log", "txt"):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
                line_count = len(lines)
                metadata["line_count"] = line_count
                sample_lines = [l.strip() for l in lines[:5] if l.strip()]
                metadata["sample_lines"] = sample_lines
                summary_parts.append(f"Text/Log artifact with {line_count} lines.")
                f.seek(0)
                extracted_text_for_iocs = f.read(500000)

        elif ext in ("pdf",):
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                num_pages = len(reader.pages)
                metadata["page_count"] = num_pages
                pdf_info = reader.metadata
                if pdf_info:
                    metadata["author"] = pdf_info.author or "N/A"
                    metadata["creator"] = pdf_info.creator or "N/A"
                    metadata["producer"] = pdf_info.producer or "N/A"
                    metadata["creation_date"] = str(pdf_info.creation_date or "N/A")
                summary_parts.append(f"PDF document with {num_pages} pages.")
                # Extract text from first 5 pages safely
                text_buf = []
                for p in reader.pages[:5]:
                    extracted = p.extract_text()
                    if extracted:
                        text_buf.append(extracted)
                extracted_text_for_iocs = "\n".join(text_buf)

        elif ext in ("png", "jpg", "jpeg"):
            with Image.open(file_path) as img:
                metadata["image_format"] = img.format
                metadata["image_mode"] = img.mode
                metadata["dimensions"] = f"{img.width}x{img.height}"
                summary_parts.append(f"Image artifact ({img.format}, {img.width}x{img.height} px, {img.mode} mode).")
                exif_data = img.getexif()
                if exif_data:
                    metadata["exif_tags_count"] = len(exif_data)

        elif ext in ("zip",):
            with zipfile.ZipFile(file_path, 'r') as zf:
                file_list = zf.infolist()
                metadata["archive_entry_count"] = len(file_list)
                entries = []
                for item in file_list[:30]:
                    entries.append({
                        "filename": item.filename,
                        "file_size": item.file_size,
                        "compress_size": item.compress_size
                    })
                metadata["archive_entries"] = entries
                summary_parts.append(f"ZIP Archive containing {len(file_list)} entries (inspected in-place without unzipping).")
                # Check for suspicious file names in archive
                suspicious = [i.filename for i in file_list if ".." in i.filename or i.filename.startswith("/")]
                if suspicious:
                    metadata["path_traversal_warning"] = "Archive contains paths with directory traversal or absolute paths!"
                    summary_parts.append("WARNING: Suspicious relative paths detected inside archive TOC.")

        else:
            # Generic binary or unknown file
            summary_parts.append(f"Binary/Generic evidence file ({ext.upper() if ext else 'raw'}).")
            with open(file_path, "rb") as f:
                head = f.read(4096)
                metadata["first_bytes_hex"] = head[:32].hex()
                # Run regex on ascii strings in header
                ascii_text = "".join(chr(b) if 32 <= b <= 126 else " " for b in head)
                extracted_text_for_iocs = ascii_text

    except Exception as err:
        metadata["analysis_exception"] = str(err)
        summary_parts.append(f"Artifact parsed with notes: {str(err)}")

    # Extract IOCs if text was extracted
    iocs = []
    if extracted_text_for_iocs:
        iocs = extract_iocs_from_text(extracted_text_for_iocs)
        metadata["iocs_identified"] = len(iocs)

    summary = " ".join(summary_parts)
    return summary, metadata, iocs
