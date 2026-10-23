import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '../utils/api';

const SERVICE_CATEGORIES = [
  'Website design and development',
  'Brand identity and creative design',
  'Static advertisements',
  'Video advertisements',
  'Social media marketing',
  'Lead generation',
  'Search visibility',
  'Business growth consulting',
  'Other marketing requirements',
] as const;

interface RequestQuotePageProps {
  navigate: (to: string) => void;
}

export const RequestQuotePage: React.FC<RequestQuotePageProps> = ({ navigate }) => {
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    websiteUrl: '',
    industry: '',
    servicesRequired: [] as string[],
    mainObjective: '',
    additionalDetails: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<{
    id: string;
    businessName: string;
    createdAt: string;
  } | null>(null);

  const toggleService = (service: string) => {
    setForm((prev) => {
      const exists = prev.servicesRequired.includes(service);
      return {
        ...prev,
        servicesRequired: exists
          ? prev.servicesRequired.filter((s) => s !== service)
          : [...prev.servicesRequired, service],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.servicesRequired.length === 0) {
      setError('Please select at least one service category.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        quotation: { id: string; businessName: string; createdAt: string };
      }>('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSubmittedQuote(res.quotation);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to submit quotation request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedQuote) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 space-y-6">
          <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-mono text-[#16A34A]">
              QUOTATION REQUEST CONFIRMED · REF {submittedQuote.id}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#171717]">
              Thank You. Your Request Has Been Recorded.
            </h1>
            <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
              We have logged the marketing quotation request for{' '}
              <strong className="text-[#171717]">{submittedQuote.businessName}</strong>. Our administrator team will review your objectives and follow up with a tailored proposal.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-[#64748B]">
            Note: Submitting a quotation request does not automatically create a private client workspace. Once your engagement is approved, your administrator will issue a dedicated invitation code.
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/business-dna')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors cursor-pointer"
            >
              Explore Business DNA
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-sm font-semibold text-[#171717] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
          Marketing &amp; Growth Quotation
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#171717]">
          Request a Business Quotation
        </h1>
        <p className="text-sm sm:text-base text-[#64748B]">
          Tell us about your business, required services, and primary growth objectives.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-sm text-red-800"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="quote-name"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Your Name *
            </label>
            <input
              id="quote-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rohan Mehta"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label
              htmlFor="quote-business"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Business Name *
            </label>
            <input
              id="quote-business"
              type="text"
              required
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="e.g. Vertex Industrial Systems"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label
              htmlFor="quote-email"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Business Email *
            </label>
            <input
              id="quote-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="rohan@vertexsystems.in"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label
              htmlFor="quote-phone"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Phone Number (Optional)
            </label>
            <input
              id="quote-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label
              htmlFor="quote-website"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Business Website (Optional)
            </label>
            <input
              id="quote-website"
              type="text"
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://vertexsystems.in"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label
              htmlFor="quote-industry"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Industry *
            </label>
            <input
              id="quote-industry"
              type="text"
              required
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="e.g. Manufacturing, SaaS, Healthcare, Retail"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>
        </div>

        {/* Multi-select services */}
        <div className="space-y-2.5">
          <span className="block text-xs font-semibold text-[#171717]">
            Services Required * (Select all that apply)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SERVICE_CATEGORIES.map((service) => {
              const selected = form.servicesRequired.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  aria-pressed={selected}
                  className={`text-left px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#F97316]/10 border-[#F97316] text-[#171717] font-semibold'
                      : 'bg-[#F8FAFC] border-slate-200 text-[#64748B] hover:text-[#171717]'
                  }`}
                >
                  {selected ? '✓ ' : '+ '}
                  {service}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="quote-objective"
            className="block text-xs font-semibold text-[#171717] mb-1.5"
          >
            Main Business Objective *
          </label>
          <input
            id="quote-objective"
            type="text"
            required
            value={form.mainObjective}
            onChange={(e) => setForm({ ...form, mainObjective: e.target.value })}
            placeholder="e.g. Redesign corporate website and launch B2B static ad acquisition"
            className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <div>
          <label
            htmlFor="quote-details"
            className="block text-xs font-semibold text-[#171717] mb-1.5"
          >
            Additional Project Details (Optional)
          </label>
          <textarea
            id="quote-details"
            rows={3}
            value={form.additionalDetails}
            onChange={(e) => setForm({ ...form, additionalDetails: e.target.value })}
            placeholder="Share target timelines, target markets, or specific deliverables"
            className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <span>Submit Quotation Request</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
