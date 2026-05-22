import { RefreshCw, ChevronDown, Circle, Plus, LayoutDashboard } from 'lucide-react';
import type { LandHolding } from '../../types/myLand.types';

interface Props {
  holdings: LandHolding[];
  selected: LandHolding | null;
  onSelect: (h: LandHolding) => void;
  onRefresh: () => void;
  loading: boolean;
  lastUpdated?: string;
  onAddHolding?: () => void;
  onShowOnDashboard?: () => void;
  showDashboardButton?: boolean;
}

export default function LandSelectorHeader({ holdings, selected, onSelect, onRefresh, loading, lastUpdated, onAddHolding, onShowOnDashboard, showDashboardButton }: Props) {
  const isFresh = lastUpdated ? (Date.now() - new Date(lastUpdated).getTime()) < 6 * 60 * 60 * 1000 : false;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex-1">
        <div className="relative">
          <select
            value={selected?.id || ''}
            onChange={(e) => {
              const h = holdings.find((x) => x.id === e.target.value);
              if (h) onSelect(h);
            }}
            className="appearance-none w-full md:w-72 bg-[#F9FAFB] border border-gray-200 text-[#111827] rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#016B4B]/40"
          >
            <option value="">Select Survey Number</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.survey_number} — {h.village}, {h.district}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {selected && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2 py-0.5 bg-[#F9FAFB] border border-gray-200 rounded text-[10px] text-gray-600 font-medium">{selected.district}</span>
            <span className="px-2 py-0.5 bg-[#F9FAFB] border border-gray-200 rounded text-[10px] text-gray-600 font-medium">{selected.taluk}</span>
            <span className="px-2 py-0.5 bg-[#F9FAFB] border border-gray-200 rounded text-[10px] text-gray-600 font-medium">{selected.village}</span>
            <span className="px-2 py-0.5 bg-[#F9FAFB] border border-gray-200 rounded text-[10px] text-gray-600 font-medium">
              Area: {selected.land_area_hectares != null ? `${selected.land_area_hectares.toFixed(2)} ha` : 'N/A'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {showDashboardButton && onShowOnDashboard && (
          <button
            onClick={onShowOnDashboard}
            className="flex items-center gap-2 bg-[#016B4B] hover:bg-[#015138] text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            Show on Dashboard
          </button>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#016B4B] font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </button>
        {onAddHolding && (
          <button
            id="header-add-holding-btn"
            onClick={onAddHolding}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#016B4B] font-semibold px-3 py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Circle className={`w-2.5 h-2.5 ${isFresh ? 'text-[#016B4B] fill-[#016B4B] animate-pulse' : 'text-amber-500 fill-amber-500'}`} />
          {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'Not analyzed yet'}
        </div>
      </div>
    </div>
  );
}
