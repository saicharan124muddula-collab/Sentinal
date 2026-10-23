export type AccessRole = 'public' | 'admin' | 'client';

export type InvitationStatus = 'active' | 'consumed' | 'expired' | 'revoked' | 'replaced';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';

export type ClientStatus = 'active' | 'suspended' | 'deactivated';

export interface ClientRecord {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  websiteUrl?: string;
  industry: string;
  projectId: string;
  projectName: string;
  internalNotes?: string; // Hidden from clients
  status: ClientStatus;
  businessProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientInvitation {
  id: string;
  clientId: string;
  codeHash: string;
  codePrefix: string; // e.g. "SNTL-8F2A..." masked identifier
  transientPlaintext?: string | null; // Available only to admin right after generation until cleared or replaced
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
  revokedAt?: string;
  replacedById?: string;
}

export interface ProjectRecord {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  startDate?: string;
  expectedCompletionDate?: string;
  status: 'Not started' | 'In Progress' | 'Completed';
  overallProgress: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  projectId: string;
  clientId: string;
  title: string;
  description?: string;
  previewUrl?: string | null;
  assignedMember?: string;
  startDate?: string;
  dueDate?: string;
  isBlocked: boolean;
  progress: number; // 0, 10, 20, ..., 100
  status: TaskStatus;
  comments: {
    id: string;
    author: string;
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskProgressHistoryRecord {
  id: string;
  taskId: string;
  projectId: string;
  clientId: string;
  previousProgress: number;
  newProgress: number;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  updatedByAdmin: string;
  timestamp: string;
}

export interface BusinessDNAReport {
  id: string;
  clientId?: string | null; // Linked if owned by or associated with an approved client
  ownerSessionId?: string | null;
  sourceType: 'website_auto' | 'manual_entry' | 'hybrid';
  businessName: string;
  websiteUrl?: string;
  industry: string;
  brandPersonality: string[];
  brandColors: { hex: string; label: string; source: 'extracted' | 'user_provided' | 'inferred' }[];
  extractedLogoUrl?: string | null;
  productsAndServices: string[];
  targetAudienceHypotheses: string[];
  websiteMessaging: {
    headline?: string;
    metaDescription?: string;
    valueProposition: string;
    toneOfVoice: string;
  };
  digitalPresenceObservations: {
    signal: string;
    finding: string;
    verificationStatus: 'measured' | 'user_stated' | 'ai_hypothesis';
  }[];
  performanceMetrics?: {
    measured: boolean;
    source: string;
    responseTimeMs?: number;
    httpsEnabled?: boolean;
    htmlSizeBytes?: number;
    headingCount?: number;
    metaTagsComplete?: boolean;
    pageSpeedScore?: number | null;
    note: string;
  };
  strengths: string[];
  improvementOpportunities: string[];
  recommendedNextSteps: string[];
  dataSources: string[];
  confidenceLevel: 'High (Measured + Verified)' | 'Moderate (Public Signals + AI Analysis)' | 'User-Entered Profile';
  mainObjective?: string;
  marketingChallenges?: string;
  competitors?: string[];
  locationMarket?: string;
  createdAt: string;
}

export interface QuotationRequest {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone?: string;
  websiteUrl?: string;
  industry: string;
  servicesRequired: string[];
  mainObjective: string;
  additionalDetails?: string;
  status: 'Pending Review' | 'In Discussion' | 'Proposal Sent' | 'Converted to Client' | 'Archived';
  internalAdminNotes?: string;
  convertedClientId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsResultItem {
  id: string;
  headline: string;
  summary: string;
  publisher: string;
  publicationDate: string; // ISO date within preceding 7 days
  retrievedAt: string;
  sourceUrl: string;
  whyItMatters: string;
  suggestedAction: string;
  category: string;
  stockContext?: {
    company: string;
    exchange: string;
    date: string;
    currency: string;
    disclaimer: string;
  } | null;
}

export interface GrowthRecommendationItem {
  id: string;
  clientId: string;
  businessProfileId: string;
  category: string;
  title: string;
  proposedAction: string;
  whyItSuits: string;
  intendedAudience: string;
  implementationSteps: string[];
  expectedOutcomeHypothesis: string;
  estimatedEffort: string;
  dependencies: string;
  successMetric: string;
  priority: 'High' | 'Medium' | 'Foundational';
  suggestedTimeline: string;
  normalizedStrategyKey: string;
  status: 'Suggested' | 'Saved' | 'Planned' | 'In Progress' | 'Completed' | 'Dismissed';
  createdAt: string;
  updatedAt: string;
}

export type AdAspectRatio = '1080x1080' | '1080x1350' | '1080x1920' | '1200x628';

export interface GeneratedAdvertisement {
  id: string;
  clientId: string;
  businessProfileId: string;
  campaignObjective: string;
  productService: string;
  offerMessage: string;
  targetAudience: string;
  preferredLanguage: string;
  creativeStyle: string;
  platformPlacement: string;
  aspectRatio: AdAspectRatio;
  callToAction: string;
  constructedPrompt: string;
  providerMetadata: {
    provider: string;
    model: string;
    compositedBrandLogo: boolean;
  };
  status: 'Queued' | 'Generating' | 'Completed' | 'Failed';
  errorMessage?: string;
  imageDataUrl?: string; // Data URL of generated & logo-composited image
  versionNumber: number;
  parentAdId?: string | null;
  createdAt: string;
}

export interface SentinaleseActivityRecord {
  id: string;
  clientId: string;
  clientBusinessName: string;
  actionType: 'Get Latest Trends' | 'Suggest Growth' | 'Suggest Statics';
  timestamp: string;
  status: 'Completed' | 'Failed';
  businessProfileId?: string;
  recommendationsCount?: number;
  newsResultCount?: number;
  advertisementStatus?: string;
  assetReferenceId?: string;
  failureSummary?: string;
  providerModelMetadata: string;
}

export interface AIProviderConfigView {
  scope: 'platform' | string; // 'platform' or clientId
  scopeLabel: string;
  providerName: 'Google Gemini' | 'Custom Compatible Adapter';
  textReasoningEnabled: boolean;
  textModel: string;
  newsSearchEnabled: boolean;
  imageGenEnabled: boolean;
  imageModel: string;
  pageSpeedEnabled: boolean;
  credentialSource: 'platform_env' | 'client_owned' | 'not_configured';
  maskedKeyHint: string | null;
  usagePolicyNote: string;
  lastTestedAt?: string | null;
  lastTestStatus?: 'Operational' | 'Untested' | 'Failed';
  lastTestMessage?: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorRole: 'admin' | 'client' | 'system';
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
  timestamp: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  category: 'quotation' | 'client' | 'project' | 'sentinalese' | 'security';
  read: boolean;
  createdAt: string;
  linkRoute?: string;
}
