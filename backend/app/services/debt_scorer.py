"""Shared debt scoring heuristics — consistent across heatmap and file_health."""
from __future__ import annotations

from typing import Optional


def compute_complexity(file_size: int) -> float:
    """0.0–1.0 complexity score based on file size."""
    if file_size <= 0:
        return 0.0
    return min(1.0, max(0.0, (file_size / 8000.0)))


def compute_churn(commit_count: int) -> float:
    """0.0–1.0 churn score based on number of commits touching this file."""
    if commit_count <= 0:
        return 0.0
    return min(1.0, commit_count / 15.0)


def compute_debt_score(fix_count: int, commit_count: int) -> float:
    """0.0–1.0 debt score from fix-commit ratio + absolute fix volume."""
    if commit_count == 0:
        return 0.0
    ratio = (fix_count / commit_count) if commit_count > 0 else 0.0
    absolute = min(1.0, fix_count / 8.0)
    return min(1.0, ratio * 0.4 + absolute * 0.6)


def risk_level(debt_score: float) -> str:
    """Map debt score to risk level."""
    if debt_score > 0.66:
        return "high"
    elif debt_score > 0.33:
        return "medium"
    return "low"
