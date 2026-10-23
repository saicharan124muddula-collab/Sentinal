import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import type { BusinessDNAReport } from '../types/sentinal';
import { apiFetch, getVisitorSessionId } from '../utils/api';

interface BusinessDNAPageProps {
  reportId?: string;
  navigate: (to: string) => void;
}

export const BusinessDNAPage: React.FC<BusinessDNAPageProps> = ({
  reportId,
  navigate,
}) => {
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [report, setReport] = useState<BusinessDNAReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Manual form state
  const [manualForm, setManualForm] = useState({
    businessName: '',
    industry: '',
    productsAndServices: '',
    targetCustomers: '',
    locationMarket: '',
    brandPersonality: '',
    existingBrandColors: '#F97316, #171717',
    websiteUrl: '',
    mainObjective: '',
    marketingChallenges: '',
    competitors: '',
    additionalContext: '',
  });

  useEffect(() => {
    if (reportId) {
      setLoadingReport(true);
      setErrorMsg(null);
      const sessionId = getVisitorSessionId();
      apiFetch<{ report: BusinessDNAReport }>(
        `/api/business-dna/${encodeURIComponent(reportId)}?sessionId=${encodeURIComponent(sessionId)}`
      )
        .then((res) => {
          setReport(res.report);
        })
        .catch((err: Error) => {
          setErrorMsg(err.message || 'Could not load Business DNA report.');
        })
        .finally(() => {
          setLoadingReport(false);
        });
    } else {
      setReport(null);
    }
  }, [reportId]);

  const handleAnalyzeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFallbackNotice(null);

    if (!websiteUrl.trim()) {
      setErrorMsg('Please enter your business website URL.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ report: BusinessDNAReport }>(
        '/api/business-dna/analyze-url',
        {
          method: 'POST',
          body: JSON.stringify({
            websiteUrl: websiteUrl.trim(),
            ownerSessionId: getVisitorSessionId(),
          }),
        }
      );
      setReport(res.report);
      navigate(`/business-dna/results/${res.report.id}`);
    } catch (err: unknown) {
      const errObj = err as Error & {
        status?: number;
        payload?: {
          insufficient?: boolean;
          fallbackMessage?: string;
          reason?: string;
          suggestedWebsiteUrl?: string;
        };
      };
      if (errObj.status === 422 && errObj.payload?.insufficient) {
        setFallbackNotice(
          errObj.payload.fallbackMessage ||
            "We couldn't discover enough about your business automatically. Let's build your Business DNA together."
        );
        setErrorMsg(errObj.payload.reason || null);
        setManualForm((prev) => ({
          ...prev,
          websiteUrl: errObj.payload?.suggestedWebsiteUrl || websiteUrl.trim(),
        }));
        setMode('manual');
      } else {
        setErrorMsg(
          errObj.message || 'Unable to analyse website. You can also build your Business DNA manually.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ report: BusinessDNAReport }>(
        '/api/business-dna/analyze-manual',
        {
          method: 'POST',
          body: JSON.stringify({
            ...manualForm,
            ownerSessionId: getVisitorSessionId(),
          }),
        }
      );
      setReport(res.report);
      navigate(`/business-dna/results/${res.report.id}`);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to generate Business DNA report.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-business-dna.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingReport) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#F97316] animate-spin mx-auto" />
        <p className="text-sm text-[#64748B]">Loading Business DNA report...</p>
      </div>
    );
  }

  // REPORT VIEW (/business-dna/results/:id)
  if (reportId && report) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/business-dna')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#171717] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Analyse Another Business</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#171717] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Report (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/request-quote')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors cursor-pointer"
            >
              Request a Marketing Quote
            </button>
          </div>
        </div>

        {/* Report Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="space-y-2">
              <p className="text-xs font-mono text-[#EA580C] uppercase">
                SENTINAL BUSINESS DNA REPORT · ID {report.id}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#171717]">
                {report.businessName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                <span>{report.industry}</span>
                <span aria-hidden="true">·</span>
                <span>Confidence: {report.confidenceLevel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  Analysed {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {report.websiteUrl && (
              <a
                href={report.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#F97316] hover:underline shrink-0"
              >
                <span>{report.websiteUrl}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* 1. Business Overview */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-[#171717]">
              01. Business Overview
            </h2>
            <p className="text-sm sm:text-base text-[#171717] leading-relaxed">
              {report.websiteMessaging.valueProposition}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <p className="text-xs text-[#64748B]">Primary Headline / Positioning</p>
                <p className="mt-1 text-sm font-semibold text-[#171717]">
                  {report.websiteMessaging.headline || report.businessName}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <p className="text-xs text-[#64748B]">Tone of Voice</p>
                <p className="mt-1 text-sm font-semibold text-[#171717]">
                  {report.websiteMessaging.toneOfVoice}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <p className="text-xs text-[#64748B]">Profile Source</p>
                <p className="mt-1 text-sm font-semibold text-[#171717]">
                  {report.sourceType === 'website_auto'
                    ? 'Automatic Website Inspection'
                    : 'User-Submitted Manual Profile'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Brand DNA */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#171717]">
              02. Brand DNA &amp; Visual Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#64748B]">
                  Brand Personality Attributes
                </p>
                <p className="text-sm font-semibold text-[#171717]">
                  {report.brandPersonality.join(' · ')}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#64748B]">
                  Brand Colour Tokens
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  {report.brandColors.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-md border border-slate-300 shrink-0"
                        style={{ backgroundColor: col.hex }}
                      />
                      <div className="text-xs">
                        <p className="font-mono font-semibold text-[#171717]">
                          {col.hex}
                        </p>
                        <p className="text-[#64748B]">{col.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Products & Services & 4. Audience Insights */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-[#171717]">
                03. Products &amp; Services
              </h2>
              <ul className="space-y-2 text-sm text-[#171717]">
                {report.productsAndServices.map((prod, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-xs text-[#F97316] mt-0.5">
                      0{idx + 1}.
                    </span>
                    <span>{prod}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-[#171717]">
                04. Target Audience Insights
              </h2>
              <ul className="space-y-2 text-sm text-[#171717]">
                {report.targetAudienceHypotheses.map((aud, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-xs text-[#38BDF8] mt-0.5">
                      0{idx + 1}.
                    </span>
                    <span>{aud}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5. Digital Presence & Measured Signals */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#171717]">
              05. Digital Presence &amp; Signal Verification
            </h2>
            <div className="space-y-3">
              {report.digitalPresenceObservations.map((obs, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-display text-sm font-bold text-[#171717]">
                      {obs.signal}
                    </p>
                    <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                      {obs.finding}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#171717] shrink-0">
                    {obs.verificationStatus === 'measured'
                      ? 'Measured Signal'
                      : obs.verificationStatus === 'user_stated'
                      ? 'User Entered'
                      : 'AI Hypothesis'}
                  </span>
                </div>
              ))}
            </div>

            {report.performanceMetrics && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#171717]">
                    Performance &amp; Technical Inspection ({report.performanceMetrics.source})
                  </span>
                  {report.performanceMetrics.measured && (
                    <span className="font-mono text-[#16A34A]">
                      Response Time: {report.performanceMetrics.responseTimeMs} ms · Payload:{' '}
                      {Math.round((report.performanceMetrics.htmlSizeBytes || 0) / 1024)} KB
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B]">{report.performanceMetrics.note}</p>
              </div>
            )}
          </div>

          {/* 6. Strengths & Improvement Opportunities */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-[#171717]">
                06. Identified Strengths
              </h2>
              <ul className="space-y-2 text-sm text-[#171717]">
                {report.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-[#171717]">
                07. Opportunities for Improvement
              </h2>
              <ul className="space-y-2 text-sm text-[#171717]">
                {report.improvementOpportunities.map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-xs font-bold text-[#F97316] mt-0.5">
                      →
                    </span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 7. Recommended Next Steps & Sources */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#171717]">
              08. Recommended Next Steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.recommendedNextSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1.5"
                >
                  <p className="font-mono text-xs font-bold text-[#F97316]">
                    ACTION 0{idx + 1}
                  </p>
                  <p className="text-sm text-[#171717] leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
              <span>Data Sources: {report.dataSources.join(' · ')}</span>
              <span>Report retained in your active browser session</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ENTRY VIEW (/business-dna)
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
          SENTINAL Diagnostic Engine
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#171717] tracking-tight">
          Want to discover your business DNA?
        </h1>
        <p className="text-base text-[#64748B] leading-relaxed max-w-2xl">
          SENTINAL analyses your business&apos;s digital presence to help you understand your brand identity, website messaging signals, and online growth opportunities.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setMode('url');
            setErrorMsg(null);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            mode === 'url'
              ? 'bg-white text-[#171717] shadow-xs'
              : 'text-[#64748B] hover:text-[#171717]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Automatic Website Analysis</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('manual');
            setErrorMsg(null);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            mode === 'manual'
              ? 'bg-white text-[#171717] shadow-xs'
              : 'text-[#64748B] hover:text-[#171717]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Manual Business DNA Builder</span>
        </button>
      </div>

      {fallbackNotice && (
        <div
          role="alert"
          className="p-5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5"
        >
          <p className="font-display text-sm font-bold text-[#171717]">
            {fallbackNotice}
          </p>
          {errorMsg && <p className="text-xs text-[#64748B]">Technical detail: {errorMsg}</p>}
        </div>
      )}

      {errorMsg && !fallbackNotice && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{errorMsg}</p>
            {mode === 'url' && (
              <button
                type="button"
                onClick={() => setMode('manual')}
                className="text-xs font-semibold underline text-[#EA580C] cursor-pointer"
              >
                Switch to Manual Business DNA Builder instead →
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'url' ? (
        <form
          onSubmit={handleAnalyzeUrl}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6"
        >
          <div className="space-y-2">
            <label
              htmlFor="business-website-url"
              className="block font-display text-sm font-bold text-[#171717]"
            >
              Enter your business website URL
            </label>
            <p className="text-xs text-[#64748B]">
              Provide a public website address (for example, <span className="font-mono">https://example.com</span> or your company domain).
            </p>
            <div className="pt-1 flex flex-col sm:flex-row gap-3">
              <input
                id="business-website-url"
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="flex-1 px-4 py-3 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analysing Website...</span>
                  </>
                ) : (
                  <span>Analyse My Business</span>
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
            <span>SSRF-Protected Server Inspection · Safe HTML &amp; Metadata Extraction</span>
            <button
              type="button"
              onClick={() => {
                setFallbackNotice(
                  "We couldn't discover enough about your business automatically. Let's build your Business DNA together."
                );
                setMode('manual');
              }}
              className="text-[#F97316] hover:underline font-medium cursor-pointer"
            >
              Don&apos;t have a website yet? Build manually →
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleManualSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6"
        >
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display text-lg font-bold text-[#171717]">
              We couldn&apos;t discover enough about your business automatically. Let&apos;s build your Business DNA together.
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Information entered below is clearly distinguished from independently measured website telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="dna-business-name"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Business Name *
              </label>
              <input
                id="dna-business-name"
                type="text"
                required
                value={manualForm.businessName}
                onChange={(e) =>
                  setManualForm({ ...manualForm, businessName: e.target.value })
                }
                placeholder="e.g. Aether Precision Logistics"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="dna-industry"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Industry / Category *
              </label>
              <input
                id="dna-industry"
                type="text"
                required
                value={manualForm.industry}
                onChange={(e) =>
                  setManualForm({ ...manualForm, industry: e.target.value })
                }
                placeholder="e.g. B2B Cold-Chain Supply & Logistics"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dna-products"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Products and Services *
              </label>
              <input
                id="dna-products"
                type="text"
                required
                value={manualForm.productsAndServices}
                onChange={(e) =>
                  setManualForm({ ...manualForm, productsAndServices: e.target.value })
                }
                placeholder="e.g. Temperature-controlled warehousing, Express fleet routing, Real-time SKU telemetry"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="dna-customers"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Target Customers *
              </label>
              <input
                id="dna-customers"
                type="text"
                required
                value={manualForm.targetCustomers}
                onChange={(e) =>
                  setManualForm({ ...manualForm, targetCustomers: e.target.value })
                }
                placeholder="e.g. Pharmaceutical distributors & FMCG operations heads"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="dna-location"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Primary Business Location or Market (Optional)
              </label>
              <input
                id="dna-location"
                type="text"
                value={manualForm.locationMarket}
                onChange={(e) =>
                  setManualForm({ ...manualForm, locationMarket: e.target.value })
                }
                placeholder="e.g. Mumbai, Delhi NCR & Pan-India Corridors"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="dna-personality"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Brand Personality *
              </label>
              <input
                id="dna-personality"
                type="text"
                required
                value={manualForm.brandPersonality}
                onChange={(e) =>
                  setManualForm({ ...manualForm, brandPersonality: e.target.value })
                }
                placeholder="e.g. Reliable, Technical, High-Precision"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="dna-colors"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Existing Brand Colours (Optional Hex Codes)
              </label>
              <input
                id="dna-colors"
                type="text"
                value={manualForm.existingBrandColors}
                onChange={(e) =>
                  setManualForm({ ...manualForm, existingBrandColors: e.target.value })
                }
                placeholder="#F97316, #171717, #38BDF8"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="dna-manual-website"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Business Website (Optional)
              </label>
              <input
                id="dna-manual-website"
                type="text"
                value={manualForm.websiteUrl}
                onChange={(e) =>
                  setManualForm({ ...manualForm, websiteUrl: e.target.value })
                }
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="dna-competitors"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Competitors (Optional)
              </label>
              <input
                id="dna-competitors"
                type="text"
                value={manualForm.competitors}
                onChange={(e) =>
                  setManualForm({ ...manualForm, competitors: e.target.value })
                }
                placeholder="e.g. Regional fleet operators"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dna-objective"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Main Business Objective *
              </label>
              <input
                id="dna-objective"
                type="text"
                required
                value={manualForm.mainObjective}
                onChange={(e) =>
                  setManualForm({ ...manualForm, mainObjective: e.target.value })
                }
                placeholder="e.g. Acquire 25 enterprise supply-chain accounts in Q4"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dna-challenges"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Current Marketing Challenges *
              </label>
              <textarea
                id="dna-challenges"
                rows={2}
                required
                value={manualForm.marketingChallenges}
                onChange={(e) =>
                  setManualForm({ ...manualForm, marketingChallenges: e.target.value })
                }
                placeholder="e.g. High cost per lead on search ads and unclear differentiation on our homepage"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dna-context"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Additional Business Context (Optional)
              </label>
              <textarea
                id="dna-context"
                rows={2}
                value={manualForm.additionalContext}
                onChange={(e) =>
                  setManualForm({ ...manualForm, additionalContext: e.target.value })
                }
                placeholder="Any upcoming product launches, certifications, or seasonal priorities"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Building Business DNA...</span>
                </>
              ) : (
                <span>Generate Business DNA Profile</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
