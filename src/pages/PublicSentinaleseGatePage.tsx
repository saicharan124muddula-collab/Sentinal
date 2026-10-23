import React from 'react';
import { Lock, ArrowRight, KeyRound } from 'lucide-react';

interface PublicSentinaleseGatePageProps {
  navigate: (to: string) => void;
}

export const PublicSentinaleseGatePage: React.FC<PublicSentinaleseGatePageProps> = ({
  navigate,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 space-y-6">
        <div className="w-12 h-12 rounded-xl bg-[#F97316]/10 border border-[#F97316]/25 flex items-center justify-center">
          <Lock className="w-6 h-6 text-[#F97316]" />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-[#EA580C]">
            Restricted AI Growth Workspace · Sentinalese
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#171717] leading-snug">
            Sentinalese is available exclusively to selected clients. Request a business quotation to explore how SENTINAL can help your business grow.
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
            Approved clients receive personalised 7-day industry trend intelligence (Get Latest Trends), non-repeating strategic growth plans (Suggest Growth), and brand-composited static advertisement generation (Suggest Statics) powered by their Business DNA.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/request-quote')}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Request a Business Quote</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/client-access')}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#171717] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-[#64748B]" />
            <span>Client Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
