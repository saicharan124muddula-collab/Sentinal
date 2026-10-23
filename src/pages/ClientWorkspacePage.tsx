import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Download,
  ExternalLink,
  FileSearch,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { SentinalLogo } from '../components/SentinalLogo';
import type {
  AdAspectRatio,
  BusinessDNAReport,
  ClientRecord,
  GeneratedAdvertisement,
  GrowthRecommendationItem,
  NewsResultItem,
  ProjectRecord,
  TaskRecord,
} from '../types/sentinal';
import { apiFetch } from '../utils/api';

export type ClientSection =
  | 'overview'
  | 'project'
  | 'sentinalese'
  | 'business-dna';

interface ClientWorkspaceResponse {
  client: ClientRecord;
  project: ProjectRecord | null;
  tasks: TaskRecord[];
  businessDNA: BusinessDNAReport | null;
  sentinalese: {
    latestNews: NewsResultItem[];
    growthRecommendations: GrowthRecommendationItem[];
    advertisements: GeneratedAdvertisement[];
    aiCapabilities: {
      textReasoningEnabled: boolean;
      newsSearchEnabled: boolean;
      imageGenEnabled: boolean;
      providerName: string;
    };
  };
}

interface ClientWorkspacePageProps {
  section: ClientSection;
  navigate: (to: string) => void;
  onLogout: () => Promise<void>;
}

