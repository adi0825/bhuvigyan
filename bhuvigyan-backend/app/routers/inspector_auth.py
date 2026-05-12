"""Inspector authentication — login with mobile + password."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.inspector_service import get_inspector_by_mobile
from app.utils.password_utils import verify_password
from app.utils.jwt_utils import create_access_token, create_refresh_token

router = APIRouter()


class InspectorLoginRequest(BaseModel):
    mobile: str
    password: str


@router.post("/login")
async def inspector_login(body: InspectorLoginRequest, db: AsyncSession = Depends(get_db)):
    inspector = await get_inspector_by_mobile(db, body.mobile)
    if not inspector:
        raise HTTPException(status_code=404, detail="Inspector not found")
    if not inspector.is_active:
        raise HTTPException(status_code=403, detail="Inspector account deactivated")
    if not inspector.password_hash or not verify_password(body.password, inspector.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token({
        "userId": str(inspector.id),
        "mobile": inspector.mobile,
        "role": "field_inspector",
    })
    refresh_token = create_refresh_token({"userId": str(inspector.id)})
    return {
        "success": True,
        "data": {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "inspector": {
                "id": str(inspector.id),
                "fullName": inspector.full_name,
                "mobile": inspector.mobile,
                "employeeId": inspector.employee_id,
                "districts": inspector.districts_assigned,
            },
        },
    }
