import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Sprout, AlertCircle, Loader2, Satellite,
  TrendingUp, Crosshair, ChevronRight,
  Info, CheckCircle2, AlertTriangle, Navigation, Plus, Download, Trash2,
  ChevronLeft, X, MapPinned, Crop, Clock, Zap
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, PieChart, Pie, Cell
} from 'recharts';
import GovCard from '../../components/ui/GovCard';
import EmptyState from '../../components/ui/EmptyState';
import GovButton from '../../components/ui/GovButton';
import { useAuth } from '../../auth/AuthContext';
import { useMyLand } from '../../hooks/useMyLand';
import { myLandApi, type LandHolding, type SatelliteVerification, type VillageGeocodeResult } from '../../api/myLand';
import 'leaflet/dist/leaflet.css';

const HA_TO_ACRES = 2.47105;
function haToAcres(ha: number | string | undefined | null): string {
  const n = typeof ha === 'number' ? ha : parseFloat(ha || '0');
  if (isNaN(n) || n <= 0) return '—';
  return (n * HA_TO_ACRES).toFixed(2);
}

function ndviColor(val: number): string {
  if (val >= 0.6) return '#16a34a';
  if (val >= 0.4) return '#84cc16';
  if (val >= 0.2) return '#eab308';
  return '#dc2626';
}

function ndviLabel(val: number): string {
  if (val >= 0.6) return 'Excellent';
  if (val >= 0.4) return 'Good';
  if (val >= 0.2) return 'Fair';
  return 'Poor';
}

const CROP_COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d', '#65a30d'];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const SURVEY_LABELS: Record<string, string> = {
  'Andhra Pradesh': 'Survey Number', 'Telangana': 'Survey Number',
  'Karnataka': 'Survey Number', 'Maharashtra': '7-12 Number / Gat Number',
  'Madhya Pradesh': 'Khasra Number', 'Rajasthan': 'Khasra Number',
  'Uttar Pradesh': 'Khasra Number', 'Gujarat': 'Survey Number / Gat Number',
  'Punjab': 'Khasra Number', 'Haryana': 'Khasra Number',
  'Tamil Nadu': 'Survey Number', 'Kerala': 'Survey Number',
  'Odisha': 'Plot Number', 'Bihar': 'Khasra Number',
  'Chhattisgarh': 'Khasra Number', 'Jharkhand': 'Khasra Number',
  'West Bengal': 'Dag Number', 'Assam': 'Patta Number',
};

function LayerController({ activeLayer }: { activeLayer: string }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); }, 100);
  }, [activeLayer, map]);
  return null;
}

// ─── ADD LAND HOLDING MODAL ────────────────────────────────────────────────

interface AddLandHoldingModalProps {
  farmerId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddLandHoldingModal({ farmerId, onClose, onAdded }: AddLandHoldingModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 fields
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [taluk, setTaluk] = useState('');
  const [village, setVillage] = useState('');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [landAreaAcres, setLandAreaAcres] = useState('');

  // Bhuvan auto-suggest
  const [villageSuggestions, setVillageSuggestions] = useState<VillageGeocodeResult | null>(null);
  const [villageSearching, setVillageSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2 fields
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationVerify, setLocationVerify] = useState<any>(null);
  const [verifyingCoords, setVerifyingCoords] = useState(false);

  // Step 3 fields
  const [declaredCrop, setDeclaredCrop] = useState('');
  const [season, setSeason] = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [hasMultipleCrops, setHasMultipleCrops] = useState(false);
  const [secondaryCrop, setSecondaryCrop] = useState('');

  const surveyLabel = SURVEY_LABELS[state] || 'Survey Number';

  // Village auto-suggest with debounce
  const handleVillageInput = useCallback((value: string) => {
    setVillage(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setVillageSuggestions(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setVillageSearching(true);
      try {
        const res = await myLandApi.villageGeocode(value);
        const data = (res.data as any)?.data || res.data;
        setVillageSuggestions(data);
      } catch { setVillageSuggestions(null); }
      finally { setVillageSearching(false); }
    }, 500);
  }, []);

  const selectVillage = (v: { village_name: string; district: string; taluk: string; latitude: number | null; longitude: number | null }) => {
    setVillage(v.village_name);
    if (v.district) setDistrict(v.district);
    if (v.taluk) setTaluk(v.taluk);
    if (v.latitude != null) setLatitude(String(v.latitude));
    if (v.longitude != null) setLongitude(String(v.longitude));
    setVillageSuggestions(null);
  };

  const verifyCoords = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || !village || !district) return;
    setVerifyingCoords(true);
    try {
      const res = await myLandApi.verifyCoordinates(lat, lng, village, district);
      const data = (res.data as any)?.data || res.data;
      setLocationVerify(data);
    } catch { setLocationVerify({ verified: false, match: false, reason: 'Verification failed' }); }
    finally { setVerifyingCoords(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await myLandApi.addLandHolding({
        farmer_id: farmerId,
        state, district, taluk, village, survey_number: surveyNumber,
        land_area_acres: landAreaAcres ? parseFloat(landAreaAcres) : undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        declared_crop: declaredCrop || undefined,
        season: season || undefined,
        sowing_date: sowingDate || undefined,
        has_multiple_crops: hasMultipleCrops,
        secondary_crop: secondaryCrop || undefined,
      });
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to add land holding');
    } finally { setSubmitting(false); }
  };

