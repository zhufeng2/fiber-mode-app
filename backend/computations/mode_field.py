"""Fiber mode field — one module covering both the weakly-guiding (LP) picture
and the exact vector modes, toggled by `weakly_guiding`.

- weakly_guiding = True  → LP intensity |E_x|² (single image, uses parity)
- weakly_guiding = False → 2×2 montage of the constituent vector modes
  (HE / TM / TE / EH) with polarization-arrow overlays on a regular grid.

An LP mode is the weakly-guiding superposition of those vector modes.
"""
from __future__ import annotations

import numpy as np

from core.lpmode import LPMode
from core.vector_mode import cal_F, cal_intensity

from .base import (
    Computation,
    ComputeResult,
    Overlay,
    ParamSpec,
    normalize_uint8,
    register,
)

INTENSITY_CB = {
    "label": "|E|²  (norm.)",
    "ticks": [
        {"pos": 0.0, "label": "0"},
        {"pos": 0.5, "label": "0.5"},
        {"pos": 1.0, "label": "1"},
    ],
}

SCHEMA = [
    ParamSpec("l", "l (azimuthal)", "int", 1, min=0, max=20, step=1, group="Mode"),
    ParamSpec("m", "m (radial)", "int", 1, min=1, max=20, step=1, group="Mode"),
    ParamSpec("weakly_guiding", "Weakly-guiding (LP)", "bool", True, group="Mode"),
    # parity only matters for the LP picture → disabled in vector view
    ParamSpec("parity", "Parity", "select", "even", group="Mode",
              options=[{"value": "even", "label": "even"}, {"value": "odd", "label": "odd"}],
              disabled_when={"param": "weakly_guiding", "equals": False}),
    ParamSpec("wavelength_nm", "Wavelength (nm)", "float", 638.0, min=100, max=2000, step=1, group="Fiber"),
    ParamSpec("n_core", "n_core", "float", 1.4633, min=1.0, max=2.0, step=0.0001, group="Fiber"),
    ParamSpec("n_clad", "n_clad", "float", 1.4569, min=1.0, max=2.0, step=0.0001, group="Fiber"),
    ParamSpec("a_um", "Core radius a (μm)", "float", 4.5, min=0.1, max=50, step=0.1, group="Fiber"),
    ParamSpec("mesh_size", "Resolution", "int", 300, min=64, max=800, step=2, group="Computation"),
]


def _g(x: float, p: int = 4) -> str:
    return f"{x:.{p}g}"


def _lp_composition_lines(l: int, m: int) -> list[str]:
    """LP = superposition of the exact vector modes, even/odd paired up."""
    if l == 0:
        return [r"\mathrm{LP}_{0%d} \equiv \mathrm{HE}_{1%d}" % (m, m)]
    if l == 1:
        return [
            r"\mathrm{LP}_{1%d}^{\text{even}} = \mathrm{HE}_{2%d}^{\text{even}}\,\oplus\,\mathrm{TM}_{0%d}" % (m, m, m),
            r"\mathrm{LP}_{1%d}^{\text{odd}} = \mathrm{HE}_{2%d}^{\text{odd}}\,\oplus\,\mathrm{TE}_{0%d}" % (m, m, m),
        ]
    return [
        r"\mathrm{LP}_{%d%d}^{\text{even}} = \mathrm{HE}_{%d%d}^{\text{even}}\,\oplus\,\mathrm{EH}_{%d%d}^{\text{even}}" % (l, m, l + 1, m, l - 1, m),
        r"\mathrm{LP}_{%d%d}^{\text{odd}} = \mathrm{HE}_{%d%d}^{\text{odd}}\,\oplus\,\mathrm{EH}_{%d%d}^{\text{odd}}" % (l, m, l + 1, m, l - 1, m),
    ]


def _vector_titles(l: int, m: int) -> list[str]:
    if l == 1:
        return [f"HE{l+1}{m} even", f"TM0{m}", f"HE{l+1}{m} odd", f"TE0{m}"]
    if l >= 2:
        return [f"HE{l+1}{m} even", f"EH{l-1}{m} even", f"HE{l+1}{m} odd", f"EH{l-1}{m} odd"]
    return [f"HE1{m}"] * 4


