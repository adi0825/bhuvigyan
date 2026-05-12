from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FarmerLoginRequest(BaseModel):
    mobileNumber: Optional[str] = Field(None, min_length=10, max_length=15)
    mobile: Optional[str] = Field(None, min_length=10, max_length=15)

class FarmerOTPVerifyRequest(BaseModel):
    mobileNumber: Optional[str] = Field(None, min_length=10, max_length=15)
    mobile: Optional[str] = Field(None, min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)
    purpose: Optional[str] = None

class FarmerRegisterRequest(BaseModel):
    mobile: Optional[str] = Field(None, min_length=10, max_length=15)
    mobileNumber: Optional[str] = Field(None, min_length=10, max_length=15, validation_alias="mobileNumber")
    fullName: Optional[str] = None
    full_name: Optional[str] = None
    aadhaar: Optional[str] = None
    father_name: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[datetime] = None
    address: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    district: Optional[str] = None
    state_code: Optional[str] = None
    pincode: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_account: Optional[str] = None
    land_area: Optional[float] = None
    land_unit: Optional[str] = None
    crop_name: Optional[str] = None

class AdminLoginRequest(BaseModel):
    email: str
    password: str
    totpCode: str

class CSCLoginRequest(BaseModel):
    cscId: str
    password: str
    totpCode: str

class OfficerLoginRequest(BaseModel):
    email: str
    otp: str

class InsurerLoginRequest(BaseModel):
    email: str
    password: str

class StateLoginRequest(BaseModel):
    email: str
    password: str
    totp: str