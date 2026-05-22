import React, { useState } from 'react';

interface VerificationResult {
  coordinates: { lat: number; lon: number };
  admin: {
    village: string;
    taluk: string;
    district: string;
    state: string;
    source: string;
  };
  satellite: {
    ndvi_mean: number | null;
    ndvi_min: number | null;
    ndvi_max: number | null;
    ndwi_mean: number | null;
    sar_vv_mean: number | null;
    scene_date: string | null;
    cloud_cover_pct: number | null;
    source: string;
    reason?: string;
  };
  crop_analysis: {
    detected_season: string;
    vegetation_status: string;
    crop_confidence: string;
    mixed_crop_flag: boolean;
    irrigation_status: string;
    fraud_risk_baseline: string;
    fraud_risk_reason: string;
  };
  data_freshness: {
    latest_scene_age_days: number | null;
    analysis_timestamp: string;
  };
}

export const SystemVerificationPanel: React.FC = () => {
  const [lat, setLat] = useState('17.924381');
  const [lon, setLon] = useState('74.57982');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Adjusted based on typical fast API setup, /api/v1/land/analyze
      const url = new URL('/api/v1/land/analyze', window.location.origin);
      url.searchParams.append('lat', lat);
      url.searchParams.append('lon', lon);
      url.searchParams.append('survey_no', 'TEST');
      url.searchParams.append('district', 'TEST');

      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      if (data.success || data.data) {
        setResult(data.data);
      } else {
        setError("Test failed: " + JSON.stringify(data));
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && parsed.data) {
           setResult(parsed.data); // gracefully handle backend graceful error
           setError(null);
        }
      } catch (e) {
        // ignore parse error
      }
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = (val: any) => val !== null && val !== undefined;
  
  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">System Verification Panel</h2>
      
      <div className="flex space-x-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700">Latitude</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={lat}
            onChange={e => setLat(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Longitude</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            value={lon}
            onChange={e => setLon(e.target.value)}
          />
        </div>
        <div className="pt-6">
          <button
            onClick={runTest}
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Full System Test'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-md border ${result.admin.source !== 'unavailable' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className="font-semibold flex items-center justify-between">
                Bhuvan/Geocoding {result.admin.source !== 'unavailable' ? '✅' : '❌'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Source: {result.admin.source}</p>
            </div>
            
            <div className={`p-4 rounded-md border ${isSuccess(result.satellite.ndvi_mean) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className="font-semibold flex items-center justify-between">
                GEE/NDVI {isSuccess(result.satellite.ndvi_mean) ? '✅' : '❌'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">NDVI: {result.satellite.ndvi_mean ?? 'N/A'}</p>
            </div>
            
            <div className={`p-4 rounded-md border ${result.satellite.source !== 'unavailable' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <h3 className="font-semibold flex items-center justify-between">
                Satellite Source {result.satellite.source !== 'unavailable' ? '✅' : '❌'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Used: {result.satellite.source}</p>
            </div>
            
            <div className={`p-4 rounded-md border ${isSuccess(result.satellite.sar_vv_mean) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className="font-semibold flex items-center justify-between">
                Sentinel-1 SAR {isSuccess(result.satellite.sar_vv_mean) ? '✅' : '❌'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">VV: {result.satellite.sar_vv_mean ?? 'N/A'}</p>
            </div>
            
            <div className="p-4 rounded-md border bg-blue-50 border-blue-200 col-span-2 flex justify-between items-center">
              <h3 className="font-semibold">Backend Health ✅</h3>
              <span className="text-sm text-gray-600">Timestamp: {new Date(result.data_freshness.analysis_timestamp).toLocaleString()}</span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Crop Analysis Result</h3>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Village:</span>
                <p className="mt-1 text-lg">{result.admin.village} <span className="text-xs text-gray-400 font-normal">(Source: {result.admin.source})</span></p>
              </div>
              
              <div>
                <span className="font-semibold text-gray-600">NDVI:</span>
                <p className="mt-1 text-lg">
                  {result.satellite.ndvi_mean ?? 'N/A'} — <span className="font-medium text-indigo-600">{result.crop_analysis.vegetation_status}</span>
                </p>
              </div>
              
              <div>
                <span className="font-semibold text-gray-600">Season:</span>
                <p className="mt-1 text-lg">{result.crop_analysis.detected_season}</p>
              </div>
              
              <div>
                <span className="font-semibold text-gray-600">Crop Status:</span>
                <p className="mt-1 text-lg">{result.crop_analysis.vegetation_status}</p>
              </div>
              
              <div className="col-span-2">
                <span className="font-semibold text-gray-600">Fraud Risk:</span>
                <div className={`mt-2 p-3 rounded-md font-bold text-lg flex items-center border
                  ${result.crop_analysis.fraud_risk_baseline === 'LOW' ? 'bg-green-100 text-green-800 border-green-300' : 
                    result.crop_analysis.fraud_risk_baseline === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                    'bg-red-100 text-red-800 border-red-300'}`}>
                  {result.crop_analysis.fraud_risk_baseline} 
                  {result.crop_analysis.fraud_risk_baseline === 'LOW' ? ' 🟢' : 
                   result.crop_analysis.fraud_risk_baseline === 'MEDIUM' ? ' 🟡' : ' 🔴'}
                  <span className="ml-4 text-sm font-normal truncate flex-1">{result.crop_analysis.fraud_risk_reason}</span>
                </div>
              </div>
              
              <div className="col-span-2 flex justify-between text-xs text-gray-500 mt-2">
                <span>Data Source: {result.satellite.source}</span>
                <span>Scene Date: {result.satellite.scene_date || 'N/A'} ({result.data_freshness.latest_scene_age_days} days ago)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemVerificationPanel;
