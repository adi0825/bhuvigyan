export const API_BASE_URL = '/api/v1';

export const CROP_TYPES = [
  { value: 'PADDY', label: 'Paddy' },
  { value: 'WHEAT', label: 'Wheat' },
  { value: 'MAIZE', label: 'Maize' },
  { value: 'COTTON', label: 'Cotton' },
  { value: 'SUGARCANE', label: 'Sugarcane' },
  { value: 'SOYBEAN', label: 'Soybean' },
] as const;

export const PRACTICE_TYPES = [
  { value: 'PADDY_STRAW_MANAGEMENT', label: 'Paddy Straw Management', incentive: '₹2,400/Ha' },
  { value: 'ZERO_TILLAGE', label: 'Zero Tillage', incentive: '₹1,800/Ha' },
  { value: 'COVER_CROPPING', label: 'Cover Cropping', incentive: '₹1,200/Ha' },
  { value: 'WATER_MANAGEMENT', label: 'Water Management', incentive: '₹2,000/Ha' },
] as const;

export const CLAIM_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'] as const;