def _solve(p: dict):
    mode = LPMode(
        l=p["l"], m=p["m"],
        wavelength=p["wavelength_nm"] * 1e-9,
        n_core=p["n_core"], n_clad=p["n_clad"],
        a=p["a_um"] * 1e-6,
        is_odd=(p["parity"] == "odd" and p["l"] > 0),
    )
    v = mode.calculate_v()
    roots = mode.find_roots(v, 300)
    if len(roots) < p["m"]:
        raise ValueError(f"Cannot find root {p['m']} (V={v:.4f} has {len(roots)} solution(s))")
    return mode, v, roots[p["m"] - 1]


def _v_definition(p: dict, v: float) -> str:
    return r"V = \dfrac{2\pi\times %s}{%s}\sqrt{%s^2-%s^2} = %s" % (
        _g(p["a_um"]), _g(p["wavelength_nm"] / 1000.0), _g(p["n_core"]), _g(p["n_clad"]), _g(v))


ARROW_N = 26  # regular arrow grid; the frontend subsamples by integer stride


def _arrow_grid(extent: float = 2.0):
    xa = np.linspace(-extent, extent, ARROW_N)
    X, Y = np.meshgrid(xa, xa)
    return X, Y, np.sqrt(X ** 2 + Y ** 2), np.arctan2(Y, X)


def _xpol_arrows(mode: LPMode, U: float, extent: float = 2.0) -> list[dict]:
    """LP modes are linearly polarized → uniform horizontal arrows in bright lobes."""
    X, Y, R, Phi = _arrow_grid(extent)
    e = mode.E_x(R, Phi, U)
    ig = e ** 2
    mx = float(np.max(ig)) or 1.0
    rows, cols = np.where(ig > 0.12 * mx)
    return [
        {"x": (X[r, c] + extent) / (2 * extent), "y": (extent - Y[r, c]) / (2 * extent),
         "dx": 1.0, "dy": 0.0, "gi": int(c), "gj": int(r)}
        for r, c in zip(rows, cols)
    ]


def _compute_lp(p: dict) -> ComputeResult:
    mode, v, U = _solve(p)
    _, _, R, Phi = LPMode.generate_mesh(p["mesh_size"])
    intensity = np.abs(mode.E_x(R, Phi, U)) ** 2

    l = p["l"]
    is_odd = p["parity"] == "odd" and l > 0
    trig = r"\sin" if is_odd else r"\cos"
    if l == 0:
        field_line = r"E_x(\rho,\phi) = \dfrac{J_0(%s\,\rho)}{J_0(%s)},\quad \rho=r/a" % (_g(U), _g(U))
    else:
        field_line = r"E_x(\rho,\phi) = \dfrac{J_{%d}(%s\,\rho)}{J_{%d}(%s)}\,%s(%d\phi)" % (
            l, _g(U), l, _g(U), trig, l)

    return ComputeResult(
        field=normalize_uint8(intensity),
        default_colormap="jet",
        colorbar=INTENSITY_CB,
        formulas=_lp_composition_lines(l, p["m"]),           # right column
        definitions=[_v_definition(p, v), field_line, r"I = |E_x|^2"],  # results, under metrics
        overlays=[Overlay("arrows", _xpol_arrows(mode, U))],
        metadata={
            "mode_label": f"LP{l}{p['m']} ({'odd' if is_odd else 'even'})",
            "V_number": round(float(v), 4),
            "selected_U": round(float(U), 4),
            "wavelength_nm": round(p["wavelength_nm"], 1),
            "resolution": f"{p['mesh_size']}×{p['mesh_size']}",
        },
    )


