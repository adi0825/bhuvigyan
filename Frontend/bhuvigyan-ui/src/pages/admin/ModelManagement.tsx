import { useState } from "react";

const mockModels = [
  { id: "m1", version: "v6.0-ensemble", algorithm: "XGBoost+LightGBM", featureCount: "47", trainingDate: "2026-04-01", validationAuc: 0.87, testAuc: 0.85, status: "PRODUCTION" },
  { id: "m2", version: "v6.1-ensemble-beta", algorithm: "XGBoost+LightGBM", featureCount: "47", trainingDate: "2026-05-01", validationAuc: 0.89, testAuc: 0.87, status: "STAGING" },
  { id: "m3", version: "v5.9-legacy", algorithm: "Random Forest", featureCount: "32", trainingDate: "2026-01-15", validationAuc: 0.82, testAuc: 0.80, status: "ARCHIVED" },
];

export default function ModelManagement() {
  const [models, setModels] = useState(mockModels);

  const promote = (id: string) => {
    setModels((prev) =>
      prev.map((m) => ({
        ...m,
        status: m.id === id ? "PRODUCTION" : m.status === "PRODUCTION" ? "ARCHIVED" : m.status,
      }))
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Model Registry</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Version</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Algorithm</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Features</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Training Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Val AUC</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Test AUC</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {models.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.version}</td>
                <td className="px-4 py-3">{m.algorithm}</td>
                <td className="px-4 py-3">{m.featureCount}</td>
                <td className="px-4 py-3">{m.trainingDate}</td>
                <td className="px-4 py-3">{m.validationAuc}</td>
                <td className="px-4 py-3">{m.testAuc}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.status === "PRODUCTION" ? "bg-green-100 text-green-800" : m.status === "STAGING" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}>{m.status}</span>
                </td>
                <td className="px-4 py-3">
                  {m.status === "STAGING" && (
                    <button onClick={() => promote(m.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Promote</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
