import { useState, useCallback } from 'react';
import { Plus, Sprout, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useMyLandData } from '../../hooks/useMyLandData';
import toast from 'react-hot-toast';

import LandSelectorHeader from '../../components/myLand/LandSelectorHeader';
import SatelliteMap from '../../components/myLand/SatelliteMap';
import QuickStatsBar from '../../components/myLand/QuickStatsBar';
import NdviTimelineChart from '../../components/myLand/NdviTimelineChart';
import MoistureTrendChart from '../../components/myLand/MoistureTrendChart';
import CropDetectionPanel from '../../components/myLand/CropDetectionPanel';
import AnomalyAlertsPanel from '../../components/myLand/AnomalyAlertsPanel';
import EvidenceDownloadBar from '../../components/myLand/EvidenceDownloadBar';
import AddLandHoldingModal from '../../components/myLand/AddLandHoldingModal';

export default function MyLand() {
  const { user } = useAuth();
  const farmerId = user?.userId ?? null;
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    holdings,
    selectedHolding,
    analysis,
    loading,
    analysisLoading,
    error,
    analysisError,
    refreshAnalysis,
    selectHolding,
  } = useMyLandData(farmerId, refreshKey);

  const handleHoldingAdded = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleShowOnDashboard = useCallback(() => {
    if (!selectedHolding || !analysis) {
      toast.error('Please select a land and wait for analysis to complete');
      return;
    }
    try {
      const payload = {
        holding: selectedHolding,
        analysis: analysis,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('bhuvigyan:dashboard_land', JSON.stringify(payload));
      toast.success(`${selectedHolding.survey_number} — ${selectedHolding.village} shown on Dashboard`);
    } catch {
      toast.error('Failed to save land data');
    }
  }, [selectedHolding, analysis]);

  const hasHoldings = !loading && holdings.length > 0;
  const noHoldings = !loading && holdings.length === 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] pb-20">
      {/* Add Land Modal */}
      <AddLandHoldingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleHoldingAdded}
      />

      {/* Section 1: Header */}
      <LandSelectorHeader
        holdings={holdings}
        selected={selectedHolding}
        onSelect={selectHolding}
        onRefresh={refreshAnalysis}
        loading={analysisLoading}
        lastUpdated={analysis?.data_freshness?.analysis_timestamp}
        onAddHolding={() => setShowAddModal(true)}
        onShowOnDashboard={handleShowOnDashboard}
        showDashboardButton={!!selectedHolding && !!analysis && !analysisLoading}
      />

      {/* Content */}
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}
        {analysisError && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
            {analysisError}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[#016B4B] animate-spin" />
          </div>
        )}

        {noHoldings && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Sprout className="w-12 h-12 text-[#016B4B] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#111827] mb-1">No Land Holdings</h3>
            <p className="text-sm text-gray-500 mb-4">Add your first land holding to see satellite analysis.</p>
            <button
              id="add-land-holding-btn"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-[#016B4B] hover:bg-[#015138] text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Land Holding
            </button>
          </div>
        )}

        {hasHoldings && (
          <>
            {/* Section 2: Map */}
            <SatelliteMap analysis={analysis} loading={analysisLoading} />

            {/* Section 3: Quick Stats */}
            <QuickStatsBar analysis={analysis} loading={analysisLoading} />

            {/* Section 4 & 5: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NdviTimelineChart analysis={analysis} verification={selectedHolding?.verification} loading={analysisLoading} />
              <MoistureTrendChart analysis={analysis} verification={selectedHolding?.verification} loading={analysisLoading} />
            </div>

            {/* Section 6: Crop Detection */}
            <CropDetectionPanel analysis={analysis} loading={analysisLoading} />

            {/* Section 7: Anomalies */}
            <AnomalyAlertsPanel analysis={analysis} loading={analysisLoading} />
          </>
        )}
      </div>

      {/* Section 8: Evidence Download Bar */}
      {hasHoldings && <EvidenceDownloadBar analysis={analysis} />}
    </div>
  );
}
