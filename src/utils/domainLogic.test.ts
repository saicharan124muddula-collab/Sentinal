import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidProgressIncrement,
  snapProgressToIncrement,
  deriveTaskStatus,
  calculateProjectProgress,
  validateExternalPublicUrl,
  validateOptionalPreviewUrl,
  evaluateInvitationState,
  filterNonRepeatingRecommendations,
  filterAndDeduplicateRecentNews,
} from './domainLogic';

test('Task progress snapping and permitted increments (0, 10, ..., 100)', () => {
  assert.equal(isValidProgressIncrement(0), true);
  assert.equal(isValidProgressIncrement(60), true);
  assert.equal(isValidProgressIncrement(100), true);
  assert.equal(isValidProgressIncrement(45), false);
  assert.equal(isValidProgressIncrement(-10), false);
  assert.equal(isValidProgressIncrement(110), false);

  assert.equal(snapProgressToIncrement(63), 60);
  assert.equal(snapProgressToIncrement(67), 70);
  assert.equal(snapProgressToIncrement(-15), 0);
  assert.equal(snapProgressToIncrement(140), 100);
});

test('Task status derivation follows 0%=Not Started, 10-90%=In Progress, 100%=Completed, Blocked preserves %', () => {
  assert.equal(deriveTaskStatus(0, false), 'Not Started');
  assert.equal(deriveTaskStatus(10, false), 'In Progress');
  assert.equal(deriveTaskStatus(60, false), 'In Progress');
  assert.equal(deriveTaskStatus(90, false), 'In Progress');
  assert.equal(deriveTaskStatus(100, false), 'Completed');
  assert.equal(deriveTaskStatus(60, true), 'Blocked');
});

test('Overall project progress formula rounds average of project tasks and isolates by projectId', () => {
  const tasks = [
    { projectId: 'proj-1', progress: 60 },
    { projectId: 'proj-1', progress: 40 },
    { projectId: 'proj-1', progress: 100 },
    { projectId: 'proj-2', progress: 0 }, // Belongs to another project, must be ignored
  ];

  const res = calculateProjectProgress(tasks, 'proj-1');
  assert.equal(res.percentage, 67);
  assert.equal(res.taskCount, 3);
  assert.equal(res.statusLabel, 'In Progress');

  const emptyRes = calculateProjectProgress(tasks, 'proj-empty');
  assert.equal(emptyRes.percentage, 0);
  assert.equal(emptyRes.taskCount, 0);
  assert.equal(emptyRes.statusLabel, 'Not started');
});

test('External URL validation blocks SSRF/private networks and allows optional preview URLs', () => {
  assert.equal(validateExternalPublicUrl('https://stripe.com').valid, true);
  assert.equal(validateExternalPublicUrl('example.org/about').valid, true);
  assert.equal(validateExternalPublicUrl('http://localhost:3000').valid, false);
  assert.equal(validateExternalPublicUrl('http://127.0.0.1/admin').valid, false);
  assert.equal(validateExternalPublicUrl('http://192.168.1.1').valid, false);
  assert.equal(validateExternalPublicUrl('http://169.254.169.254/latest').valid, false);

  assert.deepEqual(validateOptionalPreviewUrl(''), {
    valid: true,
    normalizedUrl: null,
  });
  assert.equal(validateOptionalPreviewUrl('https://figma.com/file/123').valid, true);
  assert.equal(validateOptionalPreviewUrl('http://localhost:8080').valid, false);
});

test('Invitation code lifecycle rejects revoked, replaced, consumed, and expired codes', () => {
  const now = Date.parse('2026-10-23T00:00:00Z');
  const future = '2026-10-30T00:00:00Z';
  const past = '2026-10-20T00:00:00Z';

  assert.equal(
    evaluateInvitationState({ status: 'active', expiresAt: future }, now).usable,
    true
  );
  assert.equal(
    evaluateInvitationState({ status: 'revoked', expiresAt: future }, now).usable,
    false
  );
  assert.equal(
    evaluateInvitationState({ status: 'replaced', expiresAt: future }, now).usable,
    false
  );
  assert.equal(
    evaluateInvitationState({ status: 'consumed', expiresAt: future }, now).usable,
    false
  );
  assert.equal(
    evaluateInvitationState({ status: 'active', expiresAt: past }, now).effectiveStatus,
    'expired'
  );
});

