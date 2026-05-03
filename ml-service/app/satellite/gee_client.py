"""
Google Earth Engine client.

Real mode: authenticates with service-account JSON and queries Sentinel-2,
Sentinel-1 SAR, and Landsat 8/9 collections per spec §4.

Dev mode: synthesizes deterministic but realistic NDVI timelines so the
whole pipeline runs end-to-end without GEE credentials.
"""
from __future__ import annotations

import hashlib
import logging
import math
import os
from datetime import date, timedelta
from typing import Any

from app.settings import Settings

logger = logging.getLogger(__name__)


class GeeClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._ee = None
        self._authenticated = False
        if settings.gee_mode.lower() == "real":
            self._init_real()

    # ------------------------------------------------------------------
    # Real GEE
    # ------------------------------------------------------------------
    def _init_real(self) -> None:
        try:
            import ee  # type: ignore
            key_path = self.settings.gee_service_account_key
            if not os.path.exists(key_path):
                raise RuntimeError(
                    f"GEE service account key missing at {key_path}. "
                    "Mount /secrets/gee-sa.json or switch GEE_MODE=dev."
                )
            # Extract service account email from the JSON
            import json
            with open(key_path) as fh:
                sa_email = json.load(fh)["client_email"]
            credentials = ee.ServiceAccountCredentials(sa_email, key_path)
            kwargs: dict[str, Any] = {}
            if self.settings.gee_project_id:
                kwargs["project"] = self.settings.gee_project_id
            ee.Initialize(credentials, **kwargs)
            self._ee = ee
            self._authenticated = True
            logger.info("GEE initialized (project=%s)", self.settings.gee_project_id)
        except Exception as exc:
            logger.error("GEE init failed, falling back to dev: %s", exc)
            self._authenticated = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def analyze(
        self,
        udlrn: str,
        polygon_geojson: dict | None,
        sowing_date: date,
        claim_date: date,
    ) -> dict[str, Any]:
        """Return NDVI timeline, NDVI at sowing/claim, cloud cover, SAR, area."""
        if self.settings.gee_mode.lower() == "real" and self._authenticated and polygon_geojson:
            try:
                return self._analyze_real(polygon_geojson, sowing_date, claim_date)
            except Exception as exc:
                logger.error("GEE real analyze failed, dev fallback: %s", exc)

        return self._analyze_dev(udlrn, sowing_date, claim_date)

    # ------------------------------------------------------------------
    # Real analyze (Sentinel-2 NDVI + Sentinel-1 SAR)
    # ------------------------------------------------------------------
    def _analyze_real(self, polygon: dict, sowing: date, claim: date) -> dict[str, Any]:
        ee = self._ee
        geom = ee.Geometry(polygon)

        def mask_s2_clouds(img):
            qa = img.select("QA60")
            cloud_bit_mask = 1 << 10
            cirrus_bit_mask = 1 << 11
            mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(
                qa.bitwiseAnd(cirrus_bit_mask).eq(0))
            return img.updateMask(mask).divide(10000)

        start = (sowing - timedelta(days=7)).isoformat()
        end   = (claim  + timedelta(days=1)).isoformat()

        s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
              .filterDate(start, end)
              .filterBounds(geom)
              .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 60))
              .map(mask_s2_clouds))

        def add_ndvi(img):
            ndvi = img.normalizedDifference(["B8", "B4"]).rename("NDVI")
            return img.addBands(ndvi)

        s2 = s2.map(add_ndvi)

        def reduce_ndvi(img):
            mean = img.select("NDVI").reduceRegion(
                reducer=ee.Reducer.mean(), geometry=geom, scale=10, maxPixels=1e9)
            return ee.Feature(None, {
                "date":  img.date().format("YYYY-MM-dd"),
                "ndvi":  mean.get("NDVI"),
                "cloud": img.get("CLOUDY_PIXEL_PERCENTAGE"),
            })

        fc = s2.map(reduce_ndvi).filter(ee.Filter.notNull(["ndvi"]))
        records = fc.getInfo()["features"]
        timeline = [
            {"date": r["properties"]["date"], "ndvi": float(r["properties"]["ndvi"])}
            for r in records if r["properties"].get("ndvi") is not None
        ]
        timeline.sort(key=lambda x: x["date"])

        ndvi_sowing = self._closest_ndvi(timeline, sowing)
        ndvi_claim  = self._closest_ndvi(timeline, claim)
        cloud_cover = self._mean_cloud(records)

        # Sentinel-1 SAR — use when cloud cover high
        sar_used = False
        sar_vv = sar_vh = None
        if cloud_cover > 60:
            s1 = (ee.ImageCollection("COPERNICUS/S1_GRD")
                  .filterDate(start, end).filterBounds(geom)
                  .filter(ee.Filter.eq("instrumentMode", "IW"))
                  .select(["VV", "VH"]))
            if s1.size().getInfo() > 0:
                s1_mean = s1.mean().reduceRegion(
                    reducer=ee.Reducer.mean(), geometry=geom, scale=10, maxPixels=1e9).getInfo()
                sar_vv = s1_mean.get("VV"); sar_vh = s1_mean.get("VH")
                sar_used = True

        area_ha = geom.area().divide(10000).getInfo()

        return {
            "timeline": timeline,
            "ndvi_sowing": ndvi_sowing,
            "ndvi_claim":  ndvi_claim,
            "ndvi_delta":  (ndvi_sowing - ndvi_claim) if (ndvi_sowing and ndvi_claim) else None,
            "cloud_cover_pct": cloud_cover,
            "sar_used": sar_used,
            "sar_vv_mean": sar_vv,
            "sar_vh_mean": sar_vh,
            "area_satellite_ha": area_ha,
            "source": "gee_real",
        }

    @staticmethod
    def _closest_ndvi(timeline, target: date):
        if not timeline:
            return None
        def diff(e): return abs(date.fromisoformat(e["date"]) - target).days
        return min(timeline, key=diff)["ndvi"]

    @staticmethod
    def _mean_cloud(records) -> float:
        vals = [r["properties"].get("cloud") for r in records if r["properties"].get("cloud") is not None]
        return float(sum(vals) / len(vals)) if vals else 0.0

    # ------------------------------------------------------------------
    # Dev analyze — deterministic synthesized timeline
    # ------------------------------------------------------------------
    def _analyze_dev(self, udlrn: str, sowing: date, claim: date) -> dict[str, Any]:
        seed = int(hashlib.sha256(udlrn.encode()).hexdigest()[:8], 16)
        rng = _seeded_rng(seed)

        days = (claim - sowing).days
        if days <= 0:
            days = 1

        # Synthesize a plausible NDVI curve: low at sowing, rises to mid-season, drops at claim
        timeline = []
        for step in range(0, days + 1, 5):
            d = sowing + timedelta(days=step)
            frac = step / days
            # Gaussian-ish peak
            peak = 0.75 + (rng() - 0.5) * 0.1
            val = peak * math.exp(-((frac - 0.55) ** 2) / 0.12) + 0.1 + (rng() - 0.5) * 0.05
            timeline.append({"date": d.isoformat(), "ndvi": round(max(0.02, min(0.95, val)), 4)})

        ndvi_sowing = timeline[0]["ndvi"] if timeline else 0.2
        ndvi_claim  = timeline[-1]["ndvi"] if timeline else 0.2

        # Randomly simulate "damage" in ~20% of claims based on the hash
        disaster = (seed % 100) < 20
        if disaster:
            ndvi_claim = round(max(0.02, ndvi_claim * 0.35), 4)
            timeline[-1]["ndvi"] = ndvi_claim

        return {
            "timeline": timeline,
            "ndvi_sowing": ndvi_sowing,
            "ndvi_claim":  ndvi_claim,
            "ndvi_delta":  round(ndvi_sowing - ndvi_claim, 4),
            "cloud_cover_pct": round(rng() * 30, 2),
            "sar_used": False,
            "sar_vv_mean": None,
            "sar_vh_mean": None,
            "area_satellite_ha": round(0.5 + rng() * 4.5, 4),
            "source": "dev_synth",
        }


def _seeded_rng(seed: int):
    """Small deterministic LCG yielding floats in [0,1)."""
    state = [seed & 0xFFFFFFFF]
    def _next() -> float:
        state[0] = (1664525 * state[0] + 1013904223) & 0xFFFFFFFF
        return state[0] / 0xFFFFFFFF
    return _next
