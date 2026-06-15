"""Phase map computation — wraps core/phase_map.py unchanged.

Second registered module: proves the registry/UI auto-adapt to a new
computation with a completely different parameter set (plan.md §3).
"""
from __future__ import annotations

import numpy as np

from core.phase_map import vortex_phase, blazed_grating, lp_phase_distribution

from .base import Computation, ComputeResult, ParamSpec, register

# Phase fields are wrapped to [-π, π]; map linearly to uint8 for display.
SCHEMA = [
    ParamSpec("phase_type", "Type", "select", "lp", group="Phase Type",
              options=[{"value": "lp", "label": "LP Mode"}, {"value": "vortex", "label": "Vortex"}]),
    ParamSpec("vortex_l", "Topological charge l", "int", 1, min=-20, max=20, step=1, group="Parameters"),
    ParamSpec("phase_angle", "Phase rotation (°)", "float", 0.0, min=-360, max=360, step=1, group="Parameters"),
    ParamSpec("fx", "Grating fx", "float", 0.0, min=-100, max=100, step=1, group="Parameters"),
    ParamSpec("fy", "Grating fy", "float", 0.0, min=-100, max=100, step=1, group="Parameters"),
    ParamSpec("size", "Output size", "select", "square", group="Output",
              options=[{"value": "square", "label": "1024×1024"}, {"value": "wide", "label": "1920×1080"}]),
]


def _phase_to_uint8(phase: np.ndarray) -> np.ndarray:
    wrapped = np.mod(phase + np.pi, 2 * np.pi)  # → [0, 2π)
    return (wrapped / (2 * np.pi) * 255).astype(np.uint8)


def compute(p: dict) -> ComputeResult:
    l = p["vortex_l"]
    fx, fy = p["fx"], p["fy"]
    size = p["size"]

    if p["phase_type"] == "lp":
        phase = lp_phase_distribution(
            size, l,
            n_x=int(fx) if fx != 0 else 0,
            n_y=int(fy) if fy != 0 else 0,
            phase_angle=p["phase_angle"],
        )
        type_label = "LP Phase Distribution"
    else:
        phase = vortex_phase(size, l, phase_angle=p["phase_angle"])
        if fx != 0 or fy != 0:
            phase = phase + blazed_grating(phase.shape, fx, fy)
        type_label = "Vortex"

    h, w = phase.shape
    return ComputeResult(
        field=_phase_to_uint8(phase),
        default_colormap="gray",
        colorbar={
            "label": "phase  (rad)",
            "ticks": [
                {"pos": 0.0, "label": "-π"},
                {"pos": 0.5, "label": "0"},
                {"pos": 1.0, "label": "π"},
            ],
        },
        formulas=(
            [r"\varphi(r,\theta) = l\,\theta + \varphi_0"]
            if p["phase_type"] == "vortex"
            else [r"\varphi = \arg\!\big[\cos(l\theta + \tfrac{\pi}{2})\big] + 2\pi(f_x x + f_y y)"]
        ),
        metadata={
            "phase_type": type_label,
            "topological_l": l,
            "size": f"{w}×{h}",
            "grating": f"fx={int(fx)}, fy={int(fy)}",
            "phase_rotation_deg": p["phase_angle"],
        },
    )


register(Computation(
    id="phase_map",
    title="Phase Map",
    description="LP / vortex phase distribution with optional blazed grating.",
    schema=SCHEMA,
    compute=compute,
))
