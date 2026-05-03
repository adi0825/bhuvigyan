"""Simplified crop phenology calendar used for phenology-match feature."""
from datetime import date

# Approximate sowing months per crop in India
SOWING_MONTHS = {
    "paddy":      {6, 7, 8},           # Kharif
    "wheat":      {10, 11, 12},        # Rabi
    "cotton":     {5, 6, 7},
    "soybean":    {6, 7},
    "maize":      {6, 7, 10, 11},
    "groundnut":  {5, 6, 7},
    "sugarcane":  {10, 11, 12, 1, 2},
    "mustard":    {10, 11},
    "pulses":     {6, 7, 10, 11},
}


def phenology_match(declared_crop: str, sowing_date: date) -> int:
    """1 if sowing date falls in typical window for declared crop else 0."""
    if not declared_crop:
        return 0
    crop = declared_crop.strip().lower()
    months = SOWING_MONTHS.get(crop)
    if not months:
        return 1  # unknown crop -> don't penalize
    return 1 if sowing_date.month in months else 0
