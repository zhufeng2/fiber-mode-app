"""Computation registry package.

Importing this package registers all built-in computations as a side effect,
so the rest of the app can simply do ``from backend.computations import REGISTRY``.
To add a new computation: create a module here that calls ``register(...)`` and
import it below.
"""
from .base import REGISTRY, register, Computation, ComputeResult, ParamSpec, Overlay

# Importing each module triggers its register() call.
from . import mode_field  # noqa: F401
from . import phase_map  # noqa: F401

__all__ = [
    "REGISTRY",
    "register",
    "Computation",
    "ComputeResult",
    "ParamSpec",
    "Overlay",
]
