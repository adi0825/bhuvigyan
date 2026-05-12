from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import require_admin_role, require_state_role
from app.services.dossier_service import generate_evidence_dossier
from app.services.pdf_service import generate_pdf_from_dossier
from uuid import UUID as PyUUID

router = APIRouter()

@router.get("/claims/{claim_id}/dossier")
async def get_dossier(
    claim_id: PyUUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    """Get evidence dossier as structured JSON."""
    try:
        dossier = await generate_evidence_dossier(str(claim_id), db)
        return {"success": True, "data": dossier}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/claims/{claim_id}/dossier.pdf")
async def get_dossier_pdf(
    claim_id: PyUUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    """Generate and return evidence dossier PDF."""
    try:
        dossier = await generate_evidence_dossier(str(claim_id), db)
        pdf_path = await generate_pdf_from_dossier(dossier)
        from fastapi.responses import FileResponse
        return FileResponse(
            pdf_path,
            filename=f"dossier-{dossier['claim']['claimNumber']}.pdf",
            media_type="application/pdf",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
