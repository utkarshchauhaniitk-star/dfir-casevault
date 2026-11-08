# DFIR CaseVault &mdash; Production Deployment Guide

## 1. Deployment Topology
DFIR CaseVault separates the frontend single-page application from the backend API:

- **Frontend**: Deployed on Vercel, Netlify, or AWS CloudFront/S3 (Static Assets + React Router rewrite).
- **Backend**: Deployed on Render, Railway, AWS ECS, or DigitalOcean App Platform (FastAPI / Uvicorn container).
- **Database**: PostgreSQL (e.g. Supabase, Render PostgreSQL, AWS RDS).
- **Evidence Storage**: Persistent Block Disk (Render Disks) or Cloud Object Storage (AWS S3 / GCP Cloud Storage).

---

## 2. Environment Variables

### Backend Configuration
| Variable | Description | Default | Production Example |
|---|---|---|---|
| `PROJECT_NAME` | Application display name | `DFIR CaseVault` | `DFIR CaseVault` |
| `ENVIRONMENT` | Deployment environment | `development` | `production` |
| `DEBUG` | FastAPI debug mode | `true` | `false` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./dfir_casevault.db` | `postgresql://user:pass@ep-host.region.aws.neon.tech/casevault` |
| `EVIDENCE_STORAGE_DIR` | Absolute path for stored artifacts | `./evidence_storage` | `/var/data/evidence_storage` |
| `MAX_UPLOAD_SIZE_BYTES` | Upload limit (bytes) | `26214400` (25MB) | `26214400` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173` | `https://dfir-casevault.vercel.app` |
| `SECRET_KEY` | Application secret key | Dev key | 64-char random hex string |

### Frontend Configuration
| Variable | Description | Production Example |
|---|---|---|
| `VITE_API_BASE_URL` | Root URL of backend FastAPI service | `https://dfir-casevault-api.onrender.com` |

---

## 3. Persistent Storage Requirements
> [!IMPORTANT]
> **Ephemeral Storage Limitation**: Many cloud PaaS providers (free tier Render, Heroku) utilize ephemeral filesystems that discard uploaded files upon container restarts.
> For production forensic integrity, you must either:
> 1. Attach a **Persistent Disk** (configured in `render.yaml` at `/var/data`), OR
> 2. Mount an **S3-compatible Object Storage Bucket** with immutable object versioning.

---

## 4. Step-by-Step Deployment

### Backend on Render
1. Push your repository to GitHub.
2. In the Render Dashboard, select **New > Blueprint**.
3. Point to your repository (`render.yaml`).
4. Render provisions:
   - Python Web Service running `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Managed PostgreSQL database
   - 10GB persistent disk mounted at `/var/data`
5. Note the assigned service URL (e.g., `https://dfir-casevault-api.onrender.com`).

### Frontend on Vercel
1. In the Vercel Dashboard, click **Add New > Project**.
2. Select `dfir-casevault` from your GitHub account.
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   ```
   VITE_API_BASE_URL=https://dfir-casevault-api.onrender.com
   ```
5. Click **Deploy**. Vercel will build the frontend and serve it with client-side SPA routing (`vercel.json`).

---

## 5. Post-Deployment Verification
1. Open `https://<your-backend-domain>/api/health` and verify `"status": "healthy"`.
2. Access the frontend dashboard and confirm the **Engine Online** indicator is green.
3. Ingest a sample artifact and execute a cryptographic SHA-256 verification.
4. Generate a test PDF report and confirm download functionality.
