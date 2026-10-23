import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  ExternalLink,
  FileSearch,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sliders,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { SentinalLogo } from '../components/SentinalLogo';
import type {
  AIProviderConfigView,
  AuditLogRecord,
  BusinessDNAReport,
  ClientRecord,
  GeneratedAdvertisement,
  GrowthRecommendationItem,
  NotificationRecord,
  ProjectRecord,
  QuotationRequest,
  SentinaleseActivityRecord,
  TaskProgressHistoryRecord,
  TaskRecord,
} from '../types/sentinal';
import { apiFetch, setAuthToken } from '../utils/api';
import { PERMITTED_PROGRESS_INCREMENTS } from '../utils/domainLogic';

export type AdminSection =
  | 'overview'
  | 'clients'
  | 'projects'
  | 'sentinalese-activity'
  | 'business-dna'
  | 'quotation-requests'
  | 'integrations'
  | 'notifications'
  | 'audit-logs'
  | 'settings';

interface EnrichedClient extends ClientRecord {
  project: ProjectRecord | null;
  invitation: {
    id: string;
    codePrefix: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    consumedAt?: string;
    revokedAt?: string;
    canRevealPlaintext: boolean;
    revealedPlaintext: string | null;
  } | null;
  sentinaleseCount: number;
}

interface EnrichedProject extends ProjectRecord {
  clientBusinessName: string;
  clientStatus: string;
  tasks: TaskRecord[];
}

interface AdminLoginPageProps {
  onAdminAuthenticated: () => Promise<void>;
  navigate: (to: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onAdminAuthenticated,
  navigate,
}) => {
  const [email, setEmail] = useState('admin@sentinal.in');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.token);
      await onAdminAuthenticated();
      navigate('/admin');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Administrator authentication failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#EA580C]">
          Authorised Internal Access
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#171717]">
          Administrator Sign In
        </h1>
        <p className="text-sm text-[#64748B]">
          Sign in to manage clients, invitation codes, project tasks, and Sentinalese governance.
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
        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5"
      >
        <div>
          <label
            htmlFor="admin-email"
            className="block text-xs font-semibold text-[#171717] mb-1.5"
          >
            Administrator Email *
          </label>
          <input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-xs font-semibold text-[#171717] mb-1.5"
          >
            Password *
          </label>
          <input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter administrator password"
            className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between gap-2 text-xs text-[#64748B]">
          <span>
            Default Workspace Credential:{' '}
            <code className="font-mono text-[#171717]">Sentinal@2026</code>
          </span>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@sentinal.in');
              setPassword('Sentinal@2026');
            }}
            className="font-semibold text-[#F97316] hover:underline shrink-0 cursor-pointer"
          >
            Fill Default
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Sign In to Administrator Panel</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

