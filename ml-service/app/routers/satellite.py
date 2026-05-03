"""POST /satellite/analyze — synchronous endpoint called by Spring claims-service."""
from fastapi import APIRouter, Depends, Header, HTTPException, status

from ..schemas import AnalyzeRequest
from ..service import SatelliteAnalysisService
from ..settings import get_settings, set_gee_mode, get_gee_mode

router = APIRouter(prefix="/satellite", tags=["satellite"])

_service: SatelliteAnalysisService | None = None


def _get_service() -> SatelliteAnalysisService:
    global _service
    if _service is None:
        _service = SatelliteAnalysisService()
    return _service


def _verify_internal(x_internal_key: str | None = Header(default=None)) -> None:
    expected = get_settings().ml_service_internal_key
    if not x_internal_key or x_internal_key != expected:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid X-Internal-Key")


@router.post("/analyze")
def analyze(req: AnalyzeRequest, _=Depends(_verify_internal)):
    return _get_service().analyze(req.model_dump(mode="json"))


@router.get("/health")
def health():
    return {"ok": True}


@router.post("/dev/toggle-gee")
def toggle_gee(payload: dict, _=Depends(_verify_internal)):
    mode = (payload or {}).get("mode", "dev").lower()
    if mode not in ("dev", "real"):
        mode = "dev"
    set_gee_mode(mode)
    return {"success": True, "gee_mode": get_gee_mode()}


@router.get("/dev/gee-mode")
def gee_mode_current(_=Depends(_verify_internal)):
    return {"gee_mode": get_gee_mode()}
