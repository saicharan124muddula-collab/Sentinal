import type {
  GrowthRecommendationItem,
  InvitationStatus,
  NewsResultItem,
  TaskStatus,
} from '../types/sentinal';

export const PERMITTED_PROGRESS_INCREMENTS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export function isValidProgressIncrement(value: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100 &&
    value % 10 === 0
  );
}

export function snapProgressToIncrement(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped / 10) * 10;
}

export function deriveTaskStatus(
  progress: number,
  isBlocked: boolean = false
): TaskStatus {
  const snapped = snapProgressToIncrement(progress);
  if (isBlocked) {
    return 'Blocked';
  }
  if (snapped === 0) {
    return 'Not Started';
  }
  if (snapped === 100) {
    return 'Completed';
  }
  return 'In Progress';
}

export function calculateProjectProgress(
  tasks: ReadonlyArray<{ projectId: string; progress: number }>,
  targetProjectId: string
): {
  percentage: number;
  statusLabel: 'Not started' | 'In Progress' | 'Completed';
  taskCount: number;
} {
  const projectTasks = tasks.filter((t) => t.projectId === targetProjectId);
  const n = projectTasks.length;
  if (n === 0) {
    return {
      percentage: 0,
      statusLabel: 'Not started',
      taskCount: 0,
    };
  }
  const sum = projectTasks.reduce(
    (acc, t) => acc + snapProgressToIncrement(t.progress),
    0
  );
  const percentage = Math.round(sum / n);
  let statusLabel: 'Not started' | 'In Progress' | 'Completed' = 'In Progress';
  if (percentage === 0 && projectTasks.every((t) => t.progress === 0)) {
    statusLabel = 'Not started';
  } else if (percentage === 100) {
    statusLabel = 'Completed';
  }
  return {
    percentage,
    statusLabel,
    taskCount: n,
  };
}

const PRIVATE_OR_LOCAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
  /\.local$/i,
  /\.internal$/i,
  /\.localhost$/i,
];

export function validateExternalPublicUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a website URL.' };
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: 'Invalid URL format. Example: https://example.com' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS website URLs are permitted.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || !hostname.includes('.')) {
    return {
      valid: false,
      error: 'Please enter a valid public domain name (e.g. yourcompany.com).',
    };
  }

  for (const pattern of PRIVATE_OR_LOCAL_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: 'Private network, loopback, and internal addresses are blocked for security.',
      };
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname,
  };
}

export function validateOptionalPreviewUrl(rawUrl?: string | null): {
  valid: boolean;
  normalizedUrl: string | null;
  error?: string;
} {
  if (rawUrl === undefined || rawUrl === null || rawUrl.trim() === '') {
    return { valid: true, normalizedUrl: null };
  }
  const check = validateExternalPublicUrl(rawUrl);
  if (!check.valid || !check.normalizedUrl) {
    return {
      valid: false,
      normalizedUrl: null,
      error: check.error || 'Invalid preview URL.',
    };
  }
  return {
    valid: true,
    normalizedUrl: check.normalizedUrl,
  };
}

export function evaluateInvitationState(
  invitation: {
    status: InvitationStatus;
    expiresAt: string;
  },
  nowMs: number = Date.now()
): {
  usable: boolean;
  effectiveStatus: InvitationStatus;
  reason: string;
} {
  if (invitation.status === 'revoked') {
    return {
      usable: false,
      effectiveStatus: 'revoked',
      reason: 'This access code has been revoked by the administrator.',
    };
  }
  if (invitation.status === 'replaced') {
    return {
      usable: false,
      effectiveStatus: 'replaced',
      reason: 'This access code was superseded by a newly regenerated code.',
    };
  }
  if (invitation.status === 'consumed') {
    return {
      usable: false,
      effectiveStatus: 'consumed',
      reason: 'This invitation code has already been activated.',
    };
  }
  const expiryTime = Date.parse(invitation.expiresAt);
  if (Number.isFinite(expiryTime) && expiryTime < nowMs) {
    return {
      usable: false,
      effectiveStatus: 'expired',
      reason: 'This access code has expired. Request a new code from your administrator.',
    };
  }
  if (invitation.status === 'active') {
    return {
      usable: true,
      effectiveStatus: 'active',
      reason: 'Code is active and valid.',
    };
  }
  return {
    usable: false,
    effectiveStatus: invitation.status,
    reason: 'Access code is not valid.',
  };
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'into', 'over',
  'more', 'will', 'have', 'are', 'was', 'were', 'been', 'being', 'their', 'our',
  'you', 'can', 'use', 'using', 'build', 'create', 'launch', 'run', 'through',
  'across', 'business', 'client', 'customers', 'marketing', 'campaign',
]);

export function normalizeStrategyText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .join(' ')
    .trim();
}

export function calculateStrategySimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeStrategyText(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeStrategyText(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface CandidateRecommendationInput {
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
}

export function filterNonRepeatingRecommendations(
  candidates: CandidateRecommendationInput[],
  existingHistory: Pick<
    GrowthRecommendationItem,
    'title' | 'proposedAction' | 'category' | 'normalizedStrategyKey'
  >[],
  similarityThreshold: number = 0.5
): CandidateRecommendationInput[] {
  const accepted: CandidateRecommendationInput[] = [];
  const comparisonPool: { key: string; combined: string }[] = existingHistory.map(
    (item) => ({
      key:
        item.normalizedStrategyKey ||
        normalizeStrategyText(`${item.category} ${item.title} ${item.proposedAction}`),
      combined: `${item.category} ${item.title} ${item.proposedAction}`,
    })
  );

  for (const candidate of candidates) {
    const candidateCombined = `${candidate.category} ${candidate.title} ${candidate.proposedAction}`;
    const candidateKey = normalizeStrategyText(candidateCombined);
    if (!candidateKey) continue;

    const isDuplicate = comparisonPool.some((existing) => {
      if (existing.key === candidateKey) return true;
      if (
        normalizeStrategyText(existing.combined) ===
        normalizeStrategyText(candidate.title)
      ) {
        return true;
      }
      const similarity = calculateStrategySimilarity(
        existing.combined,
        candidateCombined
      );
      return similarity >= similarityThreshold;
    });

    if (!isDuplicate) {
      accepted.push(candidate);
      comparisonPool.push({
        key: candidateKey,
        combined: candidateCombined,
      });
    }
  }

  return accepted;
}

export function isWithinLastSevenDays(
  publicationDateIso: string,
  referenceNowMs: number = Date.now()
): boolean {
  const pubMs = Date.parse(publicationDateIso);
  if (!Number.isFinite(pubMs)) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const futureToleranceMs = 12 * 60 * 60 * 1000; // Allow slight timezone offset
  return (
    pubMs >= referenceNowMs - sevenDaysMs &&
    pubMs <= referenceNowMs + futureToleranceMs
  );
}

export function filterAndDeduplicateRecentNews(
  items: NewsResultItem[],
  referenceNowMs: number = Date.now()
): NewsResultItem[] {
  const validRecent = items.filter((item) =>
    isWithinLastSevenDays(item.publicationDate, referenceNowMs)
  );
  const kept: NewsResultItem[] = [];
  for (const item of validRecent) {
    const overlap = kept.some(
      (existing) =>
        existing.sourceUrl === item.sourceUrl ||
        calculateStrategySimilarity(existing.headline, item.headline) >= 0.65
    );
    if (!overlap) {
      kept.push(item);
    }
  }
  return kept;
}