interface AdminDashboardPageProps {
  section: AdminSection;
  navigate: (to: string) => void;
  onLogout: () => Promise<void>;
  adminName: string;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  section,
  navigate,
  onLogout,
  adminName,
}) => {
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Data states
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    activeClients: 0,
    activeProjects: 0,
    tasksInProgress: 0,
    completedTasks: 0,
    pendingQuotations: 0,
    totalBusinessDNAReports: 0,
    unreadNotifications: 0,
  });
  const [clients, setClients] = useState<EnrichedClient[]>([]);
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [activities, setActivities] = useState<SentinaleseActivityRecord[]>([]);
  const [advertisements, setAdvertisements] = useState<GeneratedAdvertisement[]>([]);
  const [dnaReports, setDnaReports] = useState<BusinessDNAReport[]>([]);
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [integrations, setIntegrations] = useState<AIProviderConfigView[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [progressHistory, setProgressHistory] = useState<TaskProgressHistoryRecord[]>([]);

  // UI filters & modals
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [revealedCodeByClientId, setRevealedCodeByClientId] = useState<Record<string, boolean>>({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Add Client Form State
  const [newClientForm, setNewClientForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    websiteUrl: '',
    industry: '',
    projectName: '',
    projectDescription: '',
    projectStartDate: '',
    expectedCompletionDate: '',
    internalNotes: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [newlyIssuedCodeBanner, setNewlyIssuedCodeBanner] = useState<{
    businessName: string;
    code: string;
  } | null>(null);

  // Task Creation Form State per Project
  const [activeTaskProjectId, setActiveTaskProjectId] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    previewUrl: '',
    assignedMember: '',
    startDate: '',
    dueDate: '',
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // Sentinalese Activity Filter State
  const [activityClientFilter, setActivityClientFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activityStatusFilter, setActivityStatusFilter] = useState('all');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    adminName: adminName || 'SENTINAL Administrator',
    currentPassword: '',
    newPassword: '',
  });

  const refreshAllAdminData = useCallback(async () => {
    try {
      const [
        ovRes,
        cliRes,
        prjRes,
        actRes,
        dnaRes,
        quoRes,
        intRes,
        notRes,
        audRes,
      ] = await Promise.all([
        apiFetch<{
          metrics: typeof metrics;
        }>('/api/admin/overview'),
        apiFetch<{ clients: EnrichedClient[] }>('/api/admin/clients'),
        apiFetch<{ projects: EnrichedProject[] }>('/api/admin/projects'),
        apiFetch<{
          activities: SentinaleseActivityRecord[];
          advertisements: GeneratedAdvertisement[];
          recommendations: GrowthRecommendationItem[];
        }>('/api/admin/sentinalese-activity'),
        apiFetch<{ reports: BusinessDNAReport[] }>('/api/admin/business-dna'),
        apiFetch<{ quotations: QuotationRequest[] }>('/api/admin/quotations'),
        apiFetch<{ integrations: AIProviderConfigView[] }>('/api/admin/integrations'),
        apiFetch<{ notifications: NotificationRecord[] }>('/api/admin/notifications'),
        apiFetch<{
          auditLogs: AuditLogRecord[];
          taskProgressHistory: TaskProgressHistoryRecord[];
        }>('/api/admin/audit-logs'),
      ]);

      setMetrics(ovRes.metrics);
      setClients(cliRes.clients);
      setProjects(prjRes.projects);
      setActivities(actRes.activities);
      setAdvertisements(actRes.advertisements);
      setDnaReports(dnaRes.reports);
      setQuotations(quoRes.quotations);
      setIntegrations(intRes.integrations);
      setNotifications(notRes.notifications);
      setAuditLogs(audRes.auditLogs);
      setProgressHistory(audRes.taskProgressHistory);
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load administrator data.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllAdminData();
  }, [refreshAllAdminData, section]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingClient(true);
    setBannerMsg(null);
    try {
      const res = await apiFetch<{
        client: ClientRecord;
        invitation: { revealedPlaintext: string };
      }>('/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify(newClientForm),
      });

      setNewlyIssuedCodeBanner({
        businessName: res.client.businessName,
        code: res.invitation.revealedPlaintext,
      });
      setRevealedCodeByClientId((prev) => ({
        ...prev,
        [res.client.id]: true,
      }));
      setNewClientForm({
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        websiteUrl: '',
        industry: '',
        projectName: '',
        projectDescription: '',
        projectStartDate: '',
        expectedCompletionDate: '',
        internalNotes: '',
      });
      setShowAddClientModal(false);
      await refreshAllAdminData();
      setBannerMsg({
        type: 'success',
        text: `Client "${res.client.businessName}" and project created. Unique invitation code generated.`,
      });
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create client.',
      });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleRegenerateCode = async (clientId: string, businessName: string) => {
    try {
      const res = await apiFetch<{
        invitation: { revealedPlaintext: string };
      }>(`/api/admin/clients/${clientId}/regenerate-code`, {
        method: 'POST',
      });
      setRevealedCodeByClientId((prev) => ({ ...prev, [clientId]: true }));
      setNewlyIssuedCodeBanner({
        businessName,
        code: res.invitation.revealedPlaintext,
      });
      await refreshAllAdminData();
      setBannerMsg({
        type: 'success',
        text: `Regenerated invitation code for ${businessName}. Previous code has been invalidated.`,
      });
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to regenerate code.',
      });
    }
  };

  const handleRevokeCode = async (clientId: string, businessName: string) => {
    try {
      await apiFetch(`/api/admin/clients/${clientId}/revoke-code`, {
        method: 'POST',
      });
      await refreshAllAdminData();
      setBannerMsg({
        type: 'success',
        text: `Invitation code for ${businessName} has been revoked.`,
      });
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to revoke code.',
      });
    }
  };

  const handleToggleClientStatus = async (
    clientId: string,
    currentStatus: string,
    businessName: string
  ) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshAllAdminData();
      setBannerMsg({
        type: 'success',
        text: `Client "${businessName}" workspace status updated to ${nextStatus}.`,
      });
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update client status.',
      });
    }
  };

  const handleCreateTask = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    setCreatingTask(true);
    setBannerMsg(null);
    try {
      await apiFetch(`/api/admin/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(newTaskForm),
      });
      setNewTaskForm({
        title: '',
        description: '',
        previewUrl: '',
        assignedMember: '',
        startDate: '',
        dueDate: '',
      });
      setActiveTaskProjectId(null);
      await refreshAllAdminData();
      setBannerMsg({
        type: 'success',
        text: 'Task added and overall project progress recalculated.',
      });
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create task.',
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskProgressChange = async (
    taskId: string,
    newProgress: number,
    isBlocked?: boolean
  ) => {
    try {
      await apiFetch(`/api/admin/tasks/${taskId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ progress: newProgress, isBlocked }),
      });
      await refreshAllAdminData();
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save task progress.',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/admin/tasks/${taskId}`, { method: 'DELETE' });
      await refreshAllAdminData();
      setBannerMsg({
        type: 'success',
        text: 'Task deleted and overall project progress recalculated.',
      });
    } catch (err: unknown) {
      setBannerMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete task.',
      });
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const sidebarItems: {
    id: AdminSection;
    label: string;
    path: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'overview', label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', path: '/admin/clients', icon: Users },
    {
      id: 'projects',
      label: 'Projects and Tasks',
      path: '/admin/projects',
      icon: FolderKanban,
    },
    {
      id: 'sentinalese-activity',
      label: 'Sentinalese Activity',
      path: '/admin/sentinalese-activity',
      icon: Activity,
    },
    {
      id: 'business-dna',
      label: 'Business DNA',
      path: '/admin/business-dna',
      icon: FileSearch,
    },
    {
      id: 'quotation-requests',
      label: 'Quotation Requests',
      path: '/admin/quotation-requests',
      icon: Briefcase,
    },
    {
      id: 'integrations',
      label: 'AI Integrations',
      path: '/admin/integrations',
      icon: Cpu,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      path: '/admin/notifications',
      icon: Bell,
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      path: '/admin/audit-logs',
      icon: ClipboardList,
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/admin/settings',
      icon: Settings,
    },
  ];

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      !clientSearch.trim() ||
      c.businessName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.contactName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.industry.toLowerCase().includes(clientSearch.toLowerCase());
    const matchesStatus =
      clientStatusFilter === 'all' || c.status === clientStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredActivities = activities.filter((act) => {
    const matchClient =
      activityClientFilter === 'all' || act.clientId === activityClientFilter;
    const matchType =
      activityTypeFilter === 'all' || act.actionType === activityTypeFilter;
    const matchStatus =
      activityStatusFilter === 'all' || act.status === activityStatusFilter;
    return matchClient && matchType && matchStatus;
  });

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#171717]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#171717] text-white flex flex-col justify-between shrink-0 border-r border-neutral-800">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            >
              <SentinalLogo variant="dark" size="md" />
            </a>
          </div>

          <nav aria-label="Administrator Sidebar" className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#F97316] text-white'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-neutral-800 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-white truncate">{adminName}</p>
            <p className="text-neutral-400">Authorised Administrator</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#64748B]">Administrator Workspace</span>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span className="font-display font-bold text-[#171717]">
              {sidebarItems.find((i) => i.id === section)?.label || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowAddClientModal(true);
                if (section !== 'clients' && section !== 'overview') {
                  navigate('/admin/clients');
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
          {bannerMsg && (
            <div
              role="alert"
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-sm ${
                bannerMsg.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{bannerMsg.text}</span>
              <button
                type="button"
                onClick={() => setBannerMsg(null)}
                className="text-xs font-semibold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {newlyIssuedCodeBanner && (
            <div className="p-5 rounded-2xl bg-[#171717] text-white border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-mono text-[#F97316] uppercase">
                  NEW INVITATION CODE GENERATED FOR {newlyIssuedCodeBanner.businessName}
                </p>
                <p className="font-mono text-xl font-bold tracking-wider text-white">
                  {newlyIssuedCodeBanner.code}
                </p>
                <p className="text-xs text-neutral-400">
                  Share this code securely with the client outside the application. Only its cryptographic SHA-256 hash is stored on disk.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCode(newlyIssuedCodeBanner.code, 'banner')
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>
                    {copiedCodeId === 'banner' ? 'Copied!' : 'Copy Access Code'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewlyIssuedCodeBanner(null)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Hide
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-[#F97316] animate-spin mx-auto" />
              <p className="text-xs text-[#64748B]">Loading workspace state...</p>
            </div>
          ) : (
            <>
              {/* 1. OVERVIEW SECTION */}
              {section === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <p className="text-xs text-[#64748B]">Active Clients</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#171717] tabular-nums">
                        {metrics.activeClients}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <p className="text-xs text-[#64748B]">Active Projects</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#171717] tabular-nums">
                        {metrics.activeProjects}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <p className="text-xs text-[#64748B]">Tasks in Progress</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#38BDF8] tabular-nums">
                        {metrics.tasksInProgress}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <p className="text-xs text-[#64748B]">Completed Tasks</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#16A34A] tabular-nums">
                        {metrics.completedTasks}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <p className="text-xs text-[#64748B]">Pending Quotes</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#F97316] tabular-nums">
                        {metrics.pendingQuotations}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <p className="text-xs text-[#64748B]">Sentinalese Runs</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#171717] tabular-nums">
                        {activities.length}
                      </p>
                    </div>
                  </div>

                  {clients.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                      <Users className="w-10 h-10 text-[#F97316] mx-auto" />
                      <h2 className="font-display text-xl font-bold text-[#171717]">
                        No clients yet. Add your first client to begin managing projects.
                      </h2>
                      <p className="text-sm text-[#64748B] max-w-md mx-auto">
                        SENTINAL starts with a clean database state—no imaginary clients or demo tasks. Create a client record to issue an invitation code and assign project tasks.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddClientModal(true)}
                          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Client</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-base font-bold text-[#171717]">
                            Active Client Projects
                          </h3>
                          <button
                            type="button"
                            onClick={() => navigate('/admin/projects')}
                            className="text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                          >
                            Manage All →
                          </button>
                        </div>
                        <div className="space-y-3">
                          {projects.slice(0, 5).map((p) => (
                            <div
                              key={p.id}
                              className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between gap-4"
                            >
                              <div>
                                <p className="font-display text-sm font-bold text-[#171717]">
                                  {p.name}
                                </p>
                                <p className="text-xs text-[#64748B]">
                                  {p.clientBusinessName} ·{' '}
                                  {p.taskCount === 0
                                    ? 'No tasks added yet'
                                    : `${p.taskCount} tasks`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-sm font-bold text-[#171717] tabular-nums">
                                  {p.taskCount === 0
                                    ? 'Not started'
                                    : `${p.overallProgress}%`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-base font-bold text-[#171717]">
                            Recent Sentinalese Activity
                          </h3>
                          <button
                            type="button"
                            onClick={() => navigate('/admin/sentinalese-activity')}
                            className="text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                          >
                            View Activity →
                          </button>
                        </div>
                        {activities.length === 0 ? (
                          <p className="text-sm text-[#64748B] py-6">
                            No Sentinalese AI operations have been executed by clients yet.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {activities.slice(0, 5).map((act) => (
                              <div
                                key={act.id}
                                className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between gap-4 text-xs"
                              >
                                <div>
                                  <p className="font-semibold text-[#171717]">
                                    {act.clientBusinessName} · {act.actionType}
                                  </p>
                                  <p className="text-[#64748B] font-mono mt-0.5">
                                    {new Date(act.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <span className="font-mono font-semibold text-[#16A34A]">
                                  {act.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. CLIENTS SECTION */}
              {section === 'clients' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search clients by business, contact, email or industry..."
                        aria-label="Search clients"
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                        {(['all', 'active', 'suspended'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setClientStatusFilter(st)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                              clientStatusFilter === st
                                ? 'bg-white text-[#171717] shadow-xs'
                                : 'text-[#64748B] hover:text-[#171717]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {clients.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                      <h2 className="font-display text-xl font-bold text-[#171717]">
                        No clients yet. Add your first client to begin managing projects.
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowAddClientModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Client</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredClients.map((client) => {
                        const inv = client.invitation;
                        const isRevealed = Boolean(revealedCodeByClientId[client.id]);
                        return (
                          <div
                            key={client.id}
                            className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-display text-lg font-bold text-[#171717]">
                                    {client.businessName}
                                  </h3>
                                  <span className="text-xs text-[#64748B]">·</span>
                                  <span className="text-xs font-mono text-[#171717]">
                                    Account: {client.status.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-xs text-[#64748B]">
                                  Contact: <strong className="text-[#171717]">{client.contactName}</strong> ·{' '}
                                  {client.email}
                                  {client.phone ? ` · ${client.phone}` : ''} · Industry:{' '}
                                  {client.industry}
                                </p>
                                {client.internalNotes && (
                                  <p className="text-xs text-[#64748B] italic pt-1">
                                    Internal Admin Note (Hidden from client): {client.internalNotes}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => navigate('/admin/projects')}
                                  className="px-3 py-1.5 text-xs font-semibold text-[#171717] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                >
                                  Project ({client.project?.overallProgress ?? 0}%)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleClientStatus(
                                      client.id,
                                      client.status,
                                      client.businessName
                                    )
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-[#171717] border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  {client.status === 'active'
                                    ? 'Suspend Account'
                                    : 'Reactivate Account'}
                                </button>
                              </div>
                            </div>

                            {/* Invitation Code Lifecycle Bar */}
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <KeyRound className="w-4 h-4 text-[#F97316]" />
                                  <span className="font-semibold text-[#171717]">
                                    Invitation Code Status:
                                  </span>
                                  <span className="font-mono uppercase text-[#171717]">
                                    {inv ? inv.status : 'None'}
                                  </span>
                                </div>
                                {inv && (
                                  <p className="font-mono text-sm font-bold text-[#171717]">
                                    {isRevealed && inv.revealedPlaintext
                                      ? inv.revealedPlaintext
                                      : inv.codePrefix}
                                  </p>
                                )}
                                {inv && !inv.canRevealPlaintext && inv.status === 'active' && (
                                  <p className="text-xs text-[#64748B]">
                                    Stored as SHA-256 hash only; plaintext cannot be recovered. Regenerate to issue a new shareable code.
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {inv?.canRevealPlaintext && inv.revealedPlaintext && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRevealedCodeByClientId((prev) => ({
                                          ...prev,
                                          [client.id]: !isRevealed,
                                        }))
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                                    >
                                      {isRevealed ? (
                                        <>
                                          <EyeOff className="w-3.5 h-3.5" />
                                          <span>Hide Code</span>
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Reveal Code</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyCode(inv.revealedPlaintext!, client.id)
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>
                                        {copiedCodeId === client.id ? 'Copied!' : 'Copy Code'}
                                      </span>
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRegenerateCode(client.id, client.businessName)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Regenerate Code</span>
                                </button>

                                {inv && inv.status === 'active' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRevokeCode(client.id, client.businessName)
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Revoke Code</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. PROJECTS AND TASKS SECTION */}
              {section === 'projects' && (
                <div className="space-y-8">
                  {projects.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                      <h2 className="font-display text-xl font-bold text-[#171717]">
                        No clients yet. Add your first client to begin managing projects.
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowAddClientModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Client</span>
                      </button>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6"
                      >
                        {/* Project Header & Overall Progress */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                          <div className="space-y-1">
                            <p className="text-xs font-mono text-[#EA580C] uppercase">
                              CLIENT: {project.clientBusinessName}
                            </p>
                            <h2 className="font-display text-2xl font-bold text-[#171717]">
                              {project.name}
                            </h2>
                            {project.description && (
                              <p className="text-sm text-[#64748B]">
                                {project.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-[#64748B]">
                                Overall Project Progress
                              </p>
                              <p className="font-mono text-2xl font-extrabold text-[#171717] tabular-nums">
                                {project.taskCount === 0
                                  ? 'Not started'
                                  : `${project.overallProgress}%`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveTaskProjectId(
                                  activeTaskProjectId === project.id ? null : project.id
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add Task</span>
                            </button>
                          </div>
                        </div>

                        {/* Overall Progress Bar */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#16A34A] transition-all duration-200 rounded-full"
                            style={{
                              width: `${project.taskCount === 0 ? 0 : project.overallProgress}%`,
                            }}
                          />
                        </div>

                        {/* Add Task Inline Form */}
                        {activeTaskProjectId === project.id && (
                          <form
                            onSubmit={(e) => handleCreateTask(e, project.id)}
                            className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-4"
                          >
                            <h3 className="font-display text-sm font-bold text-[#171717]">
                              Create New Task for {project.name}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label
                                  htmlFor={`task-title-${project.id}`}
                                  className="block text-xs font-semibold text-[#171717] mb-1"
                                >
                                  Task Title *
                                </label>
                                <input
                                  id={`task-title-${project.id}`}
                                  type="text"
                                  required
                                  value={newTaskForm.title}
                                  onChange={(e) =>
                                    setNewTaskForm({ ...newTaskForm, title: e.target.value })
                                  }
                                  placeholder="e.g. Website Design"
                                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`task-preview-${project.id}`}
                                  className="block text-xs font-semibold text-[#171717] mb-1"
                                >
                                  Preview URL (Optional — Never Mandatory)
                                </label>
                                <input
                                  id={`task-preview-${project.id}`}
                                  type="text"
                                  value={newTaskForm.previewUrl}
                                  onChange={(e) =>
                                    setNewTaskForm({
                                      ...newTaskForm,
                                      previewUrl: e.target.value,
                                    })
                                  }
                                  placeholder="https://figma.com/... or leave blank"
                                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label
                                  htmlFor={`task-desc-${project.id}`}
                                  className="block text-xs font-semibold text-[#171717] mb-1"
                                >
                                  Task Description (Optional)
                                </label>
                                <input
                                  id={`task-desc-${project.id}`}
                                  type="text"
                                  value={newTaskForm.description}
                                  onChange={(e) =>
                                    setNewTaskForm({
                                      ...newTaskForm,
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Design the business website according to the approved brand direction."
                                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`task-assignee-${project.id}`}
                                  className="block text-xs font-semibold text-[#171717] mb-1"
                                >
                                  Assigned Team Member (Optional)
                                </label>
                                <input
                                  id={`task-assignee-${project.id}`}
                                  type="text"
                                  value={newTaskForm.assignedMember}
                                  onChange={(e) =>
                                    setNewTaskForm({
                                      ...newTaskForm,
                                      assignedMember: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. Creative Lead"
                                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`task-due-${project.id}`}
                                  className="block text-xs font-semibold text-[#171717] mb-1"
                                >
                                  Due Date (Optional)
                                </label>
                                <input
                                  id={`task-due-${project.id}`}
                                  type="date"
                                  value={newTaskForm.dueDate}
                                  onChange={(e) =>
                                    setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })
                                  }
                                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#F97316]"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTaskProjectId(null)}
                                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#171717] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={creatingTask}
                                className="px-5 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                              >
                                {creatingTask ? 'Saving...' : 'Save Task'}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Task List with Mark Progress Sliders */}
                        {project.tasks.length === 0 ? (
                          <div className="p-8 rounded-xl bg-[#F8FAFC] border border-slate-200 text-center text-sm text-[#64748B]">
                            No tasks added yet · Project Progress: Not started
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {project.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-4"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-display text-base font-bold text-[#171717]">
                                        {task.title}
                                      </h3>
                                      <span className="text-xs text-[#64748B]">·</span>
                                      <span
                                        className={`font-mono text-xs font-semibold ${
                                          task.status === 'Completed'
                                            ? 'text-[#16A34A]'
                                            : task.status === 'Blocked'
                                            ? 'text-red-600'
                                            : task.status === 'In Progress'
                                            ? 'text-[#F97316]'
                                            : 'text-[#64748B]'
                                        }`}
                                      >
                                        {task.status}
                                      </span>
                                    </div>
                                    {task.description && (
                                      <p className="text-xs sm:text-sm text-[#64748B]">
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#64748B]">
                                      {task.previewUrl ? (
                                        <a
                                          href={task.previewUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 font-semibold text-[#F97316] hover:underline"
                                        >
                                          <span>Open Task Preview</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      ) : (
                                        <span>Preview not available yet.</span>
                                      )}
                                      {task.assignedMember && (
                                        <span>· Assigned: {task.assignedMember}</span>
                                      )}
                                      {task.dueDate && <span>· Due: {task.dueDate}</span>}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleTaskProgressChange(
                                          task.id,
                                          task.progress,
                                          !task.isBlocked
                                        )
                                      }
                                      className={`px-2.5 py-1 text-xs font-semibold rounded border cursor-pointer ${
                                        task.isBlocked
                                          ? 'bg-red-50 border-red-200 text-red-700'
                                          : 'bg-white border-slate-300 text-[#64748B] hover:text-[#171717]'
                                      }`}
                                    >
                                      {task.isBlocked ? 'Unblock Task' : 'Mark Blocked'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      aria-label={`Delete task ${task.title}`}
                                      className="p-1.5 text-[#64748B] hover:text-red-600 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* REQUIRED MARK PROGRESS CONTROL */}
                                <div className="pt-3 border-t border-slate-200/80 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label
                                      htmlFor={`slider-${task.id}`}
                                      className="font-display text-xs font-bold text-[#171717]"
                                    >
                                      Mark Progress
                                    </label>
                                    <span className="font-mono text-xs font-bold text-[#F97316] tabular-nums">
                                      Mark Progress: {task.progress}%
                                    </span>
                                  </div>

                                  <input
                                    id={`slider-${task.id}`}
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={10}
                                    value={task.progress}
                                    onChange={(e) =>
                                      handleTaskProgressChange(
                                        task.id,
                                        Number(e.target.value),
                                        task.isBlocked
                                      )
                                    }
                                    className="w-full sentinal-slider"
                                  />

                                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] tabular-nums">
                                    {PERMITTED_PROGRESS_INCREMENTS.map((inc) => (
                                      <button
                                        key={inc}
                                        type="button"
                                        onClick={() =>
                                          handleTaskProgressChange(
                                            task.id,
                                            inc,
                                            task.isBlocked
                                          )
                                        }
                                        className={`hover:text-[#F97316] cursor-pointer ${
                                          task.progress === inc
                                            ? 'font-bold text-[#F97316]'
                                            : ''
                                        }`}
                                      >
                                        {inc}%
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 4. SENTINALESE ACTIVITY SECTION */}
              {section === 'sentinalese-activity' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-lg font-bold text-[#171717]">
                          Sentinalese Activity Log Across Approved Clients
                        </h2>
                        <p className="text-xs text-[#64748B]">
                          Real execution records for Get Latest Trends, Suggest Growth, and Suggest Statics.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          aria-label="Filter by client"
                          value={activityClientFilter}
                          onChange={(e) => setActivityClientFilter(e.target.value)}
                          className="px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-lg"
                        >
                          <option value="all">All Clients</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.businessName}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label="Filter by action type"
                          value={activityTypeFilter}
                          onChange={(e) => setActivityTypeFilter(e.target.value)}
                          className="px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-lg"
                        >
                          <option value="all">All Action Types</option>
                          <option value="Get Latest Trends">Get Latest Trends</option>
                          <option value="Suggest Growth">Suggest Growth</option>
                          <option value="Suggest Statics">Suggest Statics</option>
                        </select>

                        <select
                          aria-label="Filter by status"
                          value={activityStatusFilter}
                          onChange={(e) => setActivityStatusFilter(e.target.value)}
                          className="px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-300 rounded-lg"
                        >
                          <option value="all">All Statuses</option>
                          <option value="Completed">Completed</option>
                          <option value="Failed">Failed</option>
                        </select>
                      </div>
                    </div>

                    {filteredActivities.length === 0 ? (
                      <div className="py-12 text-center text-sm text-[#64748B]">
                        No Sentinalese activities match the current filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[#64748B]">
                              <th className="py-3 px-3 font-semibold">Timestamp</th>
                              <th className="py-3 px-3 font-semibold">Client</th>
                              <th className="py-3 px-3 font-semibold">Action Type</th>
                              <th className="py-3 px-3 font-semibold">Status</th>
                              <th className="py-3 px-3 font-semibold">Output Metadata</th>
                              <th className="py-3 px-3 font-semibold">Provider / Model</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredActivities.map((act) => (
                              <tr key={act.id} className="hover:bg-slate-50">
                                <td className="py-3 px-3 font-mono tabular-nums text-[#64748B]">
                                  {new Date(act.timestamp).toLocaleString()}
                                </td>
                                <td className="py-3 px-3 font-semibold text-[#171717]">
                                  {act.clientBusinessName}
                                </td>
                                <td className="py-3 px-3 font-medium text-[#171717]">
                                  {act.actionType}
                                </td>
                                <td className="py-3 px-3 font-mono">
                                  <span
                                    className={
                                      act.status === 'Completed'
                                        ? 'text-[#16A34A] font-semibold'
                                        : 'text-red-600 font-semibold'
                                    }
                                  >
                                    {act.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-mono text-[#64748B]">
                                  {act.newsResultCount !== undefined &&
                                    `${act.newsResultCount} news items`}
                                  {act.recommendationsCount !== undefined &&
                                    `${act.recommendationsCount} recommendations`}
                                  {act.assetReferenceId &&
                                    `Ad Asset: ${act.assetReferenceId}`}
                                  {act.failureSummary && `Error: ${act.failureSummary}`}
                                </td>
                                <td className="py-3 px-3 text-[#64748B]">
                                  {act.providerModelMetadata}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {advertisements.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                      <h3 className="font-display text-base font-bold text-[#171717]">
                        Generated Client Advertisements ({advertisements.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {advertisements.slice(0, 6).map((ad) => (
                          <div
                            key={ad.id}
                            className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3"
                          >
                            {ad.imageDataUrl && (
                              <img
                                src={ad.imageDataUrl}
                                alt={ad.offerMessage}
                                className="w-full h-48 object-contain bg-neutral-900 rounded-lg"
                              />
                            )}
                            <div className="text-xs space-y-1">
                              <p className="font-bold text-[#171717]">
                                {ad.productService} · v{ad.versionNumber}
                              </p>
                              <p className="text-[#64748B] font-mono">
                                {ad.aspectRatio} · Asset ID: {ad.id}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. BUSINESS DNA SECTION */}
              {section === 'business-dna' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#171717]">
                        Saved Business DNA Analyses ({dnaReports.length})
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Inspect public and client-linked Business DNA reports.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/business-dna')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                    >
                      Run New Analysis
                    </button>
                  </div>

                  {dnaReports.length === 0 ? (
                    <p className="text-sm text-[#64748B] py-8 text-center">
                      No Business DNA reports have been generated yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dnaReports.map((rep) => (
                        <div
                          key={rep.id}
                          className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <p className="font-display text-sm font-bold text-[#171717]">
                              {rep.businessName} ·{' '}
                              <span className="font-normal text-[#64748B]">
                                {rep.industry}
                              </span>
                            </p>
                            <p className="text-xs text-[#64748B] font-mono">
                              ID: {rep.id} · Source: {rep.sourceType} ·{' '}
                              {new Date(rep.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/business-dna/results/${rep.id}`)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-[#171717] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shrink-0 cursor-pointer"
                          >
                            View Full Report
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 6. QUOTATION REQUESTS SECTION */}
              {section === 'quotation-requests' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#171717]">
                      Marketing Quotation Requests ({quotations.length})
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Review public inquiries, update status, or onboard approved prospects as clients.
                    </p>
                  </div>

                  {quotations.length === 0 ? (
                    <p className="text-sm text-[#64748B] py-8 text-center">
                      No marketing quotation requests submitted yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {quotations.map((q) => (
                        <div
                          key={q.id}
                          className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-1">
                              <h3 className="font-display text-base font-bold text-[#171717]">
                                {q.businessName} ({q.name})
                              </h3>
                              <p className="text-xs text-[#64748B]">
                                {q.email}
                                {q.phone ? ` · ${q.phone}` : ''} · Industry: {q.industry}
                              </p>
                              <p className="text-xs text-[#171717] pt-1">
                                <strong>Services:</strong> {q.servicesRequired.join(', ')}
                              </p>
                              <p className="text-xs text-[#171717]">
                                <strong>Objective:</strong> {q.mainObjective}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <select
                                aria-label={`Status for ${q.businessName}`}
                                value={q.status}
                                onChange={async (e) => {
                                  await apiFetch(`/api/admin/quotations/${q.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: e.target.value }),
                                  });
                                  await refreshAllAdminData();
                                }}
                                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg"
                              >
                                <option value="Pending Review">Pending Review</option>
                                <option value="In Discussion">In Discussion</option>
                                <option value="Proposal Sent">Proposal Sent</option>
                                <option value="Converted to Client">Converted to Client</option>
                                <option value="Archived">Archived</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setNewClientForm({
                                    businessName: q.businessName,
                                    contactName: q.name,
                                    email: q.email,
                                    phone: q.phone || '',
                                    websiteUrl: q.websiteUrl || '',
                                    industry: q.industry,
                                    projectName: `${q.servicesRequired[0] || 'Marketing'} Engagement`,
                                    projectDescription: q.mainObjective,
                                    projectStartDate: '',
                                    expectedCompletionDate: '',
                                    internalNotes: `Originated from Quotation Request ${q.id}`,
                                  });
                                  setShowAddClientModal(true);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                              >
                                Convert to Client
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 7. AI INTEGRATIONS SECTION */}
              {section === 'integrations' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-display text-lg font-bold text-[#171717]">
                          AI Provider Governance &amp; Capability Verification
                        </h2>
                        <p className="text-xs text-[#64748B] mt-1">
                          All AI API calls execute strictly on the backend server. Secret credentials are managed via server-side environment secrets and are never exposed to the browser.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      {integrations.map((cfg) => (
                        <div
                          key={cfg.scope}
                          className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                            <div>
                              <p className="font-display text-base font-bold text-[#171717]">
                                {cfg.scopeLabel} · {cfg.providerName}
                              </p>
                              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                                Server Credential Status:{' '}
                                {cfg.maskedKeyHint
                                  ? `Configured (${cfg.maskedKeyHint})`
                                  : 'Managed via Server Environment / Platform Intelligence Adapter'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await apiFetch<{
                                  status: string;
                                  message: string;
                                }>('/api/admin/integrations/test', {
                                  method: 'POST',
                                  body: JSON.stringify({ scope: cfg.scope }),
                                });
                                await refreshAllAdminData();
                                setBannerMsg({
                                  type: 'success',
                                  text: `${res.status}: ${res.message}`,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#171717] hover:bg-neutral-800 rounded-lg cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Verify &amp; Test Capabilities</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                              {
                                key: 'textReasoningEnabled' as const,
                                label: 'Text & Strategic Reasoning',
                                sub: cfg.textModel,
                                enabled: cfg.textReasoningEnabled,
                              },
                              {
                                key: 'newsSearchEnabled' as const,
                                label: 'News & 7-Day Search Retrieval',
                                sub: 'Google Search Grounding',
                                enabled: cfg.newsSearchEnabled,
                              },
                              {
                                key: 'imageGenEnabled' as const,
                                label: 'Advertisement Image Generation',
                                sub: cfg.imageModel,
                                enabled: cfg.imageGenEnabled,
                              },
                              {
                                key: 'pageSpeedEnabled' as const,
                                label: 'Website Performance Inspector',
                                sub: 'Live HTTP & DOM Signals',
                                enabled: cfg.pageSpeedEnabled,
                              },
                            ].map((cap) => (
                              <div
                                key={cap.key}
                                className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between space-y-3"
                              >
                                <div>
                                  <p className="text-xs font-bold text-[#171717]">
                                    {cap.label}
                                  </p>
                                  <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
                                    {cap.sub}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                  <span
                                    className={`text-xs font-mono font-semibold ${
                                      cap.enabled ? 'text-[#16A34A]' : 'text-[#64748B]'
                                    }`}
                                  >
                                    {cap.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await apiFetch('/api/admin/integrations', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                          scope: cfg.scope,
                                          [cap.key]: !cap.enabled,
                                        }),
                                      });
                                      await refreshAllAdminData();
                                    }}
                                    className="text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                                  >
                                    {cap.enabled ? 'Disable' : 'Enable'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {cfg.lastTestMessage && (
                            <p className="text-xs text-[#64748B] font-mono">
                              Last Verification ({cfg.lastTestStatus}): {cfg.lastTestMessage}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 8. NOTIFICATIONS SECTION */}
              {section === 'notifications' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-[#171717]">
                      System Notifications ({notifications.length})
                    </h2>
                    {notifications.some((n) => !n.read) && (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch('/api/admin/notifications/mark-read', {
                            method: 'POST',
                          });
                          await refreshAllAdminData();
                        }}
                        className="text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                      >
                        Mark All as Read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-[#64748B] py-8 text-center">
                      No operational notifications yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 rounded-xl border ${
                            n.read
                              ? 'bg-[#F8FAFC] border-slate-200'
                              : 'bg-orange-50/40 border-[#F97316]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#171717]">{n.title}</span>
                            <span className="font-mono text-[#64748B]">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 9. AUDIT LOGS SECTION */}
              {section === 'audit-logs' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h2 className="font-display text-lg font-bold text-[#171717]">
                      Security &amp; Administrative Audit Trail ({auditLogs.length})
                    </h2>
                    {auditLogs.length === 0 ? (
                      <p className="text-sm text-[#64748B] py-6">No audit entries yet.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-96 overflow-y-auto">
                        {auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-[#F97316]">
                                {log.action}
                              </span>{' '}
                              · <span className="font-semibold">{log.actorName}</span>:{' '}
                              <span className="text-[#64748B]">{log.summary}</span>
                            </div>
                            <span className="font-mono text-[#64748B] shrink-0">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {progressHistory.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                      <h3 className="font-display text-base font-bold text-[#171717]">
                        Task Progress Update History
                      </h3>
                      <div className="space-y-2 text-xs">
                        {progressHistory.map((h) => (
                          <div
                            key={h.id}
                            className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-center justify-between"
                          >
                            <span>
                              Task <code className="font-mono">{h.taskId}</code> updated from{' '}
                              <strong className="font-mono">{h.previousProgress}%</strong> to{' '}
                              <strong className="font-mono text-[#16A34A]">
                                {h.newProgress}%
                              </strong>{' '}
                              by {h.updatedByAdmin}
                            </span>
                            <span className="font-mono text-[#64748B]">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 10. SETTINGS SECTION */}
              {section === 'settings' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-xl space-y-6">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#171717]">
                      Administrator Profile &amp; Security Settings
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Update your administrator display name or rotate your login password.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await apiFetch('/api/admin/settings/password', {
                          method: 'POST',
                          body: JSON.stringify(settingsForm),
                        });
                        setSettingsForm((prev) => ({
                          ...prev,
                          currentPassword: '',
                          newPassword: '',
                        }));
                        setBannerMsg({
                          type: 'success',
                          text: 'Administrator settings updated.',
                        });
                      } catch (err: unknown) {
                        setBannerMsg({
                          type: 'error',
                          text:
                            err instanceof Error
                              ? err.message
                              : 'Failed to update settings.',
                        });
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="settings-admin-name"
                        className="block text-xs font-semibold text-[#171717] mb-1"
                      >
                        Administrator Display Name
                      </label>
                      <input
                        id="settings-admin-name"
                        type="text"
                        value={settingsForm.adminName}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, adminName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="settings-current-pw"
                        className="block text-xs font-semibold text-[#171717] mb-1"
                      >
                        Current Password (Required only if changing password)
                      </label>
                      <input
                        id="settings-current-pw"
                        type="password"
                        value={settingsForm.currentPassword}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="settings-new-pw"
                        className="block text-xs font-semibold text-[#171717] mb-1"
                      >
                        New Password (Optional, min 8 chars)
                      </label>
                      <input
                        id="settings-new-pw"
                        type="password"
                        value={settingsForm.newPassword}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, newPassword: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                    >
                      Save Administrator Settings
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ADD CLIENT MODAL */}
      {showAddClientModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add Client"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#171717]">
                  Add New Client &amp; Project Workspace
                </h2>
                <p className="text-xs text-[#64748B]">
                  Generates a unique cryptographic invitation code upon creation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddClientModal(false)}
                className="text-xs font-semibold text-[#64748B] hover:text-[#171717] cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="add-client-business-name"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Business Name *
                  </label>
                  <input
                    id="add-client-business-name"
                    type="text"
                    required
                    value={newClientForm.businessName}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        businessName: e.target.value,
                      })
                    }
                    placeholder="e.g. Bharat Precision Robotics"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-client-contact-name"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Primary Contact Person&apos;s Name *
                  </label>
                  <input
                    id="add-client-contact-name"
                    type="text"
                    required
                    value={newClientForm.contactName}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        contactName: e.target.value,
                      })
                    }
                    placeholder="e.g. Ananya Sharma"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-client-email"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Business Email *
                  </label>
                  <input
                    id="add-client-email"
                    type="email"
                    required
                    value={newClientForm.email}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, email: e.target.value })
                    }
                    placeholder="ananya@bharatrobotics.in"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-client-phone"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Contact Phone Number (Optional)
                  </label>
                  <input
                    id="add-client-phone"
                    type="tel"
                    value={newClientForm.phone}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, phone: e.target.value })
                    }
                    placeholder="+91 98201 11223"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-client-website"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Business Website URL (Optional)
                  </label>
                  <input
                    id="add-client-website"
                    type="text"
                    value={newClientForm.websiteUrl}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        websiteUrl: e.target.value,
                      })
                    }
                    placeholder="https://bharatrobotics.in"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-client-industry"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Business Industry / Category *
                  </label>
                  <input
                    id="add-client-industry"
                    type="text"
                    required
                    value={newClientForm.industry}
                    onChange={(e) =>
                      setNewClientForm({ ...newClientForm, industry: e.target.value })
                    }
                    placeholder="e.g. Industrial Automation & Robotics"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="add-client-project-name"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Project Name *
                  </label>
                  <input
                    id="add-client-project-name"
                    type="text"
                    required
                    value={newClientForm.projectName}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        projectName: e.target.value,
                      })
                    }
                    placeholder="e.g. Marketing and Website Development"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="add-client-project-desc"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Project Description (Optional)
                  </label>
                  <input
                    id="add-client-project-desc"
                    type="text"
                    value={newClientForm.projectDescription}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        projectDescription: e.target.value,
                      })
                    }
                    placeholder="Full brand overhaul, product showcase site, and B2B lead generation creatives"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-client-start-date"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Project Start Date (Optional)
                  </label>
                  <input
                    id="add-client-start-date"
                    type="date"
                    value={newClientForm.projectStartDate}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        projectStartDate: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label
                    htmlFor="add-client-end-date"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Expected Completion Date (Optional)
                  </label>
                  <input
                    id="add-client-end-date"
                    type="date"
                    value={newClientForm.expectedCompletionDate}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        expectedCompletionDate: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="add-client-internal-notes"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Internal Administrator Notes (Optional — Hidden From Client)
                  </label>
                  <textarea
                    id="add-client-internal-notes"
                    rows={2}
                    value={newClientForm.internalNotes}
                    onChange={(e) =>
                      setNewClientForm({
                        ...newClientForm,
                        internalNotes: e.target.value,
                      })
                    }
                    placeholder="Priority enterprise account; weekly Friday review calls"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-[#64748B] hover:text-[#171717] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {creatingClient ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Client...</span>
                    </>
                  ) : (
                    <span>Create Client &amp; Generate Invitation Code</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
