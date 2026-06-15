"""FastAPI entry point for the FiberMode web app.

Run from the project root:
    uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import base64
import os
import sys

# Make the project root importable so `core` and `backend` resolve when run
# from anywhere.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel

from backend.computations import REGISTRY
from backend.computations.base import coerce_params

app = FastAPI(title="FiberMode API", version="0.1.0")

# Dev: allow the Vite dev server to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


class ComputeRequest(BaseModel):
    params: dict = {}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "modules": list(REGISTRY.keys())}


@app.get("/api/modules")
def list_modules() -> dict:
    """Schema for every registered computation — drives the frontend UI."""
    return {"modules": [c.to_dict() for c in REGISTRY.values()]}


@app.post("/api/compute/{module_id}")
def compute(module_id: str, req: ComputeRequest) -> dict:
    comp = REGISTRY.get(module_id)
    if comp is None:
        raise HTTPException(status_code=404, detail=f"Unknown module: {module_id}")
    try:
        params = coerce_params(comp.schema, req.params)
        result = comp.compute(params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    h, w = result.field.shape
    # uint8 field → base64 (gzip handled by middleware). Frontend colorizes it.
    field_b64 = base64.b64encode(result.field.tobytes()).decode("ascii")
    return {
        "width": w,
        "height": h,
        "field": field_b64,
        "default_colormap": result.default_colormap,
        "colorbar": result.colorbar,
        "formulas": result.formulas,
        "definitions": result.definitions,
        "metadata": result.metadata,
        "overlays": [{"kind": o.kind, "items": o.items} for o in result.overlays],
    }
