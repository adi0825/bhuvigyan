export type Role =
  | 'FARMER'
  | 'CSC_OPERATOR'
  | 'FIELD_OFFICER'
  | 'INSURER'
  | 'ADMIN'
  | 'SYSOP'
  | 'SUPER_ADMIN'
  | 'STATE_HEAD'
  | 'DC'
  | 'DISTRICT_OFFICER'
  | 'FIELD_INSPECTOR'
  | 'ANALYST';

export interface AuthUser {
  userId: string;
  mobile?: string;
  email?: string;
  role: Role;
  fullName?: string;
  company?: string;
}

export interface Farmer {
  id: string;
  fullName: string;
  mobile: string;
  carbonEligible: boolean;
  carbonEnrolled: boolean;
}

export interface LandData {
  udlrn: string;
  landAreaHa: number;
  declaredCrop: string;
  isFrozen: boolean;
  carbonScore: number;
  farmerName?: string;
  state?: string;
  district?: string;
  taluk?: string;
  village?: string;
  season?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface CarbonData {
  eligible: boolean;
  enrolled: boolean;
  practiceType: string | null;
  estimatedCredits: number;
  landAreaHa?: number;
  monthlyNdvi: { month: string; ndvi: number; label?: string; date?: string }[];
  carbonScore?: number;
  currentNdvi?: number;
  practices?: Array<{ key: string; label: string; icon: string; creditsPerHa: number; estimatedCredits: number; description: string }>;
  marketPrice?: number;
  estimatedAnnualIncome?: number;
  reason?: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  udlrn: string;
  farmerId: string;
  farmerName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  fraudScore: number;
  createdAt: string;
  updatedAt: string;
  district?: string;
  crop?: string;
}

export interface ServiceHealth {
  name: string;
  port: number;
  url: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  responseTime: number;
  lastChecked: string;
}

export interface AdminStats {
  totalFarmers: number;
  activeClaims: number;
  fraudAlerts: number;
  carbonEnrolled: number;
  pendingVisits: number;
  autoApproved: number;
  autoRejected: number;
  firPending: number;
  reviewNeeded: number;
  visitsCompleted: number;
  todayClaims?: number;
  todayFarmers?: number;
  pendingReview?: number;
  highRiskClaims?: number;
}

export interface Location {
  id: string;
  name: string;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface FarmerProfile {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  isVerified?: boolean;
  stateCode?: string;
  districtCode?: string;
  district?: string;
  taluk?: string;
  village?: string;
  hobli?: string;
  udlrn?: string;
  landAreaHa?: number;
  declaredCrop?: string;
  surveyNumber?: string;
  latitude?: number;
  longitude?: number;
  farm_lat?: number;
  farm_lng?: number;
  bankAccount?: string;
  bankIfsc?: string;
  bankName?: string;
  carbonEligible?: boolean;
  carbonEnrolled?: boolean;
  notificationPrefs?: { inApp: boolean; sms: boolean; whatsapp: boolean };
  landHoldings?: Array<{ udlrn: string; areaHa: number; landUse: string; crop: string }>;
  createdAt?: string;
}

export interface ClaimDetail extends Claim {
  landDetails?: LandData;
  ndviData?: { month: string; ndvi: number }[];
  fraudSignals?: FraudSignal[];
  timeline?: TimelineEvent[];
}

export interface FraudSignal {
  signal: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  confidence: number;
  description: string;
}

export interface TimelineEvent {
  stage: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  timestamp?: string;
  description?: string;
}

export interface SystemMode {
  mode: 'DOCKER' | 'LOCAL';
  uptime?: number;
  version?: string;
}

export interface EnrolmentRequest {
  practiceType: 'PADDY_STRAW_MANAGEMENT' | 'ZERO_TILLAGE' | 'COVER_CROPPING' | 'WATER_MANAGEMENT';
}

export interface CscRegistrationRequest {
  fullName: string;
  mobile: string;
  stateId: string;
  districtId: string;
  talukId: string;
  hobliId: string;
  villageId: string;
  landAreaHa: number;
  declaredCrop: string;
}

export interface CscRegistrationResponse {
  farmerId: string;
  udlrn: string;
  devOtp?: string;
}

export interface Officer {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  assignedArea?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface FilterOptions {
  state?: string;
  district?: string;
  scoreMin?: number;
  scoreMax?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ChartDataPoint {
  month: string;
  ndvi?: number;
  count?: number;
  value?: number;
}

export interface ClaimsByStatus {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  UNDER_REVIEW: number;
}

export interface FraudDistribution {
  range: string;
  count: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CceVisit {
  id: string;
  claimId: string;
  claimNumber: string;
  udlrn: string;
  farmerName: string;
  farmerMobile: string;
  village: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedAt: string;
  dueBy: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  gpsCheckinLat?: number;
  gpsCheckinLng?: number;
  distanceFromPlotMeters?: number;
  actualAreaHa?: number;
  actualCropCondition?: string;
  yieldEstimateKgPerHa?: number;
  cceVerdict?: string;
  inspectorNotes?: string;
  photoUrls?: string[];
}

export interface CceVisitPhoto {
  id: string;
  visitId: string;
  photoUrl: string;
  photoType: string;
  capturedAt: string;
  lat?: number;
  lng?: number;
  caption?: string;
}

export interface VaoAlert {
  id: string;
  udlrn: string;
  farmerName?: string;
  farmerMobile?: string;
  alertType: 'RTC_MUTATION' | 'NDVI_CONTRADICTION' | 'DUPLICATE_CLAIM' | 'AREA_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectionSource: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
  assignedTahasildar?: string;
  createdAt: string;
}

export interface FirAlert {
  id: string;
  claimId: string;
  claimNumber: string;
  udlrn: string;
  districtCode: string;
  districtName?: string;
  farmerName?: string;
  farmerMobile?: string;
  fraudScore: number;
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISMISSED';
  filedAt: string;
  filedBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  policeStation?: string;
  dcNotes?: string;
}

export interface DistrictHeatmapEntry {
  districtCode: string;
  districtName: string;
  blockName?: string;
  totalClaims: number;
  fraudCount: number;
  fraudRate: number;
  totalClaimAmount?: number;
  flaggedAmount?: number;
  riskScore?: number;
  riskCategory?: string;
  inspectorCount?: number;
  activeVisits?: number;
  topFraudType?: string;
  color?: string;
}

export interface Settlement {
  id: string;
  claimId: string;
  claimNumber: string;
  farmerId: string;
  farmerName: string;
  udlrn: string;
  settlementAmount: number;
  paymentReference?: string;
  paymentMode?: string;
  paymentDate?: string;
  bankAccount?: string;
  ifscCode?: string;
  npciRefId?: string;
  utrNumber?: string;
  status: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  rejectionReason?: string;
  createdAt: string;
}

export interface DisasterEvent {
  id: string;
  districtCode: string;
  districtName?: string;
  talukId?: string;
  eventType: string;
  severity: string;
  farmerCount?: number;
  totalAreaHa?: number;
  estimatedLossCr?: number;
  startDate: string;
  endDate?: string;
  imdConfirmation?: boolean;
  satelliteConfirmed?: boolean;
  source?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface SatelliteEvidence {
  claimId: string;
  trueColorImageUrl?: string;
  ndviMapUrl?: string;
  lossMapUrl?: string;
  ndviAtSowing?: number;
  ndviAtClaim?: number;
  ndviLossPct?: number;
  ndviTimeline?: { month: string; ndvi: number }[];
  satellitePassTimestamp?: string;
  dataSource?: string;
}

export interface FarmerDashboard {
  fullName: string;
  mobile: string;
  udlrn: string;
  landAreaHa: number;
  declaredCrop: string;
  carbonScore: number;
  carbonEligible: boolean;
  carbonEnrolled: boolean;
  isFrozen: boolean;
  unreadNotifications: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
}

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'OFFICER_REVIEW' | 'CCE_VISIT' | 'REJECTED_FRAUD' | 'APPEALED';

export interface ClaimsByStatusCount {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  UNDER_REVIEW: number;
  OFFICER_REVIEW: number;
  CCE_VISIT: number;
}

export interface VerdictDistribution {
  label: string;
  count: number;
  color: string;
}

export interface ClaimVolumeData {
  date: string;
  count: number;
  approved: number;
  rejected: number;
}

// ── FIELD OFFICER PORTAL TYPES ──

export interface FieldOfficer {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  district?: string;
  designation?: string;
  employeeId?: string;
  mobile?: string;
}

export interface OfficerLoginResponse {
  accessToken: string;
  officer: FieldOfficer;
}

export interface OfficerStats {
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  approvedCount: number;
  rejectedCount: number;
  todayVisits: number;
}

export type VisitStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Recommendation = 'APPROVE' | 'REJECT' | 'REVIEW';

export interface OfficerVisit {
  id: string;
  visitNumber: string;
  claimId: string;
  claimNumber: string;
  farmerName?: string;
  farmerMobile?: string;
  udlrn?: string;
  village?: string;
  district?: string;
  taluk?: string;
  scheduledDate?: string;
  assignedAt?: string;
  dueBy?: string;
  status: VisitStatus;
  declaredCrop?: string;
  landAreaHa?: number | null;
  fraudScore?: number | null;
  recommendation?: Recommendation | null;
  damagePercent?: number | null;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  gpsCheckinLat?: number;
  gpsCheckinLng?: number;
  distanceFromPlotMeters?: number;
  actualAreaHa?: number;
  actualCropCondition?: string;
  cceVerdict?: string;
  inspectorNotes?: string;
  yieldEstimateKgPerHa?: number;
}

export interface VisitDetail {
  id: string;
  visitNumber: string;
  claimId: string;
  claimNumber: string;
  claimStatus?: string;
  udlrn?: string;
  status: VisitStatus;
  scheduledDate?: string;
  visitDate?: string | null;
  priority: string;
  notesToOfficer?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  landGpsLat?: number | null;
  landGpsLng?: number | null;
  gpsMatch?: boolean | null;
  distanceMeters?: number | null;
  cropFound?: string | null;
  cropMatch?: boolean | null;
  yieldEstimate?: number | null;
  damagePercent?: number | null;
  damageCause?: string | null;
  areaVisitedHa?: number | null;
  remarks?: string | null;
  recommendation?: Recommendation | null;
  checklist: ChecklistItem[];
  fraudScore?: number | null;
  declaredCrop?: string;
  landAreaHa?: number | null;
  isFrozen?: boolean;
  carbonScore?: number | null;
  ndviSowing?: number | null;
  ndviClaim?: number | null;
  farmer?: {
    id?: string;
    fullName?: string;
    mobile?: string;
    carbonEligible?: boolean;
    carbonEnrolled?: boolean;
  };
  officer?: {
    fullName?: string;
    designation?: string;
  };
  location?: {
    district?: string;
    taluk?: string;
    village?: string;
  };
  photos: VisitPhoto[];
}

export interface VisitPhoto {
  id: string;
  photoUrl: string;
  photoType?: string;
  caption?: string;
  takenAt?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface GpsVerificationResult {
  gpsMatch: boolean;
  distanceMeters: number;
  message: string;
}

export interface InspectionFormData {
  cropFound: string;
  cropMatch: boolean;
  yieldEstimate?: number;
  damagePercent: number;
  damageCause: string;
  areaVisitedHa: number;
  remarks: string;
  recommendation: Recommendation;
  checklist: ChecklistItem[];
}

// ── DISASTER MODE TYPES ──

export interface DisasterEventActive {
  id: string;
  eventName: string;
  disasterType: string;
  affectedDistricts: string[];
  startDate: string;
  endDate: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  declaredAt: string;
  autoApproved: number;
  flaggedOutliers: number;
  estimatedPayout: number;
}

// ── ADMIN VISIT TYPES ──

export interface AdminVisit {
  id: string;
  visit_number: string;
  claim_id?: string;
  claim_number?: string;
  farmer_name?: string;
  officer_name?: string;
  officer_email?: string;
  designation?: string;
  district_name?: string;
  status: VisitStatus;
  scheduled_date?: string;
  created_at?: string;
}