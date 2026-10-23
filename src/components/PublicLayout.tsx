import React from 'react';
import { SentinalLogo } from './SentinalLogo';

interface PublicLayoutProps {
  currentPath: string;
  navigate: (to: string) => void;
  sessionRole: 'public' | 'admin' | 'client';
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  currentPath,
  navigate,
  sessionRole,
  children,
}) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#171717]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Official SENTINAL Logo */}
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            aria-label="SENTINAL Home"
            className="inline-flex items-center shrink-0"
          >
            <SentinalLogo size="md" />
          </a>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#64748B]"
          >
            <a
              href="/business-dna"
              onClick={(e) => handleLinkClick(e, '/business-dna')}
              className={`hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 ${
                currentPath.startsWith('/business-dna')
                  ? 'text-[#171717] underline underline-offset-8 decoration-[#F97316] decoration-2'
                  : ''
              }`}
            >
              Business DNA
            </a>
            <a
              href="/sentinalese"
              onClick={(e) => handleLinkClick(e, '/sentinalese')}
              className={`hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/sentinalese'
                  ? 'text-[#171717] underline underline-offset-8 decoration-[#F97316] decoration-2'
                  : ''
              }`}
            >
              Sentinalese
            </a>
            <a
              href="/request-quote"
              onClick={(e) => handleLinkClick(e, '/request-quote')}
              className={`hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/request-quote'
                  ? 'text-[#171717] underline underline-offset-8 decoration-[#F97316] decoration-2'
                  : ''
              }`}
            >
              Request Quote
            </a>
            <a
              href={sessionRole === 'client' ? '/client' : '/client-access'}
              onClick={(e) =>
                handleLinkClick(e, sessionRole === 'client' ? '/client' : '/client-access')
              }
              className={`hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/client-access'
                  ? 'text-[#171717] underline underline-offset-8 decoration-[#F97316] decoration-2'
                  : ''
              }`}
            >
              {sessionRole === 'client' ? 'Client Workspace' : 'Client Access'}
            </a>
            <a
              href={sessionRole === 'admin' ? '/admin' : '/admin/login'}
              onClick={(e) =>
                handleLinkClick(e, sessionRole === 'admin' ? '/admin' : '/admin/login')
              }
              className={`hover:text-[#171717] transition-colors whitespace-nowrap shrink-0 ${
                currentPath.startsWith('/admin')
                  ? 'text-[#171717] underline underline-offset-8 decoration-[#F97316] decoration-2'
                  : ''
              }`}
            >
              {sessionRole === 'admin' ? 'Admin Panel' : 'Admin Login'}
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/business-dna')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Discover Business DNA
            </button>
          </div>
        </div>

        {/* Mobile Quick Links Bar */}
        <nav
          aria-label="Mobile Navigation"
          className="flex md:hidden items-center justify-between gap-2 overflow-x-auto px-3 py-2.5 border-t border-slate-100 text-[11px] font-medium text-[#64748B]"
        >
          <a
            href="/business-dna"
            onClick={(e) => handleLinkClick(e, '/business-dna')}
            className="whitespace-nowrap shrink-0 hover:text-[#171717]"
          >
            Business DNA
          </a>
          <a
            href="/sentinalese"
            onClick={(e) => handleLinkClick(e, '/sentinalese')}
            className="whitespace-nowrap shrink-0 hover:text-[#171717]"
          >
            Sentinalese
          </a>
          <a
            href="/request-quote"
            onClick={(e) => handleLinkClick(e, '/request-quote')}
            className="whitespace-nowrap shrink-0 hover:text-[#171717]"
          >
            Request Quote
          </a>
          <a
            href={sessionRole === 'client' ? '/client' : '/client-access'}
            onClick={(e) =>
              handleLinkClick(e, sessionRole === 'client' ? '/client' : '/client-access')
            }
            className="whitespace-nowrap shrink-0 hover:text-[#171717]"
          >
            Client Access
          </a>
          <a
            href={sessionRole === 'admin' ? '/admin' : '/admin/login'}
            onClick={(e) =>
              handleLinkClick(e, sessionRole === 'admin' ? '/admin' : '/admin/login')
            }
            className="whitespace-nowrap shrink-0 hover:text-[#171717]"
          >
            Admin
          </a>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {/* Corporate Footer */}
      <footer className="bg-[#171717] text-white border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-neutral-800">
            <div className="md:col-span-5 space-y-4">
              <SentinalLogo variant="dark" size="lg" />
              <p className="font-display text-lg font-semibold text-[#F97316]">
                Brand Banao. Duniya Hilao.
              </p>
              <p className="text-sm text-neutral-400 max-w-sm leading-relaxed">
                Business intelligence, digital identity decoding, Sentinalese AI growth workflows, and transparent client project execution.
              </p>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Platform Navigation
              </h3>
              <ul className="space-y-2.5 text-sm text-neutral-300">
                <li>
                  <a
                    href="/"
                    onClick={(e) => handleLinkClick(e, '/')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Public Overview
                  </a>
                </li>
                <li>
                  <a
                    href="/business-dna"
                    onClick={(e) => handleLinkClick(e, '/business-dna')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Business DNA Analyser
                  </a>
                </li>
                <li>
                  <a
                    href="/sentinalese"
                    onClick={(e) => handleLinkClick(e, '/sentinalese')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Sentinalese Growth Workspace
                  </a>
                </li>
                <li>
                  <a
                    href="/request-quote"
                    onClick={(e) => handleLinkClick(e, '/request-quote')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Request a Business Quote
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Workspaces & Governance
              </h3>
              <ul className="space-y-2.5 text-sm text-neutral-300">
                <li>
                  <a
                    href="/client-access"
                    onClick={(e) => handleLinkClick(e, '/client-access')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Client Access
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/login"
                    onClick={(e) => handleLinkClick(e, '/admin/login')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Administrator Sign In
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    onClick={(e) => handleLinkClick(e, '/privacy')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    onClick={(e) => handleLinkClick(e, '/terms')}
                    className="hover:text-[#F97316] transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-neutral-400">
            <p>© {new Date().getFullYear()} SENTINAL. All rights reserved.</p>
            <p>
              For inquiries, submit a request via{' '}
              <a
                href="/request-quote"
                onClick={(e) => handleLinkClick(e, '/request-quote')}
                className="text-white underline hover:text-[#F97316]"
              >
                Request a Business Quote
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
