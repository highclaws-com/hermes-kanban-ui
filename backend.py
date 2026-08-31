"""Standalone, localhost-only Hermes Kanban server.

It mounts only the Kanban plugin router and serves the built Vite application.
Put it behind an authenticated private tunnel if exposing it beyond localhost.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
HERMES_ROOT = Path(os.environ.get("HERMES_SOURCE", "/home/agent/hermes")).resolve()
if str(HERMES_ROOT) not in sys.path:
    sys.path.insert(0, str(HERMES_ROOT))

from plugins.kanban.dashboard import plugin_api  # noqa: E402

app = FastAPI(title="Hermes Kanban", docs_url=None, redoc_url=None, openapi_url=None)

# Reuse the production Kanban implementation but omit routes that reveal
# dashboard preferences, gateway home-channel ids, or profile model/provider
# metadata. This service is deliberately narrower than the Hermes dashboard.
safe_router = APIRouter()
_EXCLUDED_PATHS = {
    "/config",
    "/home-channels",
    "/profiles",
    "/profiles/{profile_name}",
    "/profiles/{profile_name}/describe-auto",
}
safe_router.routes.extend(
    route for route in plugin_api.router.routes if route.path not in _EXCLUDED_PATHS
)

@safe_router.get("/profiles")
def safe_profiles():
    roster = plugin_api.list_profile_roster()
    return {
        "profiles": [
            {
                "name": profile.get("name", ""),
                "is_default": bool(profile.get("is_default")),
                "description": profile.get("description", ""),
                "skill_count": int(profile.get("skill_count") or 0),
            }
            for profile in roster.get("profiles", [])
        ]
    }

app.include_router(safe_router, prefix="/api")

@app.get("/api/health")
def health():
    return {"ok": True, "service": "hermes-kanban"}

@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    include_in_schema=False,
)
def unknown_api(path: str):
    # Never let the SPA fallback turn a disabled or misspelled API endpoint
    # into a misleading HTTP 200 response.
    return JSONResponse({"detail": "Not Found"}, status_code=404)

DIST = ROOT / "dist"
if DIST.is_dir():
    assets = DIST / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        candidate = (DIST / path).resolve()
        if path and candidate.is_relative_to(DIST) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    def missing_build():
        return {"error": "UI 未构建，请先运行 npm run build"}