def _compute_vector(p: dict) -> ComputeResult:
    mode, v, U = _solve(p)
    l, m = p["l"], p["m"]
    n = max(120, min(p["mesh_size"], 360))
    extent = 2.0

    # intensity background (radially symmetric)
    x1 = np.linspace(-extent, extent, n)
    X1, Y1 = np.meshgrid(x1, x1)
    R1 = np.sqrt(X1 ** 2 + Y1 ** 2)
    intensity = cal_intensity(R1, l, U, v)

    # arrows on a REGULAR grid masked by the bright annulus → uniform like quiver
    Xa, Ya, Ra, Pa = _arrow_grid(extent)
    Fa = cal_F(Ra, l, U, v)
    amax = float(np.max(np.abs(Fa))) or 1.0
    mask = np.abs(Fa) > 0.22 * amax
    E1 = Fa * np.cos(l * Pa)
    E2 = Fa * np.sin(l * Pa)
    mode_pairs = [(E1, -E2), (E1, E2), (E2, E1), (E2, -E1)]
    rows, cols = np.where(mask)
    titles = _vector_titles(l, m)

    # 2×2 montage (cell k at row k//2, col k%2)
    total = 2 * n
    montage = np.zeros((total, total), dtype=intensity.dtype)
    arrows: list[dict] = []
    labels: list[dict] = []
    for k in range(4):
        row, col = k // 2, k % 2
        xoff, yoff = col * n, row * n
        montage[yoff:yoff + n, xoff:xoff + n] = intensity
        labels.append({"x": (xoff + 10) / total, "y": (yoff + 12) / total, "text": titles[k]})
        Ex, Ey = mode_pairs[k][0], mode_pairs[k][1]
        for r, c in zip(rows, cols):
            px = xoff + (Xa[r, c] + extent) / (2 * extent) * n
            py = yoff + (extent - Ya[r, c]) / (2 * extent) * n
            arrows.append({"x": px / total, "y": py / total,
                           "dx": float(Ex[r, c]), "dy": float(-Ey[r, c]),
                           "gi": int(c), "gj": int(r)})

    F = r"\dfrac{J_{%d}(%s\,\rho)}{J_{%d}(%s)}" % (l, _g(U), l, _g(U))
    c, s = r"F\cos(%d\phi)" % l, r"F\sin(%d\phi)" % l
    lp1, lm1 = l + 1, l - 1
    if l == 1:
        mode_lines = [
            r"\mathrm{HE}_{2%d}^{\text{even}} = %s\,\hat e_x - %s\,\hat e_y" % (m, c, s),
            r"\mathrm{TM}_{0%d} = %s\,\hat e_x + %s\,\hat e_y" % (m, c, s),
            r"\mathrm{HE}_{2%d}^{\text{odd}} = %s\,\hat e_x + %s\,\hat e_y" % (m, s, c),
            r"\mathrm{TE}_{0%d} = %s\,\hat e_x - %s\,\hat e_y" % (m, s, c),
        ]
    elif l >= 2:
        mode_lines = [
            r"\mathrm{HE}_{%d%d}^{\text{even}} = %s\,\hat e_x - %s\,\hat e_y" % (lp1, m, c, s),
            r"\mathrm{EH}_{%d%d}^{\text{even}} = %s\,\hat e_x + %s\,\hat e_y" % (lm1, m, c, s),
            r"\mathrm{HE}_{%d%d}^{\text{odd}} = %s\,\hat e_x + %s\,\hat e_y" % (lp1, m, s, c),
            r"\mathrm{EH}_{%d%d}^{\text{odd}} = %s\,\hat e_x - %s\,\hat e_y" % (lm1, m, s, c),
        ]
    else:
        mode_lines = [r"\mathrm{HE}_{1%d}:\ \vec E = F\,\hat e_x" % m]

    return ComputeResult(
        field=normalize_uint8(montage),
        default_colormap="jet",
        colorbar=INTENSITY_CB,
        formulas=mode_lines,                                   # right column (no LP=… line)
        definitions=[r"F(\rho) = %s,\quad \rho=r/a" % F],      # under left panel
        overlays=[
            Overlay("arrows", arrows),
            Overlay("labels", labels),
            Overlay("vlines", [{"x": 0.5}]),
            Overlay("hlines", [{"y": 0.5}]),
        ],
        metadata={
            "mode_label": f"LP{l}{m} → vector",
            "constituents": ", ".join(titles),
            "V_number": round(float(v), 4),
            "selected_U": round(float(U), 4),
        },
    )


def compute(p: dict) -> ComputeResult:
    return _compute_lp(p) if p["weakly_guiding"] else _compute_vector(p)


register(Computation(
    id="mode_field",
    title="Mode Field",
    description="LP intensity (weakly-guiding) or the exact vector-mode constituents.",
    schema=SCHEMA,
    compute=compute,
    arrows=True,
))
