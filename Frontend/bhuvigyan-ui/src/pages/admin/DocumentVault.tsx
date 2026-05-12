import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Search, Filter, CheckCircle, XCircle, Eye, FileImage, FileVideo } from "lucide-react";
import GovButton from "../../components/ui/GovButton";
import api from "../../api/axios";
import toast from "react-hot-toast";

interface DocRecord {
  id: string;
  docType: string;
  farmerName: string;
  fileSize: number;
  verificationStatus: string;
  uploadedAt: string;
}

const docIcons: Record<string, React.ReactNode> = {
  aadhaar: <FileText className="w-5 h-5 text-blue-500" />,
  rtc: <FileText className="w-5 h-5 text-green-500" />,
  passbook: <FileText className="w-5 h-5 text-purple-500" />,
  photo: <FileImage className="w-5 h-5 text-orange-500" />,
  video: <FileVideo className="w-5 h-5 text-red-500" />,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  needs_resubmit: "bg-orange-100 text-orange-700",
};

export default function DocumentVault() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocRecord | null>(null);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      const demoDocs: DocRecord[] = [
        { id: "1", docType: "aadhaar", farmerName: "Ramesh Kumar", fileSize: 2048000, verificationStatus: "verified", uploadedAt: "2026-05-01T10:00:00Z" },
        { id: "2", docType: "rtc", farmerName: "Suresh Nayak", fileSize: 5120000, verificationStatus: "pending", uploadedAt: "2026-05-02T11:30:00Z" },
        { id: "3", docType: "passbook", farmerName: "Mahesh Reddy", fileSize: 1024000, verificationStatus: "verified", uploadedAt: "2026-05-03T09:15:00Z" },
        { id: "4", docType: "photo", farmerName: "Ganesh Gowda", fileSize: 8192000, verificationStatus: "pending", uploadedAt: "2026-05-04T14:00:00Z" },
        { id: "5", docType: "video", farmerName: "Naresh Babu", fileSize: 52428800, verificationStatus: "needs_resubmit", uploadedAt: "2026-05-05T16:45:00Z" },
      ];
      setDocs(demoDocs);
    } catch { toast.error("Failed to load documents"); }
    finally { setLoading(false); }
  };

  const filtered = docs.filter(d => {
    const matchesSearch = !search || d.farmerName.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || d.docType === typeFilter;
    return matchesSearch && matchesType;
  });

  const verifyDoc = async (docId: string, status: string) => {
    try {
      // await api.put(`/admin/documents/${docId}/verify`, { status });
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, verificationStatus: status } : d));
      toast.success(`Document marked as ${status}`);
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-blue-600" /> Document Vault</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by farmer name..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="aadhaar">Aadhaar</option>
          <option value="rtc">RTC/Pahani</option>
          <option value="passbook">Passbook</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-gray-500">Loading documents...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <motion.div key={doc.id} layout className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {docIcons[doc.docType] || <FileText className="w-5 h-5 text-gray-500" />}
                <div>
                  <p className="font-medium text-sm capitalize">{doc.docType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500">{doc.farmerName}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{(doc.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[doc.verificationStatus] || "bg-gray-100"}`}>
                  {doc.verificationStatus.replace(/_/g, " ")}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setSelectedDoc(doc)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Eye className="w-4 h-4" /></button>
                  {doc.verificationStatus === "pending" && (
                    <>
                      <button onClick={() => verifyDoc(doc.id, "verified")} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => verifyDoc(doc.id, "rejected")} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"><XCircle className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
