/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { IntroAnimation } from './components/IntroAnimation';
import { PublicLayout } from './components/PublicLayout';
import { LandingPage } from './pages/LandingPage';
import { BusinessDNAPage } from './pages/BusinessDNAPage';
import { PublicSentinaleseGatePage } from './pages/PublicSentinaleseGatePage';
import { RequestQuotePage } from './pages/RequestQuotePage';
import { ClientAccessPage } from './pages/ClientAccessPage';
import { PrivacyPolicyPage, TermsOfServicePage } from './pages/LegalPages';
import {
  AdminDashboardPage,
  AdminLoginPage,
  type AdminSection,
} from './pages/AdminDashboardPage';
import {
  ClientWorkspacePage,
  type ClientSection,
} from './pages/ClientWorkspacePage';
import { apiFetch, setAuthToken } from './utils/api';

const INTRO_SESSION_KEY = 'sentinal_intro_completed_v1';

interface SessionState {
  checked: boolean;
  authenticated: boolean;
  role: 'public' | 'admin' | 'client';
  actorName?: string;
  clientId?: string;
  businessName?: string;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(
    () => window.location.pathname || '/'
  );
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    if (window.location.pathname !== '/') return false;
    try {
      return sessionStorage.getItem(INTRO_SESSION_KEY) !== '1';
    } catch {
      return false;
    }
  });

  const [session, setSession] = useState<SessionState>({
    checked: false,
    authenticated: false,
    role: 'public',
  });

  const checkSession = useCallback(async () => {
    try {
      const res = await apiFetch<{
        authenticated: boolean;
        role: 'public' | 'admin' | 'client';
        actorName?: string;
        clientId?: string;
        businessName?: string;
      }>('/api/auth/session');
      setSession({
        checked: true,
        authenticated: res.authenticated,
        role: res.role,
        actorName: res.actorName,
        clientId: res.clientId,
        businessName: res.businessName,
      });
    } catch {
      setSession({
        checked: true,
        authenticated: false,
        role: 'public',
      });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
    }
    setCurrentPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCompleteIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch {
      // ignore
    }
    setShowIntro(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthToken(null);
    await checkSession();
    navigate('/');
  }, [checkSession, navigate]);

  // Route matching & Role-based access control
  if (currentPath.startsWith('/admin') && currentPath !== '/admin/login') {
    if (session.checked && session.role !== 'admin') {
      return (
        <PublicLayout
          currentPath="/admin/login"
          navigate={navigate}
          sessionRole={session.role}
        >
          <AdminLoginPage
            onAdminAuthenticated={checkSession}
            navigate={navigate}
          />
        </PublicLayout>
      );
    }

    const sub = currentPath.replace(/^\/admin\/?/, '') || 'overview';
    const validSections: AdminSection[] = [
      'overview',
      'clients',
      'projects',
      'sentinalese-activity',
      'business-dna',
      'quotation-requests',
      'integrations',
      'notifications',
      'audit-logs',
      'settings',
    ];
    const adminSection: AdminSection = validSections.includes(sub as AdminSection)
      ? (sub as AdminSection)
      : 'overview';

    return (
      <AdminDashboardPage
        section={adminSection}
        navigate={navigate}
        onLogout={handleLogout}
        adminName={session.actorName || 'SENTINAL Administrator'}
      />
    );
  }

  if (currentPath.startsWith('/client') && currentPath !== '/client-access') {
    if (session.checked && session.role !== 'client') {
      return (
        <PublicLayout
          currentPath="/client-access"
          navigate={navigate}
          sessionRole={session.role}
        >
          <ClientAccessPage
            onClientAuthenticated={checkSession}
            navigate={navigate}
          />
        </PublicLayout>
      );
    }

    const sub = currentPath.replace(/^\/client\/?/, '') || 'overview';
    const validClientSections: ClientSection[] = [
      'overview',
      'project',
      'sentinalese',
      'business-dna',
    ];
    const clientSection: ClientSection = validClientSections.includes(
      sub as ClientSection
    )
      ? (sub as ClientSection)
      : 'overview';

    return (
      <ClientWorkspacePage
        section={clientSection}
        navigate={navigate}
        onLogout={handleLogout}
      />
    );
  }

  // Public routes wrapped in PublicLayout
  const renderPublicContent = () => {
    if (currentPath === '/admin/login') {
      return (
        <AdminLoginPage
          onAdminAuthenticated={checkSession}
          navigate={navigate}
        />
      );
    }
    if (currentPath === '/client-access') {
      return (
        <ClientAccessPage
          onClientAuthenticated={checkSession}
          navigate={navigate}
        />
      );
    }
    if (currentPath === '/sentinalese') {
      if (session.role === 'client') {
        return (
          <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#171717]">
              You are signed in as {session.businessName}
            </h1>
            <button
              type="button"
              onClick={() => navigate('/client/sentinalese')}
              className="px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
            >
              Enter Sentinalese Workspace →
            </button>
          </div>
        );
      }
      return <PublicSentinaleseGatePage navigate={navigate} />;
    }
    if (currentPath === '/request-quote') {
      return <RequestQuotePage navigate={navigate} />;
    }
    if (currentPath.startsWith('/business-dna/results/')) {
      const reportId = currentPath.replace('/business-dna/results/', '').trim();
      return <BusinessDNAPage reportId={reportId} navigate={navigate} />;
    }
    if (currentPath === '/business-dna') {
      return <BusinessDNAPage navigate={navigate} />;
    }
    if (currentPath === '/privacy') {
      return <PrivacyPolicyPage />;
    }
    if (currentPath === '/terms') {
      return <TermsOfServicePage />;
    }
    return <LandingPage navigate={navigate} />;
  };

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleCompleteIntro} />}
      <PublicLayout
        currentPath={currentPath}
        navigate={navigate}
        sessionRole={session.role}
      >
        {renderPublicContent()}
      </PublicLayout>
    </>
  );
}