export const ClientWorkspacePage: React.FC<ClientWorkspacePageProps> = ({
  section,
  navigate,
  onLogout,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClientWorkspaceResponse | null>(null);

  // Sentinalese active action state
  const [activeAction, setActiveAction] = useState<
    'none' | 'trends' | 'growth' | 'statics'
  >('none');
  const [runningAction, setRunningAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Suggest Statics Campaign Form (prefilled from Business DNA)
  const [staticsForm, setStaticsForm] = useState({
    campaignObjective: 'Lead Generation & Brand Awareness',
    productService: '',
    offerMessage: '',
    targetAudience: '',
    preferredLanguage: 'English',
    creativeStyle: 'Executive Corporate Studio',
    platformPlacement: 'LinkedIn & Instagram Feed',
    aspectRatio: '1080x1080' as AdAspectRatio,
    callToAction: 'Request Consultation',
    customPromptOverride: '',
    parentAdId: '' as string,
  });

  const loadWorkspace = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch<ClientWorkspaceResponse>('/api/client/workspace');
      setData(res);
      // Prefill Suggest Statics with Business DNA if empty
      setStaticsForm((prev) => ({
        ...prev,
        productService:
          prev.productService ||
          res.businessDNA?.productsAndServices[0] ||
          res.client.projectName,
        offerMessage:
          prev.offerMessage ||
          res.businessDNA?.websiteMessaging.headline ||
          `Accelerate ${res.client.industry} Performance with ${res.client.businessName}`,
        targetAudience:
          prev.targetAudience ||
          res.businessDNA?.targetAudienceHypotheses[0] ||
          `Decision-makers in ${res.client.industry}`,
      }));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load client workspace.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace, section]);

  const handleRunTrends = async () => {
    setActiveAction('trends');
    setRunningAction(true);
    setActionFeedback(null);
    setError(null);
    try {
      await apiFetch('/api/client/sentinalese/trends', {
        method: 'POST',
      });
      await loadWorkspace();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to retrieve industry trends.'
      );
    } finally {
      setRunningAction(false);
    }
  };

  const handleRunGrowth = async () => {
    setActiveAction('growth');
    setRunningAction(true);
    setActionFeedback(null);
    setError(null);
    try {
      const res = await apiFetch<{
        exhaustedUniqueStrategies: boolean;
        message?: string;
        newRecommendations: GrowthRecommendationItem[];
      }>('/api/client/sentinalese/growth', {
        method: 'POST',
      });
      if (res.exhaustedUniqueStrategies && res.message) {
        setActionFeedback(res.message);
      } else {
        setActionFeedback(
          `Generated ${res.newRecommendations.length} new non-repeating growth strategies tailored to your Business DNA.`
        );
      }
      await loadWorkspace();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate growth recommendations.'
      );
    } finally {
      setRunningAction(false);
    }
  };

  const handleUpdateRecommendationStatus = async (
    id: string,
    status: GrowthRecommendationItem['status']
  ) => {
    try {
      await apiFetch(`/api/client/sentinalese/growth/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadWorkspace();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to update recommendation status.'
      );
    }
  };

  const handleGenerateStaticAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunningAction(true);
    setActionFeedback(null);
    setError(null);
    try {
      const res = await apiFetch<{ advertisement: GeneratedAdvertisement }>(
        '/api/client/sentinalese/statics',
        {
          method: 'POST',
          body: JSON.stringify(staticsForm),
        }
      );
      setActionFeedback(
        `Generated advertisement v${res.advertisement.versionNumber} (${res.advertisement.aspectRatio}) with brand identity compositing.`
      );
      await loadWorkspace();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate static advertisement.'
      );
    } finally {
      setRunningAction(false);
    }
  };

  const handleDownloadAd = (ad: GeneratedAdvertisement) => {
    if (!ad.imageDataUrl) return;
    const a = document.createElement('a');
    a.href = ad.imageDataUrl;
    a.download = `${data?.client.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'sentinal'}-ad-v${ad.versionNumber}-${ad.aspectRatio}.svg`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#F97316] animate-spin mx-auto" />
          <p className="text-xs text-[#64748B]">Loading your private client workspace...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#171717]">
          Workspace Access Unavailable
        </h1>
        <p className="text-sm text-[#64748B]">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/client-access')}
          className="px-5 py-2.5 text-xs font-semibold text-white bg-[#F97316] rounded-lg cursor-pointer"
        >
          Return to Client Access
        </button>
      </div>
    );
  }

  const { client, project, tasks, businessDNA, sentinalese } = data;
  const navItems: {
    id: ClientSection;
    label: string;
    path: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'overview', label: 'Workspace Overview', path: '/client', icon: LayoutDashboard },
    {
      id: 'project',
      label: 'Project & Tasks',
      path: '/client/project',
      icon: FolderKanban,
    },
    {
      id: 'sentinalese',
      label: 'Sentinalese AI',
      path: '/client/sentinalese',
      icon: Sparkles,
    },
    {
      id: 'business-dna',
      label: 'Business DNA Profile',
      path: '/client/business-dna',
      icon: FileSearch,
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#171717]">
      {/* Client Sidebar */}
      <aside className="w-64 bg-[#171717] text-white flex flex-col justify-between shrink-0 border-r border-neutral-800">
        <div className="p-6 space-y-6">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            <SentinalLogo variant="dark" size="md" />
          </a>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
            <p className="text-[11px] font-mono text-[#F97316] uppercase">
              APPROVED CLIENT WORKSPACE
            </p>
            <p className="font-display text-sm font-bold text-white truncate">
              {client.businessName}
            </p>
            <p className="text-xs text-neutral-400 truncate">{client.industry}</p>
          </div>

          <nav aria-label="Client Workspace Navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#F97316] text-white'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-neutral-800 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-white truncate">{client.contactName}</p>
            <p className="text-neutral-400 truncate">{client.email}</p>
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

      {/* Main Client Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#64748B]">{client.businessName}</span>
            <span aria-hidden="true" className="text-slate-300">
              /
            </span>
            <span className="font-display font-bold text-[#171717]">
              {navItems.find((i) => i.id === section)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/client/sentinalese')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Open Sentinalese
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-6xl w-full mx-auto space-y-8">
          {error && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-4 text-sm text-red-800"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-semibold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. CLIENT OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <p className="text-xs font-mono text-[#EA580C] uppercase">
                    ACTIVE PROJECT WORKSPACE
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#171717]">
                    {project?.name || client.projectName}
                  </h1>
                  <p className="text-sm text-[#64748B]">
                    {project?.description ||
                      `Dedicated deliverable tracking and Sentinalese intelligence for ${client.businessName}.`}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-right shrink-0">
                  <p className="text-xs text-[#64748B]">Overall Project Progress</p>
                  <p className="font-mono text-3xl font-extrabold text-[#16A34A] tabular-nums mt-1">
                    {tasks.length === 0
                      ? 'Not started'
                      : `${project?.overallProgress ?? 0}%`}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {tasks.length === 0
                      ? 'No tasks added yet'
                      : `${tasks.length} assigned tasks`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <p className="font-mono text-xs text-[#F97316]">DELIVERABLES</p>
                    <h2 className="font-display text-lg font-bold text-[#171717]">
                      Project &amp; Task Progress
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Inspect every task description, completion percentage, and live preview URL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/client/project')}
                    className="text-left text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                  >
                    View Project Tasks ({tasks.length}) →
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <p className="font-mono text-xs text-[#38BDF8]">AI WORKSPACE</p>
                    <h2 className="font-display text-lg font-bold text-[#171717]">
                      Sentinalese Growth Engine
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Run Get Latest Trends, Suggest Growth, and Suggest Statics personalised to your Business DNA.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/client/sentinalese')}
                    className="text-left text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                  >
                    Launch Sentinalese →
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <p className="font-mono text-xs text-[#16A34A]">BRAND IDENTITY</p>
                    <h2 className="font-display text-lg font-bold text-[#171717]">
                      Saved Business DNA
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Review your brand personality, colour tokens, target audience, and strategic profile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/client/business-dna')}
                    className="text-left text-xs font-semibold text-[#F97316] hover:underline cursor-pointer"
                  >
                    Inspect Business DNA →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. CLIENT PROJECT & TASKS PAGE (Read-only progress controls) */}
          {section === 'project' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                  <div>
                    <p className="text-xs font-mono text-[#EA580C] uppercase">
                      PROJECT DELIVERABLES (READ-ONLY PROGRESS VIEW)
                    </p>
                    <h1 className="font-display text-2xl font-bold text-[#171717] mt-1">
                      {project?.name || client.projectName}
                    </h1>
                    {project?.description && (
                      <p className="text-sm text-[#64748B] mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#64748B]">Overall Project Progress</p>
                    <p className="font-mono text-3xl font-extrabold text-[#16A34A] tabular-nums">
                      {tasks.length === 0
                        ? 'Not started'
                        : `${project?.overallProgress ?? 0}%`}
                    </p>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] transition-all duration-300 rounded-full"
                    style={{
                      width: `${tasks.length === 0 ? 0 : project?.overallProgress ?? 0}%`,
                    }}
                  />
                </div>

                {tasks.length === 0 ? (
                  <div className="p-10 rounded-xl bg-[#F8FAFC] border border-slate-200 text-center space-y-1">
                    <p className="font-display text-base font-bold text-[#171717]">
                      No tasks added yet
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Project Progress: Not started. Your administrator will assign project tasks here as work begins.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h2 className="font-display text-base font-bold text-[#171717]">
                              {task.title}
                            </h2>
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
                          <span className="font-mono text-sm font-bold text-[#171717] tabular-nums">
                            {task.progress}%
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-sm text-[#64748B] leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              task.status === 'Completed'
                                ? 'bg-[#16A34A]'
                                : 'bg-[#F97316]'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>

                        <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
                          <div>
                            {task.previewUrl ? (
                              <a
                                href={task.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-semibold text-[#F97316] hover:underline"
                              >
                                <span>Open Deliverable Preview</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span>Preview not available yet.</span>
                            )}
                          </div>
                          {task.dueDate && (
                            <span className="font-mono">Due Date: {task.dueDate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. SENTINALESE — THE AI BUSINESS GROWTH WORKSPACE */}
          {section === 'sentinalese' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono text-[#EA580C] uppercase">
                    RESTRICTED CLIENT AI GROWTH WORKSPACE
                  </p>
                  <h1 className="font-display text-3xl font-extrabold text-[#171717]">
                    Sentinalese
                  </h1>
                  <p className="text-sm sm:text-base text-[#64748B] max-w-2xl">
                    Every recommendation, industry trend analysis, and static advertisement generated in Sentinalese is personalised directly to{' '}
                    <strong className="text-[#171717]">{client.businessName}</strong>&apos;s Business DNA profile ({client.industry}).
                  </p>
                </div>

                {/* THREE PRIMARY ACTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                  <button
                    type="button"
                    onClick={handleRunTrends}
                    disabled={runningAction}
                    className={`text-left p-6 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                      activeAction === 'trends'
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-[#F8FAFC] text-[#171717] border-slate-200 hover:border-[#F97316]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#38BDF8]">
                          ACTION 01
                        </span>
                        <Compass className="w-5 h-5 text-[#38BDF8]" />
                      </div>
                      <h2 className="font-display text-lg font-bold">
                        Get Latest Trends
                      </h2>
                      <p
                        className={`text-xs leading-relaxed ${
                          activeAction === 'trends'
                            ? 'text-neutral-300'
                            : 'text-[#64748B]'
                        }`}
                      >
                        Retrieve relevant business news, policy updates, and market developments from the preceding 7 days.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#F97316]">
                      Run 7-Day Trend Retrieval →
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunGrowth}
                    disabled={runningAction}
                    className={`text-left p-6 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                      activeAction === 'growth'
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-[#F8FAFC] text-[#171717] border-slate-200 hover:border-[#F97316]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#16A34A]">
                          ACTION 02
                        </span>
                        <TrendingUp className="w-5 h-5 text-[#16A34A]" />
                      </div>
                      <h2 className="font-display text-lg font-bold">
                        Suggest Growth
                      </h2>
                      <p
                        className={`text-xs leading-relaxed ${
                          activeAction === 'growth'
                            ? 'text-neutral-300'
                            : 'text-[#64748B]'
                        }`}
                      >
                        Generate concrete, non-repeating marketing, sales, and lead-generation recommendations.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#F97316]">
                      Generate Distinct Strategies →
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAction('statics');
                      setActionFeedback(null);
                    }}
                    className={`text-left p-6 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                      activeAction === 'statics'
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-[#F8FAFC] text-[#171717] border-slate-200 hover:border-[#F97316]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#F97316]">
                          ACTION 03
                        </span>
                        <Sparkles className="w-5 h-5 text-[#F97316]" />
                      </div>
                      <h2 className="font-display text-lg font-bold">
                        Suggest Statics
                      </h2>
                      <p
                        className={`text-xs leading-relaxed ${
                          activeAction === 'statics'
                            ? 'text-neutral-300'
                            : 'text-[#64748B]'
                        }`}
                      >
                        Create actual downloadable advertisement images prefilled with your Business DNA and brand logo.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#F97316]">
                      Open Ad Studio →
                    </span>
                  </button>
                </div>
              </div>

              {runningAction && (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                  <Loader2 className="w-7 h-7 text-[#F97316] animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-[#171717]">
                    Executing Sentinalese operation for {client.businessName}...
                  </p>
                </div>
              )}

              {actionFeedback && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3 text-sm text-green-900">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                  <span>{actionFeedback}</span>
                </div>
              )}

              {/* A. GET LATEST TRENDS RESULTS */}
              {(activeAction === 'trends' ||
                (activeAction === 'none' && sentinalese.latestNews.length > 0)) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <p className="text-xs font-mono text-[#38BDF8] uppercase">
                        PRECEDING 7 DAYS INDUSTRY INTELLIGENCE
                      </p>
                      <h2 className="font-display text-xl font-bold text-[#171717]">
                        Latest Developments Relevant to {client.businessName} ({client.industry})
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunTrends}
                      disabled={runningAction}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#171717] bg-[#F8FAFC] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh 7-Day Trends</span>
                    </button>
                  </div>

                  {sentinalese.latestNews.length === 0 ? (
                    <p className="text-sm text-[#64748B] py-6">
                      Click &ldquo;Get Latest Trends&rdquo; above to retrieve developments from the preceding 7 days.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {sentinalese.latestNews.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                            <span>
                              <strong className="text-[#171717]">{item.publisher}</strong> ·{' '}
                              {item.category}
                            </span>
                            <span className="font-mono">
                              Published: {new Date(item.publicationDate).toLocaleDateString()} · Retrieved:{' '}
                              {new Date(item.retrievedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="font-display text-base font-bold text-[#171717]">
                            {item.headline}
                          </h3>
                          <p className="text-sm text-[#64748B] leading-relaxed">
                            {item.summary}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
                              <p className="text-xs font-bold text-[#171717]">
                                Why It Matters to {client.businessName}
                              </p>
                              <p className="text-xs text-[#64748B] mt-1">
                                {item.whyItMatters}
                              </p>
                            </div>
                            <div className="p-3.5 rounded-lg bg-white border border-slate-200">
                              <p className="text-xs font-bold text-[#F97316]">
                                Suggested Next Action
                              </p>
                              <p className="text-xs text-[#64748B] mt-1">
                                {item.suggestedAction}
                              </p>
                            </div>
                          </div>

                          {item.stockContext && (
                            <div className="p-3 rounded-lg bg-slate-100 text-[11px] font-mono text-[#64748B]">
                              Market Reference: {item.stockContext.company} ({item.stockContext.exchange} ·{' '}
                              {item.stockContext.currency} · {item.stockContext.date}) —{' '}
                              {item.stockContext.disclaimer}
                            </div>
                          )}

                          <div className="pt-1">
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] hover:underline"
                            >
                              <span>Inspect Original Source</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* B. SUGGEST GROWTH RESULTS */}
              {(activeAction === 'growth' ||
                (activeAction === 'none' &&
                  sentinalese.growthRecommendations.length > 0)) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <p className="text-xs font-mono text-[#16A34A] uppercase">
                        NON-REPEATING GROWTH STRATEGY ENGINE
                      </p>
                      <h2 className="font-display text-xl font-bold text-[#171717]">
                        Tailored Growth Recommendations ({sentinalese.growthRecommendations.length})
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunGrowth}
                      disabled={runningAction}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                    >
                      <PlusIcon />
                      <span>Generate Next Distinct Set</span>
                    </button>
                  </div>

                  {sentinalese.growthRecommendations.length === 0 ? (
                    <p className="text-sm text-[#64748B] py-6">
                      Click &ldquo;Suggest Growth&rdquo; to generate non-repeating strategies tailored to your Business DNA.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {sentinalese.growthRecommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-6 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#64748B]">
                                <span className="text-[#F97316] font-bold">
                                  {rec.category.toUpperCase()}
                                </span>
                                <span>·</span>
                                <span>Priority: {rec.priority}</span>
                                <span>·</span>
                                <span>Timeline: {rec.suggestedTimeline}</span>
                              </div>
                              <h3 className="font-display text-lg font-bold text-[#171717]">
                                {rec.title}
                              </h3>
                            </div>

                            <select
                              aria-label={`Status for ${rec.title}`}
                              value={rec.status}
                              onChange={(e) =>
                                handleUpdateRecommendationStatus(
                                  rec.id,
                                  e.target.value as GrowthRecommendationItem['status']
                                )
                              }
                              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg shrink-0"
                            >
                              <option value="Suggested">Status: Suggested</option>
                              <option value="Saved">Saved</option>
                              <option value="Planned">Planned</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Dismissed">Dismissed</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                            <div className="space-y-1">
                              <p className="font-bold text-[#171717]">
                                1. Proposed Action
                              </p>
                              <p className="text-[#64748B]">{rec.proposedAction}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-[#171717]">
                                2. Why It Suits {client.businessName}
                              </p>
                              <p className="text-[#64748B]">{rec.whyItSuits}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-[#171717]">
                                3. Intended Audience
                              </p>
                              <p className="text-[#64748B]">{rec.intendedAudience}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-[#171717]">
                                4. Expected Outcome (Hypothesis)
                              </p>
                              <p className="text-[#64748B]">
                                {rec.expectedOutcomeHypothesis}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-xs font-bold text-[#171717]">
                              5. Practical Implementation Steps
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-xs text-[#64748B]">
                              {rec.implementationSteps.map((st, idx) => (
                                <li key={idx}>{st}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
                            <span>
                              <strong className="text-[#171717]">Effort:</strong>{' '}
                              {rec.estimatedEffort} ·{' '}
                              <strong className="text-[#171717]">Dependencies:</strong>{' '}
                              {rec.dependencies}
                            </span>
                            <span>
                              <strong className="text-[#171717]">Success Metric:</strong>{' '}
                              {rec.successMetric}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* C. SUGGEST STATICS — AI ADVERTISEMENT GENERATION WORKSPACE */}
              {(activeAction === 'statics' ||
                (activeAction === 'none' && sentinalese.advertisements.length > 0)) && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                      <p className="text-xs font-mono text-[#F97316] uppercase">
                        PREFILLED FROM SAVED BUSINESS DNA · BRAND-ACCURATE AD STUDIO
                      </p>
                      <h2 className="font-display text-xl font-bold text-[#171717] mt-1">
                        Suggest Statics — Create Advertisement Images
                      </h2>
                      <p className="text-xs text-[#64748B] mt-1">
                        Brand identity ({client.businessName}), industry ({client.industry}), and brand colours (
                        {businessDNA?.brandColors.map((c) => c.hex).join(', ') || '#F97316'}) are automatically prefilled.
                      </p>
                    </div>

                    <form onSubmit={handleGenerateStaticAd} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="ad-objective"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Campaign Objective *
                          </label>
                          <input
                            id="ad-objective"
                            type="text"
                            required
                            value={staticsForm.campaignObjective}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                campaignObjective: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ad-product"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Product / Service to Promote *
                          </label>
                          <input
                            id="ad-product"
                            type="text"
                            required
                            value={staticsForm.productService}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                productService: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="ad-offer"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Offer or Campaign Headline Message *
                          </label>
                          <input
                            id="ad-offer"
                            type="text"
                            required
                            value={staticsForm.offerMessage}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                offerMessage: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ad-audience"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Target Audience
                          </label>
                          <input
                            id="ad-audience"
                            type="text"
                            value={staticsForm.targetAudience}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                targetAudience: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ad-cta"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Required Call to Action (CTA) *
                          </label>
                          <input
                            id="ad-cta"
                            type="text"
                            required
                            value={staticsForm.callToAction}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                callToAction: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ad-ratio"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Image Aspect Ratio &amp; Format
                          </label>
                          <select
                            id="ad-ratio"
                            value={staticsForm.aspectRatio}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                aspectRatio: e.target.value as AdAspectRatio,
                              })
                            }
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          >
                            <option value="1080x1080">Square: 1080 × 1080</option>
                            <option value="1080x1350">Portrait: 1080 × 1350</option>
                            <option value="1080x1920">Story / Reel: 1080 × 1920</option>
                            <option value="1200x628">Landscape: 1200 × 628</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="ad-placement"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Platform or Placement
                          </label>
                          <input
                            id="ad-placement"
                            type="text"
                            value={staticsForm.platformPlacement}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                platformPlacement: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="ad-prompt-override"
                            className="block text-xs font-semibold text-[#171717] mb-1"
                          >
                            Custom Prompt Override (Optional — Leave blank for automatic context-aware prompt)
                          </label>
                          <input
                            id="ad-prompt-override"
                            type="text"
                            value={staticsForm.customPromptOverride}
                            onChange={(e) =>
                              setStaticsForm({
                                ...staticsForm,
                                customPromptOverride: e.target.value,
                              })
                            }
                            placeholder="Optional custom direction..."
                            className="w-full px-3.5 py-2 text-sm bg-[#F8FAFC] border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={runningAction}
                          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 rounded-lg cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Advertisement Image</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Generated Advertisements Preview & Version History */}
                  {sentinalese.advertisements.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
                      <h3 className="font-display text-lg font-bold text-[#171717]">
                        Generated Advertisement Workspace &amp; Version History ({sentinalese.advertisements.length})
                      </h3>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {sentinalese.advertisements.map((ad) => (
                          <div
                            key={ad.id}
                            className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-[#F97316]">
                                  VERSION v{ad.versionNumber} · {ad.aspectRatio}
                                </span>
                                <span className="text-[#16A34A] font-semibold">
                                  {ad.status}
                                </span>
                              </div>

                              {ad.imageDataUrl && (
                                <div className="bg-neutral-950 rounded-xl p-3 flex items-center justify-center">
                                  <img
                                    src={ad.imageDataUrl}
                                    alt={ad.offerMessage}
                                    className="max-h-80 w-auto object-contain rounded-lg"
                                  />
                                </div>
                              )}

                              <div className="space-y-1 text-xs">
                                <p className="font-bold text-[#171717]">
                                  {ad.offerMessage}
                                </p>
                                <p className="text-[#64748B]">
                                  Promotes: {ad.productService} · CTA: {ad.callToAction}
                                </p>
                                <p className="text-[11px] font-mono text-[#64748B] line-clamp-2">
                                  Prompt: {ad.constructedPrompt}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadAd(ad)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#171717] hover:bg-neutral-800 rounded-lg cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Ad</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setStaticsForm({
                                    campaignObjective: ad.campaignObjective,
                                    productService: ad.productService,
                                    offerMessage: `${ad.offerMessage} — Exclusive Limited Window`,
                                    targetAudience: ad.targetAudience,
                                    preferredLanguage: ad.preferredLanguage,
                                    creativeStyle: ad.creativeStyle,
                                    platformPlacement: ad.platformPlacement,
                                    aspectRatio: ad.aspectRatio,
                                    callToAction: ad.callToAction,
                                    customPromptOverride: ad.constructedPrompt,
                                    parentAdId: ad.id,
                                  });
                                  setActiveAction('statics');
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#171717] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Create Variation / Edit Prompt</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. CLIENT BUSINESS DNA PROFILE */}
          {section === 'business-dna' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <p className="text-xs font-mono text-[#EA580C] uppercase">
                    SAVED CLIENT BUSINESS DNA PROFILE
                  </p>
                  <h1 className="font-display text-2xl font-bold text-[#171717] mt-1">
                    {businessDNA?.businessName || client.businessName}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/business-dna')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg cursor-pointer"
                >
                  Update / Re-Analyse Business DNA
                </button>
              </div>

              {businessDNA ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-sm font-bold text-[#171717]">
                      Value Proposition &amp; Messaging
                    </h2>
                    <p className="text-sm text-[#64748B] mt-1">
                      {businessDNA.websiteMessaging.valueProposition}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                      <p className="text-xs text-[#64748B]">Industry</p>
                      <p className="font-semibold text-sm text-[#171717] mt-1">
                        {businessDNA.industry}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                      <p className="text-xs text-[#64748B]">Brand Personality</p>
                      <p className="font-semibold text-sm text-[#171717] mt-1">
                        {businessDNA.brandPersonality.join(' · ')}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                      <p className="text-xs text-[#64748B]">Brand Colours</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {businessDNA.brandColors.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs font-mono"
                          >
                            <span
                              className="w-4 h-4 rounded border border-slate-300"
                              style={{ backgroundColor: c.hex }}
                            />
                            {c.hex}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#64748B]">
                  No Business DNA report linked yet. Click &ldquo;Update / Re-Analyse Business DNA&rdquo; to generate one.
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
