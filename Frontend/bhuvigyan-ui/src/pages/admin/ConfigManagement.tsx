import { useState } from "react";

const mockConfigs = [
  { key: "autoApproveBelow", value: "30", description: "Auto-approve claims with fraud score below this threshold" },
  { key: "manualReviewBelow", value: "60", description: "Manual review for scores below this threshold" },
  { key: "fieldVisitBelow", value: "80", description: "Mandatory field visit for scores below this threshold" },
  { key: "maxOfficerOpenVisits", value: "5", description: "Maximum open visits per officer" },
  { key: "claimFilingWindowHours", value: "72", description: "Hours after loss date to file claim" },
];

export default function ConfigManagement() {
  const [configs, setConfigs] = useState(mockConfigs);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (key: string, value: string) => {
    setEditing(key);
    setEditValue(value);
  };

  const save = (key: string) => {
    setConfigs((prev) => prev.map((c) => (c.key === key ? { ...c, value: editValue } : c)));
    setEditing(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Configuration Management</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Key</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Value</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {configs.map((c) => (
              <tr key={c.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{c.key}</td>
                <td className="px-4 py-3">
                  {editing === c.key ? (
                    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="border rounded px-2 py-1 w-24" />
                  ) : (
                    <span className="font-medium">{c.value}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{c.description}</td>
                <td className="px-4 py-3">
                  {editing === c.key ? (
                    <button onClick={() => save(c.key)} className="text-green-600 hover:underline text-xs">Save</button>
                  ) : (
                    <button onClick={() => startEdit(c.key, c.value)} className="text-blue-600 hover:underline text-xs">Edit</button>
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
