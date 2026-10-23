import React from 'react';

export const PrivacyPolicyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-6 py-16 space-y-6">
    <p className="text-xs font-mono uppercase text-[#EA580C]">Data Governance</p>
    <h1 className="font-display text-3xl font-extrabold text-[#171717]">
      Privacy Policy
    </h1>
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-[#64748B] leading-relaxed">
      <p>
        <strong className="text-[#171717]">1. Public Business DNA Analysis:</strong> When a visitor submits a public website URL or manual business profile, SENTINAL inspects only publicly accessible HTML metadata or the user-declared fields to construct a Business DNA report.
      </p>
      <p>
        <strong className="text-[#171717]">2. Client Workspace Isolation:</strong> Each approved client workspace is strictly isolated. Clients can view only their own project tasks, Business DNA profile, and Sentinalese outputs.
      </p>
      <p>
        <strong className="text-[#171717]">3. API Credential Protection:</strong> Any API keys configured in SENTINAL are encrypted on the server, never embedded in frontend bundles or browser storage, and never returned in plaintext responses.
      </p>
    </div>
  </div>
);

export const TermsOfServicePage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-6 py-16 space-y-6">
    <p className="text-xs font-mono uppercase text-[#EA580C]">Platform Terms</p>
    <h1 className="font-display text-3xl font-extrabold text-[#171717]">
      Terms of Service
    </h1>
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-[#64748B] leading-relaxed">
      <p>
        <strong className="text-[#171717]">1. Authorised Client Onboarding:</strong> Private workspace access and Sentinalese AI tools are restricted to approved clients invited by an authorised SENTINAL administrator.
      </p>
      <p>
        <strong className="text-[#171717]">2. Strategic &amp; Market Disclaimers:</strong> Growth recommendations represent structured hypotheses rather than guaranteed financial outcomes. Industry news and historical market references are provided for informational intelligence only.
      </p>
      <p>
        <strong className="text-[#171717]">3. Commercial Creative Review:</strong> Generated static advertisements must be reviewed and approved by the client before commercial publication.
      </p>
    </div>
  </div>
);
