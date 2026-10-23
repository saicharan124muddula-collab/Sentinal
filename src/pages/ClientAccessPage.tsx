import React, { useState } from 'react';
import { KeyRound, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { apiFetch, setAuthToken } from '../utils/api';

interface ClientAccessPageProps {
  onClientAuthenticated: () => Promise<void>;
  navigate: (to: string) => void;
}

export const ClientAccessPage: React.FC<ClientAccessPageProps> = ({
  onClientAuthenticated,
  navigate,
}) => {
  const [tab, setTab] = useState<'activate' | 'reauth'>('activate');
  const [accessCode, setAccessCode] = useState('');
  const [clientPasskey, setClientPasskey] = useState('');
  const [email, setEmail] = useState('');
  const [reauthPasskey, setReauthPasskey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accessCode.trim()) {
      setError('Please enter your client invitation access code.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>('/api/auth/client/activate', {
        method: 'POST',
        body: JSON.stringify({
          accessCode: accessCode.trim(),
          clientPasskey: clientPasskey.trim() || undefined,
        }),
      });
      setAuthToken(res.token);
      await onClientAuthenticated();
      navigate('/client');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid, expired, or revoked client access code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>('/api/auth/client/reauth', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          passkey: reauthPasskey.trim(),
        }),
      });
      setAuthToken(res.token);
      await onClientAuthenticated();
      navigate('/client');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to sign in to client workspace.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-16 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
          Private Client Workspace
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#171717]">
          Approved Client Access
        </h1>
        <p className="text-sm text-[#64748B] leading-relaxed">
          Clients do not self-register. Enter the invitation code issued by your SENTINAL administrator to activate your workspace session, or sign in to an already activated account.
        </p>
      </div>

      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setTab('activate');
            setError(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tab === 'activate'
              ? 'bg-white text-[#171717] shadow-xs'
              : 'text-[#64748B] hover:text-[#171717]'
          }`}
        >
          Activate Invitation Code
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('reauth');
            setError(null);
          }}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            tab === 'reauth'
              ? 'bg-white text-[#171717] shadow-xs'
              : 'text-[#64748B] hover:text-[#171717]'
          }`}
        >
          Returning Activated Client
        </button>
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

      {tab === 'activate' ? (
        <form
          onSubmit={handleActivate}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5"
        >
          <div>
            <label
              htmlFor="client-invitation-code"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Client Invitation / Access Code *
            </label>
            <input
              id="client-invitation-code"
              type="text"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="SNTL-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 text-base font-mono tracking-wider uppercase bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
            <p className="text-xs text-[#64748B] mt-1.5">
              Single-use invitation credential verified on the server. Once activated, your session is bound to your workspace.
            </p>
          </div>

          <div>
            <label
              htmlFor="client-passkey-setup"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Set Workspace Passkey for Future Visits (Optional)
            </label>
            <input
              id="client-passkey-setup"
              type="password"
              value={clientPasskey}
              onChange={(e) => setClientPasskey(e.target.value)}
              placeholder="Create a passkey (min 6 characters) for future sign-ins"
              className="w-full px-4 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Access Code...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Verify &amp; Enter Client Workspace</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleReauth}
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5"
        >
          <div>
            <label
              htmlFor="returning-client-email"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Registered Business Email *
            </label>
            <input
              id="returning-client-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label
              htmlFor="returning-client-passkey"
              className="block text-xs font-semibold text-[#171717] mb-1.5"
            >
              Workspace Passkey *
            </label>
            <input
              id="returning-client-passkey"
              type="password"
              required
              value={reauthPasskey}
              onChange={(e) => setReauthPasskey(e.target.value)}
              placeholder="Enter your workspace passkey"
              className="w-full px-4 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#171717] hover:bg-neutral-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Activated Workspace</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
