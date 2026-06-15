"""Core abstractions for the computation registry.

This is the backbone of the app's extensibility (see plan.md §3). Every
computation declares:

  * a unique ``id``
  * a human ``title``
  * a ``schema`` (list of ParamSpec) that DRIVES THE FRONTEND FORM
  * a ``compute(params) -> ComputeResult`` function

The API exposes the schema via ``GET /api/modules`` so the UI renders controls
automatically. Adding a new visualization = write one module that calls
``register(...)`` — no API or frontend changes required.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Literal

import numpy as np

ParamType = Literal["int", "float", "select", "bool"]


@dataclass
class ParamSpec:
    """One tunable parameter. The ``type`` tells the frontend which control to render."""
    name: str
    label: str
    type: ParamType
    default: Any
    min: float | None = None
    max: float | None = None
    step: float | None = None
    # for type == "select": list of {"value": ..., "label": ...}
    options: list[dict[str, Any]] | None = None
    group: str = "Parameters"   # used to group controls into cards
    help: str | None = None
    # disable this control when another param has a given value, e.g.
    # {"param": "weakly_guiding", "equals": False}
    disabled_when: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        d = {
            "name": self.name,
            "label": self.label,
            "type": self.type,
            "default": self.default,
            "group": self.group,
        }
        for k in ("min", "max", "step", "options", "help", "disabled_when"):
            v = getattr(self, k)
            if v is not None:
                d[k] = v
        return d


@dataclass
class Overlay:
    """A vector overlay drawn on top of the scalar field (e.g. polarization arrows).

    Coordinates are normalized to [0, 1] in image space (x right, y down).
    """
    kind: Literal["arrows", "text"]
    items: list[dict[str, Any]]


@dataclass
class ComputeResult:
    """Result of a computation. ``field`` is a normalized uint8 scalar map that the
    frontend colorizes client-side."""
    field: np.ndarray                      # 2D uint8, shape (h, w)
    metadata: dict[str, Any] = field(default_factory=dict)
    overlays: list[Overlay] = field(default_factory=list)
    # default colormap suggestion for this result
    default_colormap: str = "jet"
    # colorbar spec for the viewport scale: {"label": str, "ticks": [{"pos": 0..1, "label": str}, ...]}
    # pos is measured from the bottom (0 = field min, 1 = field max).
    colorbar: dict[str, Any] | None = None
    # superposition / relation formulas → shown in the Results "Formulation" column
    formulas: list[str] = field(default_factory=list)
    # background definitions (V, radial profile, …) → shown under the left panel
    definitions: list[str] = field(default_factory=list)


@dataclass
class Computation:
    id: str
    title: str
    schema: list[ParamSpec]
    compute: Callable[[dict[str, Any]], ComputeResult]
    description: str = ""
    arrows: bool = False  # module supports polarization-arrow overlays

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "arrows": self.arrows,
            "schema": [p.to_dict() for p in self.schema],
        }


REGISTRY: dict[str, Computation] = {}


def register(comp: Computation) -> Computation:
    if comp.id in REGISTRY:
        raise ValueError(f"Computation id already registered: {comp.id}")
    REGISTRY[comp.id] = comp
    return comp


# ── shared helpers ──────────────────────────────────────────────────────────

def normalize_uint8(data: np.ndarray) -> np.ndarray:
    """Min-max normalize a float field to uint8 [0, 255]."""
    lo, hi = float(np.min(data)), float(np.max(data))
    if hi > lo:
        norm = (data - lo) / (hi - lo)
    else:
        norm = np.zeros_like(data)
    return (norm * 255).astype(np.uint8)


def coerce_params(schema: list[ParamSpec], raw: dict[str, Any]) -> dict[str, Any]:
    """Validate + coerce incoming params against the schema, filling defaults."""
    out: dict[str, Any] = {}
    by_name = {p.name: p for p in schema}
    for name, spec in by_name.items():
        val = raw.get(name, spec.default)
        try:
            if spec.type == "int":
                val = int(val)
            elif spec.type == "float":
                val = float(val)
            elif spec.type == "bool":
                val = bool(val) if not isinstance(val, str) else val.lower() == "true"
            # select / others pass through as-is
        except (TypeError, ValueError) as e:
            raise ValueError(f"Invalid value for '{name}': {raw.get(name)!r} ({e})")
        if spec.min is not None and isinstance(val, (int, float)) and val < spec.min:
            raise ValueError(f"'{name}' must be >= {spec.min}")
        if spec.max is not None and isinstance(val, (int, float)) and val > spec.max:
            raise ValueError(f"'{name}' must be <= {spec.max}")
        out[name] = val
    return out
