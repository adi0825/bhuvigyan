import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, FileText, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DevBanner } from "@/components/dev-banner";
import { FarmerBottomNav } from "@/components/layout/farmer-bottom-nav";

const APPEAL_REASONS = [
  "Damage was real — satellite data is incorrect",
  "Crop damage occurred after satellite capture date",
  "Neighbouring plots wrongly included in assessment",
  "Wrong crop type was recorded during enrolment",
  "Natural calamity not captured in the assessment window",
  "Other reason (explain below)",
];

export default function FarmerAppeal() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [selectedReason, setSelectedReason] = useState("");
  const [appealText, setAppealText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const appealMut = useMutation({
    mutationFn: () =>
      apiFetch(`/v1/claims/appeal/${params.id}`, {
        method: "POST",
        body: JSON.stringify({
          appealText: selectedReason
            ? `${selectedReason}\n\n${appealText}`.trim()
            : appealText,
        }),
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (e: Error) =>
      toast({ title: "Appeal failed", description: e.message, variant: "destructive" }),
  });

  const charCount = (selectedReason + "\n\n" + appealText).trim().length;
  const canSubmit = appealText.trim().length >= 30 || selectedReason !== "";

  return (
    <div className="min-h-screen bg-background pt-8 pb-20">
      <DevBanner />
      <header className="bg-sidebar text-white px-4 py-4 flex items-center gap-3 sticky top-8 z-10">
        <button
          onClick={() => navigate(`/farmer/claims/${params.id}`)}
          className="p-1.5 hover:bg-sidebar-accent rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="font-semibold text-sm">File Appeal</div>
          <div className="text-[11px] text-sidebar-foreground/60">
            Claim #{params.id?.slice(0, 8).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-green-800">Appeal Submitted</h2>
              <p className="text-sm text-green-700 mt-1">
                Your appeal has been registered and will be reviewed by a senior officer within 7 working days.
              </p>
            </div>
            <div className="bg-green-100 rounded-xl p-3 text-xs text-green-700 text-left space-y-1">
              <div className="font-semibold">What happens next?</div>
              <div>1. Officer review within 3 working days</div>
              <div>2. Possible field re-inspection (CCE)</div>
              <div>3. Decision communicated via SMS + app</div>
            </div>
            <button
              onClick={() => navigate("/farmer/dashboard")}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Info box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <div className="font-semibold mb-0.5">Appeal a Rejected Claim</div>
                <p className="text-xs leading-relaxed">
                  Appeals are reviewed within 7 working days. Provide clear evidence and reasons.
                  False appeals may affect future claim processing.
                </p>
              </div>
            </div>

            {/* Reason picker */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Select reason for appeal
              </div>
              <div className="space-y-2">
                {APPEAL_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedReason(r === selectedReason ? "" : r)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                      selectedReason === r
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Text area */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Describe your appeal{" "}
                <span className="text-muted-foreground font-normal">(min. 30 characters)</span>
              </label>
              <textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="Explain in detail why this claim should be reconsidered. Include dates, extent of damage, and any supporting information..."
                rows={5}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Be specific and factual</span>
                <span className={charCount < 30 && !selectedReason ? "text-destructive" : "text-green-600"}>
                  {charCount} chars
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => appealMut.mutate()}
              disabled={!canSubmit || appealMut.isPending}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {appealMut.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {appealMut.isPending ? "Submitting…" : "Submit Appeal"}
            </button>

            <p className="text-xs text-muted-foreground text-center pb-2">
              Appeals can only be filed once per claim. Make sure all details are accurate before submitting.
            </p>
          </>
        )}
      </div>
      <FarmerBottomNav />
    </div>
  );
}