test('Non-repeating growth recommendation deduplication excludes exact and semantic duplicates', () => {
  const existing = [
    {
      category: 'Lead Generation',
      title: 'Interactive ROI Calculator on Landing Page',
      proposedAction: 'Embed an interactive B2B ROI calculator to capture qualified leads.',
      normalizedStrategyKey: '',
    },
  ];

  const candidates = [
    {
      category: 'Lead Generation',
      title: 'Interactive B2B ROI Calculator on Landing Page',
      proposedAction: 'Embed an interactive B2B ROI calculator on the website to capture qualified leads.',
      whyItSuits: 'Matches B2B audience',
      intendedAudience: 'Operations directors',
      implementationSteps: ['Step 1'],
      expectedOutcomeHypothesis: '+15% form conversion',
      estimatedEffort: 'Medium',
      dependencies: 'Web dev',
      successMetric: 'Calculator completions',
      priority: 'High' as const,
      suggestedTimeline: '2 weeks',
    },
    {
      category: 'Referral Strategies',
      title: 'Structured Partner Co-Marketing Webinar Series',
      proposedAction: 'Host bi-monthly technical workshops with complementary logistics software vendors.',
      whyItSuits: 'Expands mid-market reach',
      intendedAudience: 'Supply chain managers',
      implementationSteps: ['Identify 3 non-competing partners'],
      expectedOutcomeHypothesis: '30-50 net-new qualified registrants per session',
      estimatedEffort: 'Low',
      dependencies: 'Partner outreach',
      successMetric: 'Partner-sourced SQLs',
      priority: 'Medium' as const,
      suggestedTimeline: '4 weeks',
    },
  ];

  const filtered = filterNonRepeatingRecommendations(candidates, existing);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Structured Partner Co-Marketing Webinar Series');
});

test('News 7-day filtering excludes older items and deduplicates overlapping stories', () => {
  const refNow = Date.parse('2026-10-23T06:00:00Z');
  const items = [
    {
      id: '1',
      headline: 'Ministry Announces New MSME Digital Export Grant Scheme',
      summary: 'New subsidy for digital marketing and export compliance.',
      publisher: 'Economic Times',
      publicationDate: '2026-10-21T10:00:00Z', // 2 days ago
      retrievedAt: '2026-10-23T06:00:00Z',
      sourceUrl: 'https://economictimes.indiatimes.com/msme-grant',
      whyItMatters: 'Direct subsidy eligibility',
      suggestedAction: 'Review export grant criteria',
      category: 'Government Policy',
    },
    {
      id: '2',
      headline: 'Ministry Announces New MSME Digital Export Grant Scheme Today',
      summary: 'Duplicate coverage of the MSME digital export grant.',
      publisher: 'Business Standard',
      publicationDate: '2026-10-21T12:00:00Z',
      retrievedAt: '2026-10-23T06:00:00Z',
      sourceUrl: 'https://business-standard.com/msme-grant-2',
      whyItMatters: 'Duplicate',
      suggestedAction: 'Review',
      category: 'Government Policy',
    },
    {
      id: '3',
      headline: 'Old Quarter Report From Last Month',
      summary: 'Outdated article older than 7 days.',
      publisher: 'Mint',
      publicationDate: '2026-09-15T10:00:00Z', // > 30 days ago
      retrievedAt: '2026-10-23T06:00:00Z',
      sourceUrl: 'https://livemint.com/old-report',
      whyItMatters: 'Old',
      suggestedAction: 'None',
      category: 'Market',
    },
  ];

  const result = filterAndDeduplicateRecentNews(items, refNow);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, '1');
});
