"""
SatelliteAnalysisService — orchestrates:
  GEE -> engineer(47 features) -> ensemble.score -> evidence artifacts -> MinIO
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

from .evidence.renderer import (
    render_evidence_pdf, render_loss_map, render_ndvi_heatmap, render_true_color)
from .features.engineer import engineer
from .models.ensemble import FraudEnsemble
from .satellite.gee_client import GeeClient
from .settings import Settings, get_settings, get_gee_mode
from .storage.minio_client import MinioStorage

logger = logging.getLogger(__name__)

RECOMMENDATIONS = {
    "AUTO_APPROVE":         "AUTO_APPROVE",
    "OFFICER_REVIEW":       "OFFICER_REVIEW",
    "MANDATORY_CCE_VISIT":  "MANDATORY_FIELD_VISIT",
    "AUTO_REJECT":          "AUTO_REJECT_AND_FIR",
}


class SatelliteAnalysisService:

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.gee      = GeeClient(self.settings)
        self.ensemble = FraudEnsemble(self.settings.model_dir)
        try:
            self.storage = MinioStorage(self.settings)
        except Exception as exc:
            logger.warning("MinIO unavailable at boot, evidence uploads will retry: %s", exc)
            self.storage = None

    # ------------------------------------------------------------------
    def analyze(self, req: dict[str, Any]) -> dict[str, Any]:
        udlrn   = req["udlrn"]
        sowing  = _d(req["sowing_date"])
        claim_d = _d(req["claim_date"])
        polygon = req.get("polygon") or _parse_geojson(req.get("polygon_geojson"))

        if get_gee_mode() == "dev":
            logger.info("DEV MODE - Returning mock satellite result")
            return {
                "udlrn": udlrn,
                "fraud_score": 45,
                "ndvi_sowing": 0.72,
                "ndvi_claim": 0.41,
                "ndvi_loss_map_url": "/assets/mock/loss_map.jpg",
                "true_color_url": "/assets/mock/true_color.jpg",
                "ndvi_map_url": "/assets/mock/ndvi_map.jpg",
                "evidence_pdf_url": "/assets/mock/evidence.pdf",
                "area_satellite_ha": 2.5,
                "cloud_cover_pct": 10,
                "sar_used": False,
                "flags": ["MOCK_DATA_USED"],
                "recommendation": "OFFICER_REVIEW",
                "confidence": 0.95,
                "model_versions": {"ensemble": "v1.0-mock"},
                "probabilities": {"rf": 0.45, "xgb": 0.46, "if": 0.40},
                "timeline": [],
                "feature_snapshot": {},
            }

        satellite = self.gee.analyze(udlrn, polygon, sowing, claim_d)

        claim_meta = {
            "declared_crop":          req.get("declared_crop"),
            "damage_type":            req.get("damage_type", "OTHER"),
            "sowing_date":            sowing,
            "claim_date":             claim_d,
            "claim_amount_requested": req.get("claim_amount_requested", 0),
        }
        land_record = (req.get("satellite_result") or {}).get("land_record", {})
        rolling     = req.get("rolling", {})

        # 1. Render visual artifacts for CNN and storage
        tc = render_true_color(udlrn, satellite.get("ndvi_claim") or 0.0)
        nd = render_ndvi_heatmap(udlrn, satellite.get("ndvi_claim") or 0.0)
        lm = render_loss_map(udlrn, satellite.get("ndvi_delta")  or 0.0)

        # 2. Extract features and perform ensemble scoring (now includes CNN)
        vec, named = engineer(satellite, land_record, claim_meta, rolling)
        scored = self.ensemble.score(vec, image_bytes=tc)

        flags = self._flag(named, satellite)

        score = scored["fraud_score"]
        band = self._band(score)
        recommendation = RECOMMENDATIONS[band]

        # Upload artifacts (best-effort)
        urls = {"true_color": None, "ndvi_map": None, "loss_map": None, "evidence_pdf": None}
        if self.storage:
            try:
                pdf = render_evidence_pdf(
                    udlrn, req.get("claim_id", udlrn), score, flags,
                    satellite.get("ndvi_sowing") or 0.0,
                    satellite.get("ndvi_claim")  or 0.0,
                    satellite.get("area_satellite_ha") or 0.0,
                    recommendation, tc, nd, lm)

                key_base = f"{udlrn}/{req.get('claim_id', 'latest')}"
                self.storage.put_bytes(self.settings.minio_bucket_satellite,
                                       f"{key_base}/true_color.jpg", tc, "image/jpeg")
                self.storage.put_bytes(self.settings.minio_bucket_ndvi,
                                       f"{key_base}/ndvi.jpg", nd, "image/jpeg")
                self.storage.put_bytes(self.settings.minio_bucket_ndvi,
                                       f"{key_base}/loss.jpg", lm, "image/jpeg")
                self.storage.put_bytes(self.settings.minio_bucket_pdf,
                                       f"{key_base}/evidence.pdf", pdf, "application/pdf")

                urls["true_color"]   = self.storage.presigned_get(
                    self.settings.minio_bucket_satellite, f"{key_base}/true_color.jpg")
                urls["ndvi_map"]     = self.storage.presigned_get(
                    self.settings.minio_bucket_ndvi, f"{key_base}/ndvi.jpg")
                urls["loss_map"]     = self.storage.presigned_get(
                    self.settings.minio_bucket_ndvi, f"{key_base}/loss.jpg")
                urls["evidence_pdf"] = self.storage.presigned_get(
                    self.settings.minio_bucket_pdf, f"{key_base}/evidence.pdf")
            except Exception as exc:
                logger.error("Artifact upload failed: %s", exc)

        return {
            "udlrn": udlrn,
            "fraud_score":       score,
            "ndvi_sowing":       satellite.get("ndvi_sowing"),
            "ndvi_claim":        satellite.get("ndvi_claim"),
            "ndvi_loss_map_url": urls["loss_map"],
            "true_color_url":    urls["true_color"],
            "ndvi_map_url":      urls["ndvi_map"],
            "evidence_pdf_url":  urls["evidence_pdf"],
            "area_satellite_ha": satellite.get("area_satellite_ha"),
            "cloud_cover_pct":   satellite.get("cloud_cover_pct"),
            "sar_used":          bool(satellite.get("sar_used")),
            "flags":             flags,
            "recommendation":    recommendation,
            "confidence":        scored["confidence"],
            "model_versions":    scored["model_versions"],
            "probabilities":     scored["probabilities"],
            "timeline":          satellite.get("timeline"),
            "feature_snapshot":  named,
        }

    # ------------------------------------------------------------------
    def _flag(self, f: dict[str, float], satellite: dict) -> list[str]:
        flags = []
        if f.get("ndvi_at_claim", 0) > 0.6 and f.get("ndvi_delta", 0) < 0.05:
            flags.append("NO_DAMAGE_SIGNATURE")
        if f.get("area_delta_pct", 0) > 15:
            flags.append("AREA_INFLATION")
        if f.get("mutation_recency_days", 9999) <= 30:
            flags.append("VAO_FALSIFICATION")
        if f.get("crop_phenology_match", 1) == 0:
            flags.append("PHENOLOGY_MISMATCH")
        if f.get("csc_operator_daily_claim_count", 0) > 50:
            flags.append("CSC_BULK_SUBMISSION")
        if (satellite.get("cloud_cover_pct") or 0) > 80 and not satellite.get("sar_used"):
            flags.append("LOW_DATA_QUALITY")
        return flags

    @staticmethod
    def _band(score: int) -> str:
        if score <= 30: return "AUTO_APPROVE"
        if score <= 60: return "OFFICER_REVIEW"
        if score <= 80: return "MANDATORY_CCE_VISIT"
        return "AUTO_REJECT"


def _d(v: Any) -> date:
    if isinstance(v, date):
        return v
    return date.fromisoformat(str(v)[:10])


def _parse_geojson(raw: str | None) -> dict | None:
    if not raw:
        return None
    import json
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None