  const canProceedStep1 = state && district && taluk && village && surveyNumber;
  const canSubmit = canProceedStep1;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a1a]">Add Land Holding</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[#1a6b3c]' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {step === 1 && (
            <>
              <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2"><MapPinned className="w-4 h-4 text-[#1a6b3c]" /> Land Identity</h3>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">State</label>
                <select value={state} onChange={e => setState(e.target.value)} className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">District</label>
                <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Enter district" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Taluk / Mandal</label>
                <input value={taluk} onChange={e => setTaluk(e.target.value)} placeholder="Enter taluk or mandal" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
              </div>
              <div className="relative">
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Village</label>
                <div className="relative">
                  <input value={village} onChange={e => handleVillageInput(e.target.value)} placeholder="Type village name" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c] pr-8" />
                  {villageSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#1a6b3c]" />}
                </div>
                {villageSuggestions?.found && villageSuggestions.villages && villageSuggestions.villages.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {villageSuggestions.villages.slice(0, 8).map((v, i) => (
                      <button key={i} onClick={() => selectVillage(v)} className="w-full text-left p-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                        <p className="text-sm font-medium text-[#1a1a1a]">{v.village_name}</p>
                        <p className="text-[10px] text-[#6b7280]">{v.taluk}, {v.district}, {v.state}</p>
                      </button>
                    ))}
                  </div>
                )}
                {villageSuggestions && !villageSuggestions.found && village && village.length >= 3 && (
                  <p className="text-[10px] text-amber-600 mt-1">{villageSuggestions.error || 'Village not found. Please verify or add coordinates manually.'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">{surveyLabel}</label>
                <input value={surveyNumber} onChange={e => setSurveyNumber(e.target.value)} placeholder={`Enter ${surveyLabel.toLowerCase()}`} className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Land Area (acres)</label>
                <input type="number" value={landAreaAcres} onChange={e => setLandAreaAcres(e.target.value)} placeholder="Optional" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2"><Crosshair className="w-4 h-4 text-[#1a6b3c]" /> Location Pin</h3>
              <p className="text-xs text-[#6b7280]">Optional: Add coordinates to improve satellite accuracy.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Latitude</label>
                  <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="e.g. 12.9716" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Longitude</label>
                  <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="e.g. 77.5946" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
                </div>
              </div>
              {latitude && longitude && village && district && (
                <div>
                  <GovButton variant="outline" size="sm" onClick={verifyCoords} loading={verifyingCoords}>
                    <Navigation className="w-3 h-3 mr-1" /> Verify Location
                  </GovButton>
                  {locationVerify && (
                    <div className={`mt-2 p-2.5 rounded-lg text-xs ${locationVerify.match ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-orange-50 border border-orange-200 text-orange-700'}`}>
                      {locationVerify.match ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      {locationVerify.reason}
                    </div>
                  )}
                </div>
              )}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-[10px] text-blue-700"><Info className="w-3 h-3 inline mr-1" />You can also draw your land boundary on the map after adding the holding.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2"><Crop className="w-4 h-4 text-[#1a6b3c]" /> Crop Details</h3>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Current Crop</label>
                <input value={declaredCrop} onChange={e => setDeclaredCrop(e.target.value)} placeholder="e.g. Paddy, Sugarcane, Wheat" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Season</label>
                <select value={season} onChange={e => setSeason(e.target.value)} className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]">
                  <option value="">Select season</option>
                  <option value="Kharif">Kharif (Jun–Oct)</option>
                  <option value="Rabi">Rabi (Nov–Mar)</option>
                  <option value="Zaid">Zaid (Apr–Jun)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Approximate Sowing Date</label>
                <input type="date" value={sowingDate} onChange={e => setSowingDate(e.target.value)} className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-[#6b7280]">Are there multiple crops on this land?</label>
                <button onClick={() => setHasMultipleCrops(!hasMultipleCrops)} className={`px-3 py-1 rounded-full text-xs font-bold ${hasMultipleCrops ? 'bg-[#1a6b3c] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {hasMultipleCrops ? 'Yes' : 'No'}
                </button>
              </div>
              {hasMultipleCrops && (
                <div>
                  <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Secondary Crop</label>
                  <input value={secondaryCrop} onChange={e => setSecondaryCrop(e.target.value)} placeholder="e.g. Tur, Soybean" className="w-full mt-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c]" />
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2"><Satellite className="w-4 h-4 text-[#1a6b3c]" /> Satellite Verification</h3>
              <p className="text-xs text-[#6b7280]">Review your land holding details before triggering satellite analysis.</p>
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {[
                  { label: 'State', value: state },
                  { label: 'District', value: district },
                  { label: 'Taluk/Mandal', value: taluk },
                  { label: 'Village', value: village },
                  { label: surveyLabel, value: surveyNumber },
                  { label: 'Area', value: landAreaAcres ? `${landAreaAcres} acres` : '—' },
                  { label: 'Coordinates', value: latitude && longitude ? `${latitude}, ${longitude}` : 'Not provided' },
                  { label: 'Crop', value: declaredCrop || '—' },
                  { label: 'Season', value: season || '—' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-[#6b7280]">{item.label}</span>
                    <span className="font-medium text-[#1a1a1a]">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-[#f0fdf4] rounded-lg border border-green-100">
                <p className="text-xs text-[#1a6b3c]"><Zap className="w-3 h-3 inline mr-1" />Click "Verify My Land with Satellite" to start the analysis. This will fetch real satellite data and run multi-crop detection.</p>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            {step > 1 ? (
              <GovButton variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </GovButton>
            ) : <div />}
            {step < 4 ? (
              <GovButton variant="primary" size="sm" onClick={() => setStep(step + 1)} disabled={step === 1 && !canProceedStep1}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </GovButton>
            ) : (
              <GovButton variant="primary" size="sm" onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
                <Satellite className="w-4 h-4 mr-1" /> Verify My Land with Satellite
              </GovButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CROP MIX DONUT CHART ───────────────────────────────────────────────────

function CropMixChart({ crops }: { crops: Array<{ name: string; percentage: number }> }) {
  const data = crops.map(c => ({ name: c.name, value: c.percentage }));
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
              {data.map((_, i) => <Cell key={i} fill={CROP_COLORS[i % CROP_COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 flex-1">
        {crops.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CROP_COLORS[i % CROP_COLORS.length] }} />
            <span className="text-[#1a1a1a] font-medium truncate">{c.name}</span>
            <span className="text-[#6b7280] ml-auto">{c.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NDVI ZONE TIMELINE CHART ───────────────────────────────────────────────

function NDVIZoneChart({ zoneLines, timeseries }: { zoneLines: Array<{ zone: string; color: string; data: Array<{ date: string; ndvi: number }> }>; timeseries: Array<{ date: string; ndvi_mean: number }> }) {
  // If we have zone lines, use those. Otherwise use the main timeseries.
  if (zoneLines && zoneLines.length > 0) {
    // Merge all zone data points into a unified timeline keyed by date
    const allDates = new Set<string>();
    zoneLines.forEach(zl => zl.data.forEach(d => allDates.add(d.date)));
    const sortedDates = Array.from(allDates).sort();
    const chartData = sortedDates.map(date => {
      const point: any = { date };
      zoneLines.forEach(zl => {
        const match = zl.data.find(d => d.date === date);
        point[zl.zone] = match ? match.ndvi : null;
      });
      return point;
    });

    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
          <YAxis domain={[-0.2, 1.0]} stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
          <Tooltip />
          <ReferenceArea y1={0.0} y2={0.1} fill="#fef2f2" fillOpacity={0.3} />
          <ReferenceArea y1={0.1} y2={0.3} fill="#fffbeb" fillOpacity={0.3} />
          <ReferenceArea y1={0.3} y2={0.6} fill="#f0fdf4" fillOpacity={0.3} />
          <ReferenceArea y1={0.6} y2={1.0} fill="#dcfce7" fillOpacity={0.3} />
          {zoneLines.map((zl, i) => (
            <Line key={i} type="monotone" dataKey={zl.zone} stroke={zl.color} strokeWidth={2} dot={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Fallback: single-line timeseries
  if (timeseries && timeseries.length > 0) {
    const data = timeseries.map(t => ({ date: t.date, ndvi: t.ndvi_mean }));
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
          <YAxis domain={[-0.2, 1.0]} stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
          <Tooltip />
          <ReferenceArea y1={0.0} y2={0.1} fill="#fef2f2" fillOpacity={0.3} />
          <ReferenceArea y1={0.1} y2={0.3} fill="#fffbeb" fillOpacity={0.3} />
          <ReferenceArea y1={0.3} y2={0.6} fill="#f0fdf4" fillOpacity={0.3} />
          <ReferenceArea y1={0.6} y2={1.0} fill="#dcfce7" fillOpacity={0.3} />
          <Line type="monotone" dataKey="ndvi" stroke="#1a6b3c" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return <p className="text-xs text-[#6b7280] text-center py-8">No NDVI timeline data available</p>;
}

// ─── LAND PROFILE CARD ──────────────────────────────────────────────────────

function LandProfileCard({ holding, verification, onVerify, onDownload, onDelete, verifying }: {
  holding: LandHolding;
  verification: SatelliteVerification | null;
  onVerify: () => void;
  onDownload: () => void;
  onDelete: () => void;
  verifying: boolean;
}) {
  const [activeMapLayer, setActiveMapLayer] = useState<'satellite' | 'rgb' | 'ndvi'>('satellite');
  const v = verification;
  const hasCoords = holding.latitude != null && holding.longitude != null;
  const center = { lat: holding.latitude ?? 12.97, lng: holding.longitude ?? 77.59 };

  return (
    <GovCard className="p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#1a1a1a]">{holding.label}</h3>
          <p className="text-xs text-[#6b7280]">Survey No. {holding.survey_number}, {holding.village}, {holding.district}</p>
        </div>
        <div className="flex items-center gap-2">
          {v ? (
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
              v.verification_status === 'Auto-verified' ? 'bg-green-100 text-green-700' :
              v.verification_status === 'Anomaly detected' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>{v.verification_status}</span>
          ) : (
            <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-gray-100 text-gray-500">Pending</span>
          )}
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-6 p-4">
        {/* Left column — stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Area + NDVI + Moisture summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#f0fdf4] rounded-lg border border-green-100 text-center">
              <p className="text-[10px] text-[#6b7280] uppercase font-semibold">Area</p>
              <p className="text-lg font-bold text-[#1a1a1a]">{v?.area_verified_ha ? haToAcres(v.area_verified_ha) : holding.land_area_acres ? `${holding.land_area_acres}` : '—'}</p>
              <p className="text-[10px] text-[#9ca3af]">{v?.area_verified_ha ? `${v.area_verified_ha} ha` : 'acres'}</p>
            </div>
            <div className="p-3 rounded-lg border text-center" style={{ borderColor: v?.ndvi_mean ? ndviColor(v.ndvi_mean) + '30' : '#e5e7eb', background: v?.ndvi_mean ? ndviColor(v.ndvi_mean) + '10' : '#f9fafb' }}>
              <p className="text-[10px] text-[#6b7280] uppercase font-semibold">NDVI</p>
              <p className="text-lg font-bold" style={{ color: v?.ndvi_mean ? ndviColor(v.ndvi_mean) : '#1a1a1a' }}>{v?.ndvi_mean ? v.ndvi_mean.toFixed(2) : '—'}</p>
              <p className="text-[10px] text-[#9ca3af]">{v?.ndvi_status || 'No data'}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
              <p className="text-[10px] text-[#6b7280] uppercase font-semibold">Moisture</p>
              <p className="text-sm font-bold text-blue-700">{v?.soil_moisture || '—'}</p>
              <p className="text-[10px] text-[#9ca3af]">{v?.last_satellite_date || 'No scan'}</p>
            </div>
          </div>

          {/* Area match */}
          {v?.area_match_status && (
            <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${v.area_match_status === 'Matched' ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
              {v.area_match_status === 'Matched' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              Area: {v.area_match_status} (declared {v.area_declared_ha?.toFixed(2)} ha, verified {v.area_verified_ha?.toFixed(2)} ha)
            </div>
          )}

          {/* Crop Mix */}
          {v?.crop_mix && v.crop_mix.crops.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[#1a1a1a] flex items-center gap-1"><Sprout className="w-3 h-3 text-[#1a6b3c]" /> Crop Mix</h4>
                {/* Confidence badge */}
                {v.crop_mix.confidence != null && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    v.crop_mix.confidence >= 0.75 ? 'bg-green-100 text-green-700' :
                    v.crop_mix.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {v.crop_mix.confidence >= 0.75 ? 'High Confidence' :
                     v.crop_mix.confidence >= 0.5 ? 'Medium Confidence' :
                     'Low Confidence'}
                    {' '}({Math.round((v.crop_mix.confidence || 0) * 100)}%)
                  </span>
                )}
              </div>
              <CropMixChart crops={v.crop_mix.crops} />

              {/* Mixed-crop / uncertainty banner */}
              {v.crop_mix.crops.length > 1 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-[10px] text-blue-700 flex items-start gap-1">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Multiple crop signatures detected. Primary: {v.crop_mix.crops[0]?.name} ({v.crop_mix.crops[0]?.percentage}%). Mixed-crop field — review recommended.</span>
                </div>
              )}

              {v.crop_mix.confidence < 0.6 && v.crop_mix.flag && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{v.crop_mix.flag}
                </div>
              )}
              {v.crop_mix.intercropping && (
                <p className="text-[10px] text-[#1a6b3c] mt-1"><CheckCircle2 className="w-3 h-3 inline mr-1" />Intercropping detected</p>
              )}
            </div>
          )}

          {/* Data unavailable state */}
          {(!v?.crop_mix || v.crop_mix.crops.length === 0) && v && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-xs text-gray-500 font-medium">Crop data unavailable</p>
              <p className="text-[10px] text-gray-400 mt-1">Latest satellite observation not found. Cloud cover may be blocking optical sensors, or the area is outside current coverage. Try again later or use cached observation.</p>
            </div>
          )}

          {/* Anomalies */}
          {v?.anomalies && v.anomalies.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[#1a1a1a] mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> Anomaly Alerts</h4>
              <div className="space-y-1.5">
                {v.anomalies.map((a, i) => (
                  <div key={i} className={`p-2 rounded-lg text-[10px] flex items-start gap-1.5 ${a.severity === 'high' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{a.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Truth Packet Panel */}
          {v?.truth_packet && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => {}}
                className="w-full px-3 py-2 bg-gray-50 flex items-center justify-between text-xs font-bold text-[#1a1a1a] hover:bg-gray-100"
              >
                <span className="flex items-center gap-1"><Info className="w-3 h-3 text-[#1a6b3c]" /> Truth Packet</span>
                <span className="text-[10px] text-gray-500 font-normal">Evidence summary</span>
              </button>
              <div className="p-3 space-y-2 text-[10px]">
                {/* Evidence layers */}
                {(() => {
                  const tp = v.truth_packet as any;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-green-50 rounded border border-green-100">
                          <span className="text-green-700 font-semibold">Location</span>
                          <p className="text-gray-600 mt-0.5">{tp?.land_identity?.village}, {tp?.land_identity?.district}</p>
                          <p className="text-gray-500">Survey No: {tp?.land_identity?.survey_number}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded border border-blue-100">
                          <span className="text-blue-700 font-semibold">Satellite Source</span>
                          <p className="text-gray-600 mt-0.5">{tp?.satellite_data?.source || 'N/A'}</p>
                          <p className="text-gray-500">Scenes: {tp?.satellite_data?.scenes_count || 0}</p>
                        </div>
                      </div>
                      {/* Confidence & flags */}
                      {tp?.verification?.flags && tp.verification.flags.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-semibold text-gray-700">Flags & Uncertainty:</span>
                          {tp.verification.flags.map((flag: any, i: number) => (
                            <div key={i} className={`flex items-start gap-1 p-1.5 rounded ${flag.severity === 'info' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{flag.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Recommendation */}
                      {tp?.verification?.recommendation && (
                        <div className="p-2 bg-gray-50 rounded border border-gray-100 text-gray-600">
                          <span className="font-semibold text-gray-700">Recommendation:</span>{' '}
                          {tp.verification.recommendation}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Verify button / Progress */}
          {!v ? (
            <div>
              <GovButton variant="primary" fullWidth onClick={onVerify} loading={verifying}>
                <Satellite className="w-4 h-4 mr-2" /> {verifying ? 'Analyzing crop patterns...' : 'Verify My Land with Satellite'}
              </GovButton>
              {verifying && (
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wide">Pipeline Progress</p>
                  <div className="space-y-1">
                    {[
                      { step: 'village_resolution', label: 'Resolving village' },
                      { step: 'aoi_geometry', label: 'Building AOI geometry' },
                      { step: 'scene_search', label: 'Searching satellite scenes' },
                      { step: 'ndvi_computation', label: 'Computing NDVI' },
                      { step: 'soil_moisture', label: 'Fetching soil moisture' },
                      { step: 'crop_classification', label: 'Classifying crops' },
                      { step: 'ndvi_timeline', label: 'Building NDVI timeline' },
                      { step: 'historical_baseline', label: 'Checking historical baseline' },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <div className={`w-1.5 h-1.5 rounded-full ${i < 3 ? 'bg-[#1a6b3c]' : i === 3 ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`} />
                        <span className={i < 3 ? 'text-[#1a6b3c] font-medium' : 'text-[#9ca3af]'}>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <GovButton variant="outline" size="sm" onClick={onVerify}>
                <Satellite className="w-3 h-3 mr-1" /> Re-verify
              </GovButton>
              <GovButton variant="outline" size="sm" onClick={onDownload}>
                <Download className="w-3 h-3 mr-1" /> Download Land Profile
              </GovButton>
            </div>
          )}

          {/* Radar fallback notice */}
          {v?.used_radar_fallback && (
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-700 flex items-center gap-1">
              <Info className="w-3 h-3" /> Optical data unavailable due to cloud cover. Radar data used.
            </div>
          )}

          {/* Source info */}
          {v?.source && (
            <div className="flex items-center gap-1 text-[10px] text-[#9ca3af]">
              <Clock className="w-3 h-3" />
              Live data fetched on {v.last_satellite_date || '—'} · Source: {v.source}
            </div>
          )}
        </div>

        {/* Right column — Map + NDVI Chart */}
        <div className="lg:col-span-3 space-y-4">
          {/* Map */}
          <div className="h-80 rounded-lg overflow-hidden border border-gray-200 relative">
            {hasCoords ? (
              <MapContainer center={[center.lat, center.lng]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                <LayerController activeLayer={activeMapLayer} />
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                {v?.tile_urls?.ndvi && activeMapLayer === 'ndvi' && <TileLayer url={v.tile_urls.ndvi} opacity={0.8} />}
                <Circle center={[center.lat, center.lng]} radius={200} pathOptions={{ color: '#1a6b3c', fillColor: '#1a6b3c', fillOpacity: 0.15, weight: 2, dashArray: '5, 5' }} />
                <Marker position={[center.lat, center.lng]}>
                  <Popup><div className="text-xs font-bold">Survey No: {holding.survey_number}</div></Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100">
                <MapPin className="w-8 h-8 opacity-30" />
              </div>
            )}
            {/* Layer toggle */}
            <div className="absolute top-2 right-2 flex gap-1 bg-white/90 rounded-lg p-1 shadow-sm">
              {(['satellite', 'ndvi'] as const).map(layer => (
                <button key={layer} onClick={() => setActiveMapLayer(layer)} className={`text-[9px] font-bold px-2 py-1 rounded ${activeMapLayer === layer ? 'bg-[#1a6b3c] text-white' : 'text-gray-500'}`}>
                  {layer === 'satellite' ? 'Sat' : 'NDVI'}
                </button>
              ))}
            </div>
          </div>

          {/* NDVI Zone Timeline */}
          <div>
            <h4 className="text-xs font-bold text-[#1a1a1a] mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[#1a6b3c]" /> NDVI Timeline</h4>
            <div className="bg-white rounded-lg border border-gray-200 p-2">
              <NDVIZoneChart zoneLines={v?.zone_lines || []} timeseries={v?.ndvi_timeseries || []} />
              {/* Reference band legend */}
              <div className="flex items-center gap-3 mt-2 text-[9px] text-[#6b7280]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-100" /> Bare soil</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-100" /> Sparse/stressed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-100" /> Growing</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-200" /> Dense</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GovCard>
  );
}

// ─── MAIN MY LAND PAGE ──────────────────────────────────────────────────────

export default function MyLand() {
  const { user } = useAuth();
  const farmerId = user?.userId || '';
  const { holdings, loading, error, refetch, addHolding, verifyHolding, verificationLoading } = useMyLand(farmerId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [verificationData, setVerificationData] = useState<Record<string, SatelliteVerification>>({});
  const [downloading, setDownloading] = useState<string | null>(null);

  // Load verification data for holdings that have been verified
  useEffect(() => {
    const loadVerifications = async () => {
      for (const h of holdings) {
        if (h.satellite_verified && !verificationData[h.id]) {
          try {
            const res = await myLandApi.getLandHolding(h.id);
            const data = (res.data as any)?.data || res.data;
            if (data?.verification) {
              setVerificationData(prev => ({ ...prev, [h.id]: data.verification }));
            }
          } catch { /* ignore */ }
        }
      }
    };
    if (holdings.length > 0) loadVerifications();
  }, [holdings]);

  const handleVerify = async (holdingId: string) => {
    const result = await verifyHolding(holdingId);
    if (result) {
      setVerificationData(prev => ({ ...prev, [holdingId]: result }));
    }
  };

  const handleDownload = async (holdingId: string) => {
    setDownloading(holdingId);
    try {
      const res = await myLandApi.getTruthPacket(holdingId);
      const data = (res.data as any)?.data || res.data;
      if (data?.text) {
        const blob = new Blob([data.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `land-verification-${holdingId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore */ }
    finally { setDownloading(null); }
  };

  const handleDelete = async (holdingId: string) => {
    if (!confirm('Remove this land holding?')) return;
    await myLandApi.deleteLandHolding(holdingId);
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a6b3c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">My Land</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            {holdings.length > 0
              ? `${holdings.length} land holding${holdings.length > 1 ? 's' : ''} registered`
              : 'Add your first land holding to get started'}
          </p>
        </div>
        <GovButton variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Land Holding
        </GovButton>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {holdings.length === 0 && !loading && (
        <EmptyState
          icon={MapPin}
          title="No land holdings added yet"
          message="Add your first land holding to verify it with satellite data and get crop health analysis."
          action={{ label: 'Add Land Holding', onClick: () => setShowAddModal(true) }}
        />
      )}

      {/* Land Holdings */}
      <div className="space-y-6">
        {holdings.map((holding) => (
          <LandProfileCard
            key={holding.id}
            holding={holding}
            verification={verificationData[holding.id] || null}
            onVerify={() => handleVerify(holding.id)}
            onDownload={() => handleDownload(holding.id)}
            onDelete={() => handleDelete(holding.id)}
            verifying={verificationLoading === holding.id}
          />
        ))}
      </div>

      {/* Add Another button when holdings exist */}
      {holdings.length > 0 && (
        <div className="flex justify-center">
          <GovButton variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Another Land Holding
          </GovButton>
        </div>
      )}

      {/* Add Land Holding Modal */}
      {showAddModal && (
        <AddLandHoldingModal
          farmerId={farmerId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => refetch()}
        />
      )}
    </div>
  );
}
