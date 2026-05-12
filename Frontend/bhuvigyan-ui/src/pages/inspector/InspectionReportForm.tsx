import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Upload, MapPin, Leaf, Ruler, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../../components/ui/PageTransition';
import GovButton from '../../components/ui/GovButton';
import { inspectorApi } from '../../api/inspector';
import { useAuth } from '../../auth/AuthContext';

const STEPS = [
  { id: 'land', title: 'Land Verification', icon: MapPin },
  { id: 'crop', title: 'Crop Findings', icon: Leaf },
  { id: 'damage', title: 'Damage Assessment', icon: Ruler },
  { id: 'cce', title: 'CCE Data (if applicable)', icon: Camera },
  { id: 'recommendation', title: 'Recommendation & Photo', icon: Camera },
];

export default function InspectionReportForm() {
  const { id: visitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Land Verification
  const [landFound, setLandFound] = useState<boolean | null>(null);
  const [landAreaObserved, setLandAreaObserved] = useState('');
  const [landAreaClaimed, setLandAreaClaimed] = useState('');
  const [gpsEndLat, setGpsEndLat] = useState('');
  const [gpsEndLng, setGpsEndLng] = useState('');

  // Step 2: Crop Findings
  const [cropFound, setCropFound] = useState<boolean | null>(null);
  const [cropTypeFound, setCropTypeFound] = useState('');
  const [cropTypeMatches, setCropTypeMatches] = useState<boolean | null>(null);
  const [cropStage, setCropStage] = useState('');

  // Step 3: Damage Assessment
  const [cropCondition, setCropCondition] = useState('');
  const [actualLossPct, setActualLossPct] = useState('');
  const [claimedLossPct, setClaimedLossPct] = useState('');
  const [visibleWaterDamage, setVisibleWaterDamage] = useState(false);
  const [visibleFireDamage, setVisibleFireDamage] = useState(false);
  const [visiblePestDamage, setVisiblePestDamage] = useState(false);
  const [visibleHailDamage, setVisibleHailDamage] = useState(false);

  // Step 4: CCE Data
  const [cceConducted, setCceConducted] = useState(false);
  const [ccePlotSize, setCcePlotSize] = useState('');
  const [cceYield, setCceYield] = useState('');
  const [cceEstimatedYield, setCceEstimatedYield] = useState('');
  const [thresholdYield, setThresholdYield] = useState('');
  const [cceLossPct, setCceLossPct] = useState('');

  // Step 5: Recommendation & Photos
  const [inspectorRecommendation, setInspectorRecommendation] = useState('');
  const [recommendedPayoutPct, setRecommendedPayoutPct] = useState('');
  const [notes, setNotes] = useState('');
  const [fraudSuspicion, setFraudSuspicion] = useState(false);
  const [fraudSuspicionReason, setFraudSuspicionReason] = useState('');
  const [photoCount, setPhotoCount] = useState(0);

  const canGoNext = () => {
    switch (step) {
      case 0: return landFound !== null && landAreaObserved !== '';
      case 1: return cropFound !== null && (cropFound === false || cropTypeFound !== '');
      case 2: return actualLossPct !== '' && cropCondition !== '';
      case 3: return true;
      case 4: return inspectorRecommendation !== '';
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!user?.userId) return;
    setSubmitting(true);
    try {
      const reportData = {
        crop_found: cropFound,
        crop_type_found: cropTypeFound || undefined,
        crop_type_matches: cropTypeMatches === null ? undefined : cropTypeMatches,
        crop_stage: cropStage || undefined,
        crop_condition: cropCondition,
        actual_loss_pct: parseFloat(actualLossPct),
        claimed_loss_pct: claimedLossPct ? parseFloat(claimedLossPct) : undefined,
        land_found: landFound,
        land_area_observed: landAreaObserved ? parseFloat(landAreaObserved) : undefined,
        land_area_claimed: landAreaClaimed ? parseFloat(landAreaClaimed) : undefined,
        cce_conducted: cceConducted,
        cce_plot_size_sqm: ccePlotSize ? parseFloat(ccePlotSize) : undefined,
        cce_yield_kg: cceYield ? parseFloat(cceYield) : undefined,
        cce_estimated_yield_per_ha: cceEstimatedYield ? parseFloat(cceEstimatedYield) : undefined,
        threshold_yield: thresholdYield ? parseFloat(thresholdYield) : undefined,
        cce_loss_pct: cceLossPct ? parseFloat(cceLossPct) : undefined,
        visible_water_damage: visibleWaterDamage,
        visible_fire_damage: visibleFireDamage,
        visible_pest_damage: visiblePestDamage,
        visible_hail_damage: visibleHailDamage,
        inspector_recommendation: inspectorRecommendation,
        recommended_payout_pct: recommendedPayoutPct ? parseFloat(recommendedPayoutPct) : undefined,
        notes: notes || undefined,
        fraud_suspicion: fraudSuspicion,
        fraud_suspicion_reason: fraudSuspicion ? fraudSuspicionReason : undefined,
        gps_end_lat: gpsEndLat ? parseFloat(gpsEndLat) : undefined,
        gps_end_lng: gpsEndLng ? parseFloat(gpsEndLng) : undefined,
      };

      await inspectorApi.submitReport(visitId!, user.userId, reportData);
      navigate('/inspector/dashboard');
    } catch (err) {
      console.error('Submit report error:', err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">1. Is farmland visible at location?</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setLandFound(true)}
                className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
                  landFound === true ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                Yes — Land visible
              </button>
              <button
                onClick={() => setLandFound(false)}
                className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
                  landFound === false ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                No — Land not found
              </button>
            </div>

            {landFound !== null && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observed Area (ha)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={landAreaObserved}
                      onChange={(e) => setLandAreaObserved(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g. 2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claimed Area (ha)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={landAreaClaimed}
                      onChange={(e) => setLandAreaClaimed(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g. 3.0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GPS End Lat</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={gpsEndLat}
                      onChange={(e) => setGpsEndLat(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="16.5123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GPS End Lng</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={gpsEndLng}
                      onChange={(e) => setGpsEndLng(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="75.5123"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">2. Is the claimed crop present?</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setCropFound(true)}
                className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
                  cropFound === true ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                Yes — Crop Found
              </button>
              <button
                onClick={() => setCropFound(false)}
                className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
                  cropFound === false ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                No — Crop Missing
              </button>
            </div>

            {cropFound !== null && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type Found</label>
                  <input
                    type="text"
                    value={cropTypeFound}
                    onChange={(e) => setCropTypeFound(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g. Paddy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matches declared crop?</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setCropTypeMatches(true)}
                      className={`px-4 py-2 rounded-lg border font-medium ${cropTypeMatches === true ? 'bg-green-50 border-green-600 text-green-700' : 'border-gray-200'}`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setCropTypeMatches(false)}
                      className={`px-4 py-2 rounded-lg border font-medium ${cropTypeMatches === false ? 'bg-red-50 border-red-600 text-red-700' : 'border-gray-200'}`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crop Stage</label>
                  <select
                    value={cropStage}
                    onChange={(e) => setCropStage(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select stage...</option>
                    <option value="sowing">Sowing</option>
                    <option value="vegetative">Vegetative</option>
                    <option value="flowering">Flowering</option>
                    <option value="grain_filling">Grain Filling</option>
                    <option value="maturity">Maturity/Harvest</option>
                  </select>
                </div>
              </>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">3. Damage Assessment</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Condition</label>
              <select
                value={cropCondition}
                onChange={(e) => setCropCondition(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select condition...</option>
                <option value="healthy">Healthy — No visible damage</option>
                <option value="mild_damage">Mild Damage — &lt;25% loss</option>
                <option value="moderate_damage">Moderate Damage — 25-50% loss</option>
                <option value="severe_damage">Severe Damage — 50-75% loss</option>
                <option value="total_loss">Total Loss — &gt;75% loss</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={actualLossPct}
                  onChange={(e) => setActualLossPct(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="0-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claimed Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={claimedLossPct}
                  onChange={(e) => setClaimedLossPct(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="0-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visible Damage Types</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Water/Flood', value: visibleWaterDamage, setter: setVisibleWaterDamage },
                  { label: 'Fire', value: visibleFireDamage, setter: setVisibleFireDamage },
                  { label: 'Pest', value: visiblePestDamage, setter: setVisiblePestDamage },
                  { label: 'Hail', value: visibleHailDamage, setter: setVisibleHailDamage },
                ].map(({ label, value, setter }) => (
                  <button
                    key={label}
                    onClick={() => setter(!value)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      value ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {value ? '✓ ' : ''}{label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">4. CCE Data (Cutting for Yield Estimation)</h3>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cceConducted}
                  onChange={(e) => setCceConducted(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded"
                />
                CCE Conducted
              </label>
            </div>

            {cceConducted && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plot Size (sqm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ccePlotSize}
                    onChange={(e) => setCcePlotSize(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crop Cut Weight (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={cceYield}
                    onChange={(e) => setCceYield(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Est. Yield (kg/ha)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={cceEstimatedYield}
                    onChange={(e) => setCceEstimatedYield(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold Yield (kg/ha)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={thresholdYield}
                    onChange={(e) => setThresholdYield(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CCE Loss (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cceLossPct}
                    onChange={(e) => setCceLossPct(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">5. Recommendation & Photos</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspector Recommendation</label>
              <select
                value={inspectorRecommendation}
                onChange={(e) => setInspectorRecommendation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select recommendation...</option>
                <option value="approve">Approve — Claim fully justified</option>
                <option value="partial_approve">Partial Approve — Loss is lower than claimed</option>
                <option value="reject">Reject — Fraud or no damage found</option>
                <option value="further_investigation">Further Investigation — Need more data</option>
              </select>
            </div>

            {inspectorRecommendation && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Payout (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={recommendedPayoutPct}
                    onChange={(e) => setRecommendedPayoutPct(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Add any observations or notes..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="fraudSuspicion"
                    checked={fraudSuspicion}
                    onChange={(e) => setFraudSuspicion(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <label htmlFor="fraudSuspicion" className="text-sm font-medium text-red-600 cursor-pointer">
                    I suspect this claim may be fraudulent
                  </label>
                </div>

                {fraudSuspicion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Fraud Suspicion</label>
                    <textarea
                      value={fraudSuspicionReason}
                      onChange={(e) => setFraudSuspicionReason(e.target.value)}
                      rows={3}
                      className="w-full border border-red-300 rounded-lg px-3 py-2"
                      placeholder="Describe suspicious findings..."
                    />
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Camera className="w-4 h-4" /> Photo Upload
                  </div>
                  <p className="text-xs text-gray-500">
                    Minimum 5 photos required (farm, crop close-up, damaged area, GPS tag, wide shot)
                  </p>
                  <button
                    onClick={() => setPhotoCount(5)}
                    className="text-sm text-green-600 hover:text-green-700 underline"
                  >
                    Simulate 5 photos uploaded
                  </button>
                  {photoCount > 0 && (
                    <p className="text-sm text-green-700 font-medium">{photoCount} photos uploaded</p>
                  )}
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  i === step
                    ? 'bg-green-600 text-white'
                    : i < step
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{i + 1}. {s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl p-6 border border-gray-100"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <GovButton
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </GovButton>

          {step < STEPS.length - 1 ? (
            <GovButton
              variant="primary"
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </GovButton>
          ) : (
            <GovButton
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !canGoNext() || photoCount < 5}
            >
              {submitting ? 'Submitting...' : 'Submit Final Report'}
            </GovButton>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
