"""
Ensemble fraud-scoring engine (spec §4 — 3 models, weighted majority).

  Model 1 — Random Forest crop classifier           (weight 0.35)
  Model 2 — Isolation Forest anomaly detector       (weight 0.30)
  Model 3 — XGBoost timeline validator              (weight 0.35)

Final score = 100 * weighted average of per-model fraud probabilities.

On first boot (or whenever artifacts are missing) the ensemble
auto-trains itself on synthesized but realistic feature distributions
so the service is never "cold". Operators then drop real training
artifacts into /app/models/ to override. All three models implement the
same interface: fraud_probability(x: list[float]) -> float in [0,1].
"""
from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from ..features.engineer import FEATURE_NAMES

logger = logging.getLogger(__name__)


RF_VERSION  = "1.2.0"
IF_VERSION  = "1.1.0"
XGB_VERSION = "1.3.0"

RF_WEIGHT, IF_WEIGHT, XGB_WEIGHT, CNN_WEIGHT = 0.25, 0.20, 0.25, 0.30


class FraudEnsemble:
    """Thread-safe ensemble scorer."""

    def __init__(self, model_dir: str):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._rf = self._if = self._xgb = None
        self._scaler = None
        self._load_or_train()

    # ------------------------------------------------------------------
    def _load_or_train(self) -> None:
        rf_path  = self.model_dir / "rf.joblib"
        if_path  = self.model_dir / "if.joblib"
        xgb_path = self.model_dir / "xgb.joblib"
        sc_path  = self.model_dir / "scaler.joblib"
        try:
            if all(p.exists() for p in (rf_path, if_path, xgb_path, sc_path)):
                self._rf     = joblib.load(rf_path)
                self._if     = joblib.load(if_path)
                self._xgb    = joblib.load(xgb_path)
                self._scaler = joblib.load(sc_path)
                logger.info("Ensemble loaded from %s", self.model_dir)
                return
        except Exception as exc:
            logger.error("Failed to load saved models: %s — retraining", exc)

        logger.info("Training synthetic bootstrap ensemble (no real artifacts found)")
        self._train_synthetic(rf_path, if_path, xgb_path, sc_path)

    # ------------------------------------------------------------------
    def _train_synthetic(self, rf_path, if_path, xgb_path, sc_path) -> None:
        from sklearn.ensemble import RandomForestClassifier, IsolationForest
        from sklearn.preprocessing import StandardScaler
        import xgboost as xgb

        rng = np.random.default_rng(42)
        n_samples = 3000
        n_features = len(FEATURE_NAMES)

        # Class balance: 80% genuine, 20% fraud
        y = (rng.random(n_samples) < 0.20).astype(int)

        X = rng.normal(loc=0.5, scale=0.2, size=(n_samples, n_features))

        # Inject signal on key indices aligned to FEATURE_NAMES
        idx_ndvi_claim = FEATURE_NAMES.index("ndvi_at_claim")
        idx_ndvi_delta = FEATURE_NAMES.index("ndvi_delta")
        idx_area_delta = FEATURE_NAMES.index("area_delta_pct")
        idx_mut_recency = FEATURE_NAMES.index("mutation_recency_days")
        idx_csc = FEATURE_NAMES.index("csc_operator_daily_claim_count")
        idx_phen = FEATURE_NAMES.index("crop_phenology_match")

        # Fraud samples: lower NDVI claim? Actually fraud = claim of damage when no damage,
        # so fraud cases have HIGH NDVI at claim + NEGATIVE ndvi_delta + high area_delta,
        # high mutation recency (fresh mutation), high csc count, low phenology match.
        fraud_mask = y == 1
        X[fraud_mask, idx_ndvi_claim] += rng.normal(0.25, 0.1, size=fraud_mask.sum())
        X[fraud_mask, idx_ndvi_delta] -= rng.normal(0.4, 0.15, size=fraud_mask.sum())
        X[fraud_mask, idx_area_delta] += rng.normal(20, 10, size=fraud_mask.sum())
        X[fraud_mask, idx_mut_recency] = rng.uniform(0, 30, size=fraud_mask.sum())
        X[fraud_mask, idx_csc] += rng.normal(40, 15, size=fraud_mask.sum())
        X[fraud_mask, idx_phen] = 0

        scaler = StandardScaler().fit(X)
        Xs = scaler.transform(X)

        rf  = RandomForestClassifier(n_estimators=200, max_depth=12,
                                     class_weight="balanced", n_jobs=-1, random_state=42).fit(Xs, y)
        iso = IsolationForest(n_estimators=200, contamination=0.2, random_state=42, n_jobs=-1).fit(Xs)
        xg  = xgb.XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.08,
                                objective="binary:logistic", tree_method="hist",
                                eval_metric="logloss", random_state=42).fit(Xs, y)

        joblib.dump(rf,  rf_path)
        joblib.dump(iso, if_path)
        joblib.dump(xg,  xgb_path)
        joblib.dump(scaler, sc_path)

        self._rf     = rf
        self._if     = iso
        self._xgb    = xg
        self._scaler = scaler
        logger.info("Synthetic ensemble trained and persisted to %s", self.model_dir)

    # ------------------------------------------------------------------
    def score(self, features: list[float], image_bytes: bytes | None = None) -> dict[str, Any]:
        from .cnn_classifier import cnn_engine
        with self._lock:
            x = np.asarray(features, dtype=float).reshape(1, -1)
            xs = self._scaler.transform(x)

            # Random Forest — class-1 probability
            rf_p = float(self._rf.predict_proba(xs)[0, 1])

            # Isolation Forest — convert score_samples (higher=normal) to [0,1] fraud
            raw = float(self._if.score_samples(xs)[0])
            if_p = 1.0 / (1.0 + np.exp(raw * 3))   # sigmoid squeeze
            if_p = float(max(0.0, min(1.0, if_p)))

            # XGBoost
            xgb_p = float(self._xgb.predict_proba(xs)[0, 1])

            # CNN (Independent Visual Verification)
            if image_bytes:
                cnn_p = cnn_engine.predict_image(image_bytes) / 100.0
            else:
                # Fallback to mean of others if no image provided
                cnn_p = (rf_p + if_p + xgb_p) / 3.0

            combined = (RF_WEIGHT * rf_p + 
                        IF_WEIGHT * if_p + 
                        XGB_WEIGHT * xgb_p + 
                        CNN_WEIGHT * cnn_p)
            
            combined = max(0.0, min(1.0, combined))
            score_0_100 = int(round(combined * 100))

            confidence = self._confidence(rf_p, if_p, xgb_p, cnn_p)

            return {
                "fraud_score": score_0_100,
                "probabilities": {
                    "rf": rf_p, 
                    "if": if_p, 
                    "xgb": xgb_p,
                    "cnn": cnn_p
                },
                "model_versions": {
                    "rf": RF_VERSION, 
                    "if": IF_VERSION, 
                    "xgb": XGB_VERSION,
                    "cnn": "resnet18-v1"
                },
                "confidence": round(confidence, 3),
            }

    @staticmethod
    def _confidence(rf: float, iso: float, xgb: float, cnn: float) -> float:
        """Low variance across models -> high confidence."""
        arr = np.array([rf, iso, xgb, cnn])
        std = float(np.std(arr))
        return max(0.0, min(1.0, 1.0 - std * 2))
