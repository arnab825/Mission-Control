"""Compatibility module for pipeline extraction experiments.

This module intentionally re-exports symbols from `pipeline_host` so
tools/importers can reference `_pipeline_extract` without duplicating
pipeline implementation code.
"""

from __future__ import annotations

from pipeline_host import *  # noqa: F403
