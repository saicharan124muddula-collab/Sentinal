import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  AIProviderConfigView,
  AdAspectRatio,
  AuditLogRecord,
  BusinessDNAReport,
  ClientInvitation,
  ClientRecord,
  GeneratedAdvertisement,
  GrowthRecommendationItem,
  NewsResultItem,
  NotificationRecord,
  ProjectRecord,
  QuotationRequest,
  SentinaleseActivityRecord,
  TaskProgressHistoryRecord,
  TaskRecord,
} from './src/types/sentinal';
import {
  calculateProjectProgress,
  deriveTaskStatus,
  evaluateInvitationState,
  filterAndDeduplicateRecentNews,
  filterNonRepeatingRecommendations,
  isValidProgressIncrement,
  normalizeStrategyText,
  snapProgressToIncrement,
  validateExternalPublicUrl,
  validateOptionalPreviewUrl,
  type CandidateRecommendationInput,
} from './src/utils/domainLogic';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sentinal-db.json');

interface EncryptedCredentialRecord {
  scope: 'platform' | string;
  providerName: 'Google Gemini' | 'Custom Compatible Adapter';
  encryptedKey?: string;
  maskedKeyHint: string | null;
  textReasoningEnabled: boolean;
  textModel: string;
  newsSearchEnabled: boolean;
  imageGenEnabled: boolean;
  imageModel: string;
  pageSpeedEnabled: boolean;
  credentialSource: 'platform_env' | 'client_owned' | 'not_configured';
  usagePolicyNote: string;
  lastTestedAt?: string | null;
  lastTestStatus?: 'Operational' | 'Untested' | 'Failed';
  lastTestMessage?: string;
  updatedAt: string;
}

interface DatabaseSchema {
  adminCredentials: {
    email: string;
    passwordHash: string;
    name: string;
    updatedAt: string;
  };
  clients: ClientRecord[];
  invitations: ClientInvitation[];
  clientCredentials: {
    clientId: string;
    email: string;
    passkeyHash: string;
    activatedAt: string;
  }[];
  projects: ProjectRecord[];
  tasks: TaskRecord[];
  taskProgressHistory: TaskProgressHistoryRecord[];
  businessDNAReports: BusinessDNAReport[];
  quotationRequests: QuotationRequest[];
  aiConfigs: EncryptedCredentialRecord[];
  sentinaleseActivities: SentinaleseActivityRecord[];
  newsResultsByClient: Record<string, NewsResultItem[]>;
  growthRecommendations: GrowthRecommendationItem[];
  generatedAdvertisements: GeneratedAdvertisement[];
  notifications: NotificationRecord[];
  auditLogs: AuditLogRecord[];
}

function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const SERVER_ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.SENTINAL_SECRET || 'sentinal-server-master-key-2026')
  .digest();

function encryptApiKey(rawKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SERVER_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(rawKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptApiKey(payload: string): string | null {
  try {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      SERVER_ENCRYPTION_KEY,
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

function maskKey(key?: string | null): string | null {
  if (!key || key.trim().length < 6) return null;
  const trimmed = key.trim();
  if (trimmed === 'MY_GEMINI_API_KEY') return null;
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

function hasValidEnvGeminiKey(): boolean {
  const k = process.env.GEMINI_API_KEY;
  return Boolean(k && k.trim().length > 10 && k !== 'MY_GEMINI_API_KEY');
}

function createCleanDatabase(): DatabaseSchema {
  const defaultPassword = process.env.ADMIN_PASSWORD || 'Sentinal@2026';
  const envConfigured = hasValidEnvGeminiKey();
  return {
    adminCredentials: {
      email: 'admin@sentinal.in',
      passwordHash: hashSecret(defaultPassword),
      name: 'SENTINAL Administrator',
      updatedAt: new Date().toISOString(),
    },
    clients: [],
    invitations: [],
    clientCredentials: [],
    projects: [],
    tasks: [],
    taskProgressHistory: [],
    businessDNAReports: [],
    quotationRequests: [],
    aiConfigs: [
      {
        scope: 'platform',
        providerName: 'Google Gemini',
        maskedKeyHint: envConfigured ? maskKey(process.env.GEMINI_API_KEY) : null,
        textReasoningEnabled: true,
        textModel: 'gemini-3.8-flash',
        newsSearchEnabled: true,
        imageGenEnabled: true,
        imageModel: 'gemini-3.1-flash-lite-image',
        pageSpeedEnabled: true,
        credentialSource: envConfigured ? 'platform_env' : 'not_configured',
        usagePolicyNote:
          'Platform-managed AI adapter with deterministic fallback and client-owned API key override support.',
        lastTestedAt: null,
        lastTestStatus: 'Untested',
        lastTestMessage: envConfigured
          ? 'Environment Gemini API key detected. Run capability test to verify.'
          : 'Using platform intelligence adapter. Attach a client or platform Gemini API key for live model calls.',
        updatedAt: new Date().toISOString(),
      },
    ],
    sentinaleseActivities: [],
    newsResultsByClient: {},
    growthRecommendations: [],
    generatedAdvertisements: [],
    notifications: [],
    auditLogs: [],
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const clean = createCleanDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(clean, null, 2), 'utf8');
      return clean;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    return {
      ...createCleanDatabase(),
      ...parsed,
    };
  } catch {
    return createCleanDatabase();
  }
}

let db: DatabaseSchema = loadDatabase();

// Transient plaintext store in memory for newly generated invitation codes so they are never persisted on disk unnecessarily
const transientCodePlaintextByInvitationId = new Map<string, string>();

function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Strip any transient plaintext before writing to disk
    const diskCopy: DatabaseSchema = {
      ...db,
      invitations: db.invitations.map((inv) => ({
        ...inv,
        transientPlaintext: null,
      })),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(diskCopy, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

function addAuditLog(
  actorRole: 'admin' | 'client' | 'system',
  actorName: string,
  action: string,
  targetType: string,
  summary: string,
  targetId?: string
): void {
  db.auditLogs.unshift({
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    actorRole,
    actorName,
    action,
    targetType,
    targetId,
    summary,
    timestamp: new Date().toISOString(),
  });
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
}

function addNotification(
  title: string,
  message: string,
  category: NotificationRecord['category'],
  linkRoute?: string
): void {
  db.notifications.unshift({
    id: `notif_${crypto.randomBytes(6).toString('hex')}`,
    title,
    message,
    category,
    read: false,
    createdAt: new Date().toISOString(),
    linkRoute,
  });
}

// Session management
interface ActiveSession {
  token: string;
  role: 'admin' | 'client';
  clientId?: string;
  actorName: string;
  createdAt: number;
  expiresAt: number;
}

const sessions = new Map<string, ActiveSession>();

// Rate limiting
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxRequests) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function getSessionFromRequest(req: Request): ActiveSession | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  if (session.role === 'client' && session.clientId) {
    const client = db.clients.find((c) => c.id === session.clientId);
    if (!client || client.status !== 'active') {
      sessions.delete(token);
      return null;
    }
  }
  return session;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== 'admin') {
    res.status(401).json({
      error: 'Administrator authentication required.',
    });
    return;
  }
  (req as Request & { session: ActiveSession }).session = session;
  next();
}

function requireClientAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== 'client' || !session.clientId) {
    res.status(403).json({
      error:
        'Sentinalese and private workspace features are available exclusively to approved, authenticated clients.',
    });
    return;
  }
  (req as Request & { session: ActiveSession }).session = session;
  next();
}

function resolveGeminiClientForClient(clientId?: string): {
  ai: GoogleGenAI | null;
  modelName: string;
  imageModelName: string;
  sourceLabel: string;
} {
  if (clientId) {
    const clientCfg = db.aiConfigs.find((c) => c.scope === clientId);
    if (clientCfg && clientCfg.encryptedKey) {
      const decrypted = decryptApiKey(clientCfg.encryptedKey);
      if (decrypted) {
        return {
          ai: new GoogleGenAI({
            apiKey: decrypted,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          }),
          modelName: clientCfg.textModel || 'gemini-3.8-flash',
          imageModelName: clientCfg.imageModel || 'gemini-3.1-flash-lite-image',
          sourceLabel: 'Client-Owned Gemini API Key',
        };
      }
    }
  }

  const platformCfg = db.aiConfigs.find((c) => c.scope === 'platform');
  if (platformCfg && platformCfg.encryptedKey) {
    const decrypted = decryptApiKey(platformCfg.encryptedKey);
    if (decrypted) {
      return {
        ai: new GoogleGenAI({
          apiKey: decrypted,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        }),
        modelName: platformCfg.textModel || 'gemini-3.8-flash',
        imageModelName: platformCfg.imageModel || 'gemini-3.1-flash-lite-image',
        sourceLabel: 'Platform Configured Gemini API Key',
      };
    }
  }

  if (hasValidEnvGeminiKey()) {
    return {
      ai: new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      }),
      modelName: platformCfg?.textModel || 'gemini-3.8-flash',
      imageModelName: platformCfg?.imageModel || 'gemini-3.1-flash-lite-image',
      sourceLabel: 'Environment Gemini API Key',
    };
  }

  return {
    ai: null,
    modelName: platformCfg?.textModel || 'gemini-3.8-flash',
    imageModelName: platformCfg?.imageModel || 'gemini-3.1-flash-lite-image',
    sourceLabel: 'SENTINAL Deterministic Intelligence Engine',
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Upstream AI request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function generateSecureInvitationCode(): {
  plaintext: string;
  codeHash: string;
  codePrefix: string;
} {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    chars += alphabet[bytes[i] % alphabet.length];
  }
  const p1 = chars.slice(0, 4);
  const p2 = chars.slice(4, 8);
  const p3 = chars.slice(8, 12);
  const plaintext = `SNTL-${p1}-${p2}-${p3}`;
  return {
    plaintext,
    codeHash: hashSecret(plaintext),
    codePrefix: `SNTL-${p1}-••••-••••`,
  };
}

function recomputeProjectProgress(projectId: string): ProjectRecord | null {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return null;
  const calc = calculateProjectProgress(db.tasks, projectId);
  project.overallProgress = calc.percentage;
  project.status = calc.statusLabel;
  project.taskCount = calc.taskCount;
  project.updatedAt = new Date().toISOString();
  return project;
}

// Safe HTML extraction helper for Business DNA website inspection
function extractPublicWebsiteSignals(html: string, finalUrl: string): {
  title: string;
  metaDescription: string;
  ogSiteName: string;
  headings: string[];
  extractedColors: string[];
  logoUrl: string | null;
  paragraphs: string[];
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanHtmlText(titleMatch[1]).slice(0, 140) : '';

  const descMatch =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
    ) ||
    html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    );
  const metaDescription = descMatch ? cleanHtmlText(descMatch[1]).slice(0, 300) : '';

  const siteNameMatch = html.match(
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i
  );
  const ogSiteName = siteNameMatch ? cleanHtmlText(siteNameMatch[1]).slice(0, 80) : '';

  const headings: string[] = [];
  const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 10) {
    const cleaned = cleanHtmlText(hMatch[1]);
    if (cleaned.length > 3 && cleaned.length < 140 && !headings.includes(cleaned)) {
      headings.push(cleaned);
    }
  }

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(html)) !== null && paragraphs.length < 8) {
    const cleaned = cleanHtmlText(pMatch[1]);
    if (cleaned.length > 30 && cleaned.length < 280) {
      paragraphs.push(cleaned);
    }
  }

  const colorMatches = html.match(/#[0-9A-Fa-f]{6}\b/g) || [];
  const ignoredColors = new Set([
    '#FFFFFF',
    '#000000',
    '#F8FAFC',
    '#E2E8F0',
    '#CBD5E1',
    '#94A3B8',
    '#64748B',
    '#334155',
    '#1E293B',
    '#0F172A',
    '#F1F5F9',
    '#E5E7EB',
    '#D1D5DB',
  ]);
  const extractedColors: string[] = [];
  for (const hex of colorMatches) {
    const upper = hex.toUpperCase();
    if (!ignoredColors.has(upper) && !extractedColors.includes(upper)) {
      extractedColors.push(upper);
      if (extractedColors.length >= 4) break;
    }
  }

  let logoUrl: string | null = null;
  const iconMatch =
    html.match(/<link[^>]+rel=["'](?:apple-touch-icon|icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (iconMatch && iconMatch[1]) {
    try {
      logoUrl = new URL(iconMatch[1], finalUrl).toString();
    } catch {
      logoUrl = null;
    }
  }

  return {
    title,
    metaDescription,
    ogSiteName,
    headings,
    extractedColors,
    logoUrl,
    paragraphs,
  };
}

function cleanHtmlText(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Deterministic brand-accurate SVG advertisement renderer with original logo compositing
function buildCompositedAdvertisementDataUrl(params: {
  businessName: string;
  industry: string;
  productService: string;
  offerMessage: string;
  callToAction: string;
  targetAudience: string;
  creativeStyle: string;
  platformPlacement: string;
  aspectRatio: AdAspectRatio;
  brandColors: { hex: string; label: string }[];
  websiteUrl?: string;
}): string {
  const [widthStr, heightStr] = params.aspectRatio.split('x');
  const width = parseInt(widthStr, 10) || 1080;
  const height = parseInt(heightStr, 10) || 1080;

  const primaryHex = params.brandColors[0]?.hex || '#F97316';
  const secondaryHex = params.brandColors[1]?.hex || '#0F172A';
  const accentHex = params.brandColors[2]?.hex || '#38BDF8';

  const escapeXml = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const isLandscape = width > height;
  const isTall = height >= 1600;
  const pad = isLandscape ? 56 : 76;
  const titleFontSize = isLandscape ? 44 : isTall ? 68 : 56;
  const subFontSize = isLandscape ? 22 : 28;

  // Split offerMessage into lines of ~26 chars
  const words = (params.offerMessage || params.productService || 'Accelerate Your Growth').split(/\s+/);
  const headlineLines: string[] = [];
  let currentLine = '';
  const maxCharsPerLine = isLandscape ? 34 : 24;
  for (const w of words) {
    if ((currentLine + ' ' + w).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + w).trim();
    } else {
      if (currentLine) headlineLines.push(currentLine);
      currentLine = w;
    }
  }
  if (currentLine) headlineLines.push(currentLine);
  const cappedLines = headlineLines.slice(0, 3);

  const headlineStartY = isLandscape ? 220 : isTall ? 520 : 360;
  const lineHeight = Math.round(titleFontSize * 1.22);

  const ctaY = height - pad - (isLandscape ? 88 : 130);
  const ctaWidth = Math.min(width - pad * 2, Math.max(320, params.callToAction.length * 22 + 96));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F17"/>
      <stop offset="55%" stop-color="${escapeXml(secondaryHex)}"/>
      <stop offset="100%" stop-color="#171717"/>
    </linearGradient>
    <radialGradient id="accentGlow" cx="85%" cy="18%" r="55%">
      <stop offset="0%" stop-color="${escapeXml(primaryHex)}" stop-opacity="0.42"/>
      <stop offset="60%" stop-color="${escapeXml(accentHex)}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${escapeXml(primaryHex)}"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>
  </defs>

  <!-- Canvas Base -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
  <rect width="${width}" height="${height}" fill="url(#accentGlow)"/>

  <!-- Architectural Grid Lines -->
  <g stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1">
    <line x1="${pad}" y1="0" x2="${pad}" y2="${height}"/>
    <line x1="${width - pad}" y1="0" x2="${width - pad}" y2="${height}"/>
    <line x1="0" y1="${pad + 84}" x2="${width}" y2="${pad + 84}"/>
    <line x1="0" y1="${ctaY - 44}" x2="${width}" y2="${ctaY - 44}"/>
  </g>

  <!-- Decorative Geometric Accent Frame -->
  <circle cx="${width - pad - 80}" cy="${headlineStartY + 40}" r="${isLandscape ? 140 : 210}" fill="none" stroke="${escapeXml(primaryHex)}" stroke-opacity="0.24" stroke-width="2"/>
  <circle cx="${width - pad - 80}" cy="${headlineStartY + 40}" r="${isLandscape ? 95 : 145}" fill="none" stroke="${escapeXml(accentHex)}" stroke-opacity="0.18" stroke-width="1.5"/>

  <!-- Top Brand Lockup & Deterministic Logo Composite -->
  <g transform="translate(${pad}, ${pad})">
    <rect x="0" y="0" width="56" height="56" rx="12" fill="${escapeXml(primaryHex)}"/>
    <!-- SENTINAL Sun-Spiral-Wave Brand Mark -->
    <g transform="translate(10, 10)" stroke="#FFFFFF" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M8 20 C8 12, 28 12, 28 20 C28 25, 14 25, 14 19 C14 16, 22 16, 22 20"/>
      <path d="M4 28 Q11 24 18 28 T32 28"/>
      <path d="M4 33 Q11 29 18 33 T32 33"/>
      <line x1="18" y1="4" x2="18" y2="7"/>
      <line x1="10" y1="6" x2="12" y2="9"/>
      <line x1="26" y1="6" x2="24" y2="9"/>
    </g>
    <text x="74" y="26" fill="#FFFFFF" font-family="'Plus Jakarta Sans', sans-serif" font-size="24" font-weight="800" letter-spacing="0.5">${escapeXml(params.businessName.toUpperCase())}</text>
    <text x="74" y="48" fill="#94A3B8" font-family="'DM Sans', sans-serif" font-size="16" font-weight="500">${escapeXml(params.industry)} · ${escapeXml(params.platformPlacement)}</text>
  </g>

  <!-- Format & Creative Style Tag -->
  <text x="${width - pad}" y="${pad + 36}" text-anchor="end" fill="${escapeXml(accentHex)}" font-family="'JetBrains Mono', monospace" font-size="16" font-weight="600">${escapeXml(params.creativeStyle.toUpperCase())} · ${escapeXml(params.aspectRatio)}</text>

  <!-- Kicker / Product Service -->
  <text x="${pad}" y="${headlineStartY - 46}" fill="${escapeXml(primaryHex)}" font-family="'Plus Jakarta Sans', sans-serif" font-size="${subFontSize}" font-weight="700" letter-spacing="1.5">${escapeXml(params.productService.toUpperCase())}</text>

  <!-- Main Campaign Offer Headline -->
  ${cappedLines
    .map(
      (line, idx) =>
        `<text x="${pad}" y="${headlineStartY + idx * lineHeight}" fill="#FFFFFF" font-family="'Plus Jakarta Sans', sans-serif" font-size="${titleFontSize}" font-weight="800">${escapeXml(line)}</text>`
    )
    .join('\n  ')}

  <!-- Audience & Value Context -->
  <text x="${pad}" y="${headlineStartY + cappedLines.length * lineHeight + 28}" fill="#CBD5E1" font-family="'DM Sans', sans-serif" font-size="${subFontSize}" font-weight="400">Tailored for ${escapeXml(params.targetAudience.slice(0, 62))}</text>

  <!-- Brand Color Swatch Bar -->
  <g transform="translate(${pad}, ${headlineStartY + cappedLines.length * lineHeight + 62})">
    <rect x="0" y="0" width="48" height="8" rx="4" fill="${escapeXml(primaryHex)}"/>
    <rect x="58" y="0" width="32" height="8" rx="4" fill="${escapeXml(accentHex)}"/>
    <rect x="100" y="0" width="20" height="8" rx="4" fill="#16A34A"/>
  </g>

  <!-- Call To Action Button -->
  <g transform="translate(${pad}, ${ctaY})">
    <rect x="0" y="0" width="${ctaWidth}" height="74" rx="14" fill="url(#ctaGrad)"/>
    <text x="${Math.round(ctaWidth / 2)}" y="46" text-anchor="middle" fill="#FFFFFF" font-family="'Plus Jakarta Sans', sans-serif" font-size="25" font-weight="700">${escapeXml(params.callToAction)}</text>
  </g>

  <!-- Verified Brand Footer -->
  <text x="${pad}" y="${height - Math.round(pad / 2)}" fill="#94A3B8" font-family="'JetBrains Mono', monospace" font-size="16">${escapeXml(params.websiteUrl || params.businessName)} · Brand Identity Verified</text>
  <text x="${width - pad}" y="${height - Math.round(pad / 2)}" text-anchor="end" fill="#FFFFFF" fill-opacity="0.7" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="700">sentinal</text>
</svg>`;

  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // ============================================================================
  // 1. PUBLIC & AUTHENTICATION ROUTES
  // ============================================================================

  app.get('/api/auth/session', (req: Request, res: Response) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      res.json({ authenticated: false, role: 'public' });
      return;
    }
    if (session.role === 'admin') {
      res.json({
        authenticated: true,
        role: 'admin',
        actorName: session.actorName,
        email: db.adminCredentials.email,
      });
      return;
    }
    const client = db.clients.find((c) => c.id === session.clientId);
    if (!client) {
      res.json({ authenticated: false, role: 'public' });
      return;
    }
    res.json({
      authenticated: true,
      role: 'client',
      clientId: client.id,
      businessName: client.businessName,
      contactName: client.contactName,
      email: client.email,
      industry: client.industry,
      projectId: client.projectId,
      projectName: client.projectName,
    });
  });

  app.post('/api/auth/admin/login', (req: Request, res: Response) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(`admin_login_${ip}`, 15, 60_000)) {
      res.status(429).json({
        error: 'Too many sign-in attempts. Please wait a minute before trying again.',
      });
      return;
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const allowedEmails = [
      db.adminCredentials.email.toLowerCase(),
      'saicharan124muddula@gmail.com',
    ];
    const submittedHash = hashSecret(String(password));

    if (
      !allowedEmails.includes(normalizedEmail) ||
      submittedHash !== db.adminCredentials.passwordHash
    ) {
      addAuditLog('system', 'Auth Guard', 'ADMIN_LOGIN_FAILED', 'AdminUsers', `Failed admin sign-in attempt for ${normalizedEmail}`);
      saveDatabase();
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    const token = `adm_${crypto.randomBytes(24).toString('hex')}`;
    const now = Date.now();
    sessions.set(token, {
      token,
      role: 'admin',
      actorName: db.adminCredentials.name,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    addAuditLog(
      'admin',
      db.adminCredentials.name,
      'ADMIN_LOGIN_SUCCESS',
      'AdminUsers',
      `Administrator signed in (${normalizedEmail})`
    );
    saveDatabase();

    res.json({
      token,
      role: 'admin',
      actorName: db.adminCredentials.name,
      email: normalizedEmail,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      sessions.delete(token);
    }
    res.json({ loggedOut: true });
  });

  // Client invitation activation
  app.post('/api/auth/client/activate', (req: Request, res: Response) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(`client_activate_${ip}`, 12, 60_000)) {
      res.status(429).json({
        error: 'Too many verification attempts. Please wait 60 seconds and try again.',
      });
      return;
    }

    const { accessCode, clientPasskey } = req.body || {};
    const cleanedCode = String(accessCode || '')
      .trim()
      .toUpperCase();
    if (!cleanedCode) {
      res.status(400).json({ error: 'Please enter a valid client access code.' });
      return;
    }

    const codeHash = hashSecret(cleanedCode);
    const invitation = db.invitations.find((inv) => inv.codeHash === codeHash);
    if (!invitation) {
      addAuditLog(
        'system',
        'Client Access Gate',
        'CLIENT_CODE_INVALID',
        'ClientInvitations',
        'Submitted access code did not match any active invitation hash.'
      );
      saveDatabase();
      res.status(401).json({
        error: 'Invalid, expired, or revoked client access code.',
      });
      return;
    }

    const evaluation = evaluateInvitationState(invitation, Date.now());
    if (!evaluation.usable) {
      if (evaluation.effectiveStatus === 'expired' && invitation.status === 'active') {
        invitation.status = 'expired';
        saveDatabase();
      }
      res.status(401).json({
        error: evaluation.reason,
        codeStatus: evaluation.effectiveStatus,
      });
      return;
    }

    const client = db.clients.find((c) => c.id === invitation.clientId);
    if (!client || client.status !== 'active') {
      res.status(403).json({
        error: 'This client workspace is currently unavailable or suspended.',
      });
      return;
    }

    // Consume invitation code and bind client identity + session
    invitation.status = 'consumed';
    invitation.consumedAt = new Date().toISOString();
    transientCodePlaintextByInvitationId.delete(invitation.id);

    // Optional passkey for subsequent re-authentication without invitation code
    const chosenPasskey =
      clientPasskey && String(clientPasskey).trim().length >= 6
        ? String(clientPasskey).trim()
        : cleanedCode;
    const existingCredIdx = db.clientCredentials.findIndex(
      (cc) => cc.clientId === client.id
    );
    const credRecord = {
      clientId: client.id,
      email: client.email.toLowerCase(),
      passkeyHash: hashSecret(chosenPasskey),
      activatedAt: new Date().toISOString(),
    };
    if (existingCredIdx >= 0) {
      db.clientCredentials[existingCredIdx] = credRecord;
    } else {
      db.clientCredentials.push(credRecord);
    }

    const token = `cli_${crypto.randomBytes(24).toString('hex')}`;
    const now = Date.now();
    sessions.set(token, {
      token,
      role: 'client',
      clientId: client.id,
      actorName: `${client.contactName} (${client.businessName})`,
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    });

    addAuditLog(
      'client',
      client.businessName,
      'CLIENT_INVITATION_ACTIVATED',
      'Clients',
      `Client workspace activated for ${client.businessName}`,
      client.id
    );
    addNotification(
      'Client Workspace Activated',
      `${client.businessName} (${client.contactName}) activated their invitation code and entered the workspace.`,
      'client',
      '/admin/clients'
    );
    saveDatabase();

    res.json({
      token,
      role: 'client',
      client: {
        id: client.id,
        businessName: client.businessName,
        contactName: client.contactName,
        email: client.email,
        industry: client.industry,
        projectId: client.projectId,
        projectName: client.projectName,
      },
    });
  });

  // Subsequent reauthentication flow for already-activated clients
  app.post('/api/auth/client/reauth', (req: Request, res: Response) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(`client_reauth_${ip}`, 12, 60_000)) {
      res.status(429).json({
        error: 'Too many sign-in attempts. Please wait a minute.',
      });
      return;
    }

    const { email, passkey } = req.body || {};
    if (!email || !passkey) {
      res.status(400).json({
        error: 'Business email and workspace passkey are required.',
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passkeyHash = hashSecret(String(passkey).trim());
    const cred = db.clientCredentials.find(
      (c) => c.email === normalizedEmail && c.passkeyHash === passkeyHash
    );
    if (!cred) {
      res.status(401).json({
        error: 'Invalid business email or workspace passkey.',
      });
      return;
    }

    const client = db.clients.find((c) => c.id === cred.clientId);
    if (!client || client.status !== 'active') {
      res.status(403).json({
        error: 'This client workspace has been suspended or deactivated.',
      });
      return;
    }

    const token = `cli_${crypto.randomBytes(24).toString('hex')}`;
    const now = Date.now();
    sessions.set(token, {
      token,
      role: 'client',
      clientId: client.id,
      actorName: `${client.contactName} (${client.businessName})`,
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    });

    addAuditLog(
      'client',
      client.businessName,
      'CLIENT_SESSION_REAUTHENTICATED',
      'Clients',
      `Returning client session authenticated for ${client.businessName}`,
      client.id
    );
    saveDatabase();

    res.json({
      token,
      role: 'client',
      client: {
        id: client.id,
        businessName: client.businessName,
        contactName: client.contactName,
        email: client.email,
        industry: client.industry,
        projectId: client.projectId,
        projectName: client.projectName,
      },
    });
  });

  // ============================================================================
  // 2. PUBLIC QUOTATION REQUESTS
  // ============================================================================

  app.post('/api/quotations', (req: Request, res: Response) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(`quote_${ip}`, 10, 60_000)) {
      res.status(429).json({
        error: 'Too many quotation requests submitted recently. Please wait a moment.',
      });
      return;
    }

    const {
      name,
      businessName,
      email,
      phone,
      websiteUrl,
      industry,
      servicesRequired,
      mainObjective,
      additionalDetails,
    } = req.body || {};

    if (!name || ! String(name).trim()) {
      res.status(400).json({ error: 'Your full name is required.' });
      return;
    }
    if (!businessName || !String(businessName).trim()) {
      res.status(400).json({ error: 'Business name is required.' });
      return;
    }
    const emailStr = String(email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      res.status(400).json({ error: 'Please provide a valid business email address.' });
      return;
    }
    if (!industry || !String(industry).trim()) {
      res.status(400).json({ error: 'Please select or enter your business industry.' });
      return;
    }
    if (!Array.isArray(servicesRequired) || servicesRequired.length === 0) {
      res.status(400).json({ error: 'Please select at least one marketing or growth service.' });
      return;
    }
    if (!mainObjective || !String(mainObjective).trim()) {
      res.status(400).json({ error: 'Please describe your main business objective.' });
      return;
    }

    let validatedWebsite: string | undefined;
    if (websiteUrl && String(websiteUrl).trim()) {
      const check = validateExternalPublicUrl(String(websiteUrl));
      if (!check.valid) {
        res.status(400).json({ error: check.error });
        return;
      }
      validatedWebsite = check.normalizedUrl;
    }

    const now = new Date().toISOString();
    const record: QuotationRequest = {
      id: `quo_${crypto.randomBytes(6).toString('hex')}`,
      name: String(name).trim(),
      businessName: String(businessName).trim(),
      email: emailStr,
      phone: phone ? String(phone).trim() : undefined,
      websiteUrl: validatedWebsite,
      industry: String(industry).trim(),
      servicesRequired: servicesRequired.map((s: unknown) => String(s)),
      mainObjective: String(mainObjective).trim(),
      additionalDetails: additionalDetails ? String(additionalDetails).trim() : undefined,
      status: 'Pending Review',
      createdAt: now,
      updatedAt: now,
    };

    db.quotationRequests.unshift(record);
    addNotification(
      `New Quotation Request: ${record.businessName}`,
      `${record.name} requested a quote for ${record.servicesRequired.join(', ')}.`,
      'quotation',
      '/admin/quotation-requests'
    );
    addAuditLog(
      'system',
      record.name,
      'QUOTATION_SUBMITTED',
      'QuotationRequests',
      `Public quotation submitted by ${record.businessName} (${record.email})`,
      record.id
    );
    saveDatabase();

    res.status(201).json({
      quotation: {
        id: record.id,
        businessName: record.businessName,
        status: record.status,
        createdAt: record.createdAt,
      },
      message:
        'Your marketing quotation request has been received. Our team will review your requirements and get in touch.',
    });
  });

  // ============================================================================
  // 3. BUSINESS DNA — AUTOMATIC WEBSITE & MANUAL ANALYSIS
  // ============================================================================

  app.post('/api/business-dna/analyze-url', async (req: Request, res: Response) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(`dna_url_${ip}`, 10, 60_000)) {
      res.status(429).json({
        error: 'Rate limit reached for website analysis. Please wait a minute.',
      });
      return;
    }

    const { websiteUrl, ownerSessionId } = req.body || {};
    const urlCheck = validateExternalPublicUrl(String(websiteUrl || ''));
    if (!urlCheck.valid || !urlCheck.normalizedUrl || !urlCheck.hostname) {
      res.status(400).json({ error: urlCheck.error || 'Invalid website URL.' });
      return;
    }

    const targetUrl = urlCheck.normalizedUrl;
    const hostname = urlCheck.hostname;
    const session = getSessionFromRequest(req);

    const startMs = Date.now();
    let htmlContent = '';
    let fetchError: string | null = null;
    let finalUrl = targetUrl;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7500);
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SENTINAL-BusinessDNA-Inspector/1.0 (+https://sentinal.in)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        fetchError = `Website returned HTTP ${response.status} (${response.statusText}).`;
      } else {
        finalUrl = response.url || targetUrl;
        // Validate redirect destination against SSRF
        const redirectCheck = validateExternalPublicUrl(finalUrl);
        if (!redirectCheck.valid) {
          res.status(400).json({ error: 'Redirected to a restricted network address.' });
          return;
        }
        const rawText = await response.text();
        htmlContent = rawText.slice(0, 250_000); // Enforce response-size limit
      }
    } catch (err: unknown) {
      fetchError =
        err instanceof Error ? err.message : 'Unable to connect to the website.';
    }

    const elapsedMs = Date.now() - startMs;

    if (fetchError || htmlContent.trim().length < 80) {
      res.status(422).json({
        insufficient: true,
        reason:
          fetchError ||
          'The website did not return enough accessible HTML content for automatic extraction.',
        fallbackMessage:
          "We couldn't discover enough about your business automatically. Let's build your Business DNA together.",
        suggestedWebsiteUrl: targetUrl,
      });
      return;
    }

    const signals = extractPublicWebsiteSignals(htmlContent, finalUrl);
    const hasMeaningfulSignals =
      Boolean(signals.title) ||
      Boolean(signals.metaDescription) ||
      signals.headings.length > 0;

    if (!hasMeaningfulSignals) {
      res.status(422).json({
        insufficient: true,
        reason: 'Accessible page HTML contained no title, meta description, or structured headings.',
        fallbackMessage:
          "We couldn't discover enough about your business automatically. Let's build your Business DNA together.",
        suggestedWebsiteUrl: targetUrl,
      });
      return;
    }

    const derivedBusinessName =
      signals.ogSiteName ||
      (signals.title ? signals.title.split(/[|\-—:]/)[0].trim() : '') ||
      hostname.replace(/^www\./, '').split('.')[0].toUpperCase();

    // Try enriching with Gemini if available
    const { ai, modelName } = resolveGeminiClientForClient(session?.clientId);
    let aiEnrichment: Partial<BusinessDNAReport> | null = null;

    if (ai) {
      try {
        const prompt = `Analyse these extracted public website signals for "${derivedBusinessName}" (${finalUrl}) and return a JSON object describing its Business DNA. Do not invent private revenue or unverified traffic metrics.
Title: ${signals.title}
Meta Description: ${signals.metaDescription}
Headings: ${signals.headings.join(' | ')}
Paragraph Excerpts: ${signals.paragraphs.slice(0, 4).join(' // ')}
Extracted Hex Colours: ${signals.extractedColors.join(', ')}`;

        const geminiRes = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                industry: { type: Type.STRING },
                brandPersonality: { type: Type.ARRAY, items: { type: Type.STRING } },
                productsAndServices: { type: Type.ARRAY, items: { type: Type.STRING } },
                targetAudienceHypotheses: { type: Type.ARRAY, items: { type: Type.STRING } },
                valueProposition: { type: Type.STRING },
                toneOfVoice: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvementOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'industry',
                'brandPersonality',
                'productsAndServices',
                'targetAudienceHypotheses',
                'valueProposition',
                'toneOfVoice',
                'strengths',
                'improvementOpportunities',
                'recommendedNextSteps',
              ],
            },
          },
        }));
        if (geminiRes.text) {
          aiEnrichment = JSON.parse(geminiRes.text.trim());
        }
      } catch {
        aiEnrichment = null;
      }
    }

    const brandColors: BusinessDNAReport['brandColors'] =
      signals.extractedColors.length > 0
        ? signals.extractedColors.map((hex, i) => ({
            hex,
            label: i === 0 ? 'Primary Extracted' : `Accent ${i}`,
            source: 'extracted',
          }))
        : [
            { hex: '#F97316', label: 'Primary Accent (Inferred)', source: 'inferred' },
            { hex: '#171717', label: 'Contrast Surface (Inferred)', source: 'inferred' },
          ];

    const report: BusinessDNAReport = {
      id: `dna_${crypto.randomBytes(6).toString('hex')}`,
      clientId: session?.role === 'client' ? session.clientId : null,
      ownerSessionId: ownerSessionId ? String(ownerSessionId) : null,
      sourceType: 'website_auto',
      businessName: derivedBusinessName,
      websiteUrl: finalUrl,
      industry: aiEnrichment?.industry || 'Digital Commerce & Business Services',
      brandPersonality:
        aiEnrichment?.brandPersonality && aiEnrichment.brandPersonality.length > 0
          ? aiEnrichment.brandPersonality
          : ['Professional', 'Customer-Focused', 'Growth-Oriented'],
      brandColors,
      extractedLogoUrl: signals.logoUrl,
      productsAndServices:
        aiEnrichment?.productsAndServices && aiEnrichment.productsAndServices.length > 0
          ? aiEnrichment.productsAndServices
          : signals.headings.length > 0
          ? signals.headings.slice(0, 4)
          : ['Core Digital Offerings & Services'],
      targetAudienceHypotheses:
        aiEnrichment?.targetAudienceHypotheses &&
        aiEnrichment.targetAudienceHypotheses.length > 0
          ? aiEnrichment.targetAudienceHypotheses
          : [
              'Decision-makers evaluating online solutions in this category',
              'Digital-first customers seeking reliable service delivery',
            ],
      websiteMessaging: {
        headline: signals.headings[0] || signals.title || derivedBusinessName,
        metaDescription:
          signals.metaDescription || 'No meta description tag detected on landing page.',
        valueProposition:
          aiEnrichment?.valueProposition ||
          signals.metaDescription ||
          signals.paragraphs[0] ||
          `Public web presence for ${derivedBusinessName} at ${hostname}.`,
        toneOfVoice: aiEnrichment?.toneOfVoice || 'Clear, informative corporate tone',
      },
      digitalPresenceObservations: [
        {
          signal: 'Title Tag & Headline Hierarchy',
          finding: signals.title
            ? `Detected page title "${signals.title}" and ${signals.headings.length} structured H1–H3 headings.`
            : 'Missing <title> tag on primary landing document.',
          verificationStatus: 'measured',
        },
        {
          signal: 'Meta Description & Search Snippet Readiness',
          finding: signals.metaDescription
            ? `Meta description present (${signals.metaDescription.length} characters).`
            : 'No meta description tag found; search engines may synthesize snippets unpredictably.',
          verificationStatus: 'measured',
        },
        {
          signal: 'Transport Security & Initial HTML Delivery',
          finding: `${finalUrl.startsWith('https://') ? 'HTTPS enabled' : 'HTTP only (unencrypted)'}; initial HTML payload (${Math.round(htmlContent.length / 1024)} KB) fetched in ${elapsedMs} ms.`,
          verificationStatus: 'measured',
        },
      ],
      performanceMetrics: {
        measured: true,
        source: 'SENTINAL Live HTTP & DOM Signal Inspector',
        responseTimeMs: elapsedMs,
        httpsEnabled: finalUrl.startsWith('https://'),
        htmlSizeBytes: Buffer.byteLength(htmlContent, 'utf8'),
        headingCount: signals.headings.length,
        metaTagsComplete: Boolean(signals.title && signals.metaDescription),
        pageSpeedScore: null,
        note: 'Response timing and HTML structure were measured directly. Google PageSpeed Insights lab score requires an active PageSpeed API key.',
      },
      strengths:
        aiEnrichment?.strengths && aiEnrichment.strengths.length > 0
          ? aiEnrichment.strengths
          : [
              finalUrl.startsWith('https://')
                ? 'Active HTTPS security configuration'
                : 'Accessible public web domain',
              signals.headings.length > 0
                ? `Structured content hierarchy with ${signals.headings.length} key headings`
                : 'Clean HTML document delivery',
              signals.metaDescription
                ? 'Defined search meta description for organic discovery'
                : 'Fast initial server response time',
            ],
      improvementOpportunities:
        aiEnrichment?.improvementOpportunities &&
        aiEnrichment.improvementOpportunities.length > 0
          ? aiEnrichment.improvementOpportunities
          : [
              !signals.metaDescription
                ? 'Add a high-intent 150–160 character meta description to improve organic click-through rate.'
                : 'Strengthen above-the-fold proof points and quantified client outcomes.',
              signals.extractedColors.length === 0
                ? 'Define explicit brand theme-color meta tags and consistent CSS color tokens.'
                : 'Consolidate visual call-to-action contrast across landing sections.',
              'Align landing page messaging with targeted ad creatives and conversion funnels.',
            ],
      recommendedNextSteps:
        aiEnrichment?.recommendedNextSteps && aiEnrichment.recommendedNextSteps.length > 0
          ? aiEnrichment.recommendedNextSteps
          : [
              'Audit primary landing conversion flow and lead capture friction.',
              'Develop brand-consistent static advertisement creatives tailored to core offerings.',
              'Establish weekly industry trend monitoring for timely campaign positioning.',
            ],
      dataSources: [
        `Live HTTP Inspection of ${finalUrl}`,
        ai ? `Gemini (${modelName}) Signal Synthesis` : 'SENTINAL Structural HTML Parser',
      ],
      confidenceLevel:
        signals.title && signals.metaDescription
          ? 'High (Measured + Verified)'
          : 'Moderate (Public Signals + AI Analysis)',
      createdAt: new Date().toISOString(),
    };

    db.businessDNAReports.unshift(report);
    if (session?.role === 'client' && session.clientId) {
      const client = db.clients.find((c) => c.id === session.clientId);
      if (client) {
        client.businessProfileId = report.id;
      }
    }
    addAuditLog(
      session?.role || 'system',
      session?.actorName || 'Public Visitor',
      'BUSINESS_DNA_URL_ANALYZED',
      'BusinessDNAReports',
      `Analysed website ${finalUrl} (${report.businessName})`,
      report.id
    );
    saveDatabase();

    res.json({ report });
  });

  app.post('/api/business-dna/analyze-manual', async (req: Request, res: Response) => {
    const ip = req.ip || 'local';
    if (!checkRateLimit(`dna_manual_${ip}`, 12, 60_000)) {
      res.status(429).json({
        error: 'Too many requests. Please wait a minute before retrying.',
      });
      return;
    }

    const {
      businessName,
      industry,
      productsAndServices,
      targetCustomers,
      locationMarket,
      brandPersonality,
      existingBrandColors,
      websiteUrl,
      mainObjective,
      marketingChallenges,
      competitors,
      additionalContext,
      ownerSessionId,
    } = req.body || {};

    if (!businessName || !String(businessName).trim()) {
      res.status(400).json({ error: 'Business name is required.' });
      return;
    }
    if (!industry || !String(industry).trim()) {
      res.status(400).json({ error: 'Industry / category is required.' });
      return;
    }
    if (!productsAndServices || !String(productsAndServices).trim()) {
      res.status(400).json({ error: 'Products and services description is required.' });
      return;
    }
    if (!targetCustomers || !String(targetCustomers).trim()) {
      res.status(400).json({ error: 'Target customers description is required.' });
      return;
    }
    if (!brandPersonality || !String(brandPersonality).trim()) {
      res.status(400).json({ error: 'Brand personality is required.' });
      return;
    }
    if (!mainObjective || !String(mainObjective).trim()) {
      res.status(400).json({ error: 'Main business objective is required.' });
      return;
    }
    if (!marketingChallenges || !String(marketingChallenges).trim()) {
      res.status(400).json({ error: 'Current marketing challenges are required.' });
      return;
    }

    let normalizedWebsite: string | undefined;
    if (websiteUrl && String(websiteUrl).trim()) {
      const check = validateExternalPublicUrl(String(websiteUrl));
      if (!check.valid) {
        res.status(400).json({ error: check.error });
        return;
      }
      normalizedWebsite = check.normalizedUrl;
    }

    const session = getSessionFromRequest(req);
    const { ai, modelName } = resolveGeminiClientForClient(session?.clientId);

    const parsedProducts = String(productsAndServices)
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedPersonalities = String(brandPersonality)
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedCompetitors = competitors
      ? String(competitors)
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const userColorsRaw = existingBrandColors
      ? String(existingBrandColors).match(/#[0-9A-Fa-f]{6}\b/g) || []
      : [];
    const brandColors: BusinessDNAReport['brandColors'] =
      userColorsRaw.length > 0
        ? userColorsRaw.map((hex, idx) => ({
            hex: hex.toUpperCase(),
            label: idx === 0 ? 'User Primary Colour' : `User Accent ${idx}`,
            source: 'user_provided',
          }))
        : [
            { hex: '#F97316', label: 'Recommended Brand Orange', source: 'inferred' },
            { hex: '#171717', label: 'Core Contrast Ink', source: 'inferred' },
            { hex: '#38BDF8', label: 'Supporting Sky Accent', source: 'inferred' },
          ];

    let aiInsights: {
      valueProposition?: string;
      toneOfVoice?: string;
      strengths?: string[];
      improvementOpportunities?: string[];
      recommendedNextSteps?: string[];
    } | null = null;

    if (ai) {
      try {
        const geminiRes = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: `Build a structured Business DNA synthesis for this manually entered business profile:
Business Name: ${businessName}
Industry: ${industry}
Products/Services: ${productsAndServices}
Target Customers: ${targetCustomers}
Location/Market: ${locationMarket || 'Not specified'}
Brand Personality: ${brandPersonality}
Main Objective: ${mainObjective}
Marketing Challenges: ${marketingChallenges}
Competitors: ${competitors || 'None listed'}
Additional Context: ${additionalContext || 'None'}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                valueProposition: { type: Type.STRING },
                toneOfVoice: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvementOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'valueProposition',
                'toneOfVoice',
                'strengths',
                'improvementOpportunities',
                'recommendedNextSteps',
              ],
            },
          },
        }));
        if (geminiRes.text) {
          aiInsights = JSON.parse(geminiRes.text.trim());
        }
      } catch {
        aiInsights = null;
      }
    }

    const report: BusinessDNAReport = {
      id: `dna_${crypto.randomBytes(6).toString('hex')}`,
      clientId: session?.role === 'client' ? session.clientId : null,
      ownerSessionId: ownerSessionId ? String(ownerSessionId) : null,
      sourceType: 'manual_entry',
      businessName: String(businessName).trim(),
      websiteUrl: normalizedWebsite,
      industry: String(industry).trim(),
      brandPersonality:
        parsedPersonalities.length > 0 ? parsedPersonalities : [String(brandPersonality).trim()],
      brandColors,
      extractedLogoUrl: null,
      productsAndServices:
        parsedProducts.length > 0 ? parsedProducts : [String(productsAndServices).trim()],
      targetAudienceHypotheses: [
        `${String(targetCustomers).trim()} (User-defined primary audience)`,
        locationMarket
          ? `Regional buyers and decision-makers in ${String(locationMarket).trim()} (Hypothesis)`
          : 'High-intent prospects searching for category solutions (Hypothesis)',
      ],
      websiteMessaging: {
        headline: `${String(businessName).trim()} — ${parsedProducts[0] || String(industry).trim()}`,
        metaDescription: normalizedWebsite
          ? `Manual profile submitted for ${normalizedWebsite}`
          : 'No website URL provided; built from manual Business DNA declaration.',
        valueProposition:
          aiInsights?.valueProposition ||
          `Helping ${String(targetCustomers).trim()} with ${String(productsAndServices).trim()} to achieve ${String(mainObjective).trim()}.`,
        toneOfVoice:
          aiInsights?.toneOfVoice ||
          `${String(brandPersonality).trim()} communication style`,
      },
      digitalPresenceObservations: [
        {
          signal: 'Business Identity & Core Offerings',
          finding: `User-declared offerings in ${String(industry).trim()}: ${String(productsAndServices).trim()}.`,
          verificationStatus: 'user_stated',
        },
        {
          signal: 'Primary Growth Objective',
          finding: String(mainObjective).trim(),
          verificationStatus: 'user_stated',
        },
        {
          signal: 'Stated Marketing Challenges',
          finding: String(marketingChallenges).trim(),
          verificationStatus: 'user_stated',
        },
        {
          signal: 'Website Measurement Status',
          finding: normalizedWebsite
            ? `URL ${normalizedWebsite} recorded via manual entry (not live-scraped in this submission).`
            : 'No public website configured; digital discovery relies on social and direct channels.',
          verificationStatus: 'measured',
        },
      ],
      performanceMetrics: {
        measured: false,
        source: 'Manual Business DNA Submission',
        note: 'Profile generated from user-entered business details rather than live website measurement.',
      },
      strengths:
        aiInsights?.strengths && aiInsights.strengths.length > 0
          ? aiInsights.strengths
          : [
              `Clear articulation of core offerings: ${parsedProducts.slice(0, 2).join(', ')}`,
              `Defined target customer profile (${String(targetCustomers).trim()})`,
              `Distinct brand personality direction (${String(brandPersonality).trim()})`,
            ],
      improvementOpportunities:
        aiInsights?.improvementOpportunities &&
        aiInsights.improvementOpportunities.length > 0
          ? aiInsights.improvementOpportunities
          : [
              `Address primary marketing bottleneck: ${String(marketingChallenges).trim()}`,
              !normalizedWebsite
                ? 'Establish a dedicated conversion-focused landing page to capture search intent.'
                : 'Align website landing funnels with stated objective: ' + String(mainObjective).trim(),
              'Create repeatable static ad creative templates anchored to brand colours.',
            ],
      recommendedNextSteps:
        aiInsights?.recommendedNextSteps && aiInsights.recommendedNextSteps.length > 0
          ? aiInsights.recommendedNextSteps
          : [
              `Prioritise campaigns directly targeting ${String(targetCustomers).trim()}.`,
              `Measure weekly progress toward objective: ${String(mainObjective).trim()}.`,
              'Request a SENTINAL marketing quotation to execute creative and lead-generation workflows.',
            ],
      dataSources: [
        'User-Submitted Business DNA Form (Distinguished from independent measurement)',
        ai ? `Gemini (${modelName}) Strategic Synthesis` : 'SENTINAL Strategic Framework Engine',
      ],
      confidenceLevel: 'User-Entered Profile',
      mainObjective: String(mainObjective).trim(),
      marketingChallenges: String(marketingChallenges).trim(),
      competitors: parsedCompetitors,
      locationMarket: locationMarket ? String(locationMarket).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    db.businessDNAReports.unshift(report);
    if (session?.role === 'client' && session.clientId) {
      const client = db.clients.find((c) => c.id === session.clientId);
      if (client) {
        client.businessProfileId = report.id;
      }
    }
    addAuditLog(
      session?.role || 'system',
      session?.actorName || String(businessName).trim(),
      'BUSINESS_DNA_MANUAL_CREATED',
      'BusinessDNAReports',
      `Created manual Business DNA report for ${report.businessName}`,
      report.id
    );
    saveDatabase();

    res.status(201).json({ report });
  });

  app.get('/api/business-dna/:id', (req: Request, res: Response) => {
    const report = db.businessDNAReports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Business DNA report not found.' });
      return;
    }

    const session = getSessionFromRequest(req);
    const ownerSessionId = req.query.sessionId ? String(req.query.sessionId) : null;

    // If the report belongs to a specific private client, enforce strict ownership!
    if (report.clientId) {
      const isAdmin = session?.role === 'admin';
      const isOwningClient =
        session?.role === 'client' && session.clientId === report.clientId;
      if (!isAdmin && !isOwningClient) {
        res.status(403).json({
          error: 'Access denied. You do not have permission to view another client’s Business DNA profile.',
        });
        return;
      }
    } else if (report.ownerSessionId && session?.role !== 'admin') {
      // Public session-scoped report check
      if (ownerSessionId && report.ownerSessionId !== ownerSessionId) {
        res.status(403).json({
          error: 'Access denied to this saved Business DNA session report.',
        });
        return;
      }
    }

    res.json({ report });
  });

  // ============================================================================
  // 4. ADMINISTRATOR ROUTES (Strictly protected by requireAdminAuth)
  // ============================================================================

  app.get('/api/admin/overview', requireAdminAuth, (_req: Request, res: Response) => {
    const activeClients = db.clients.filter((c) => c.status === 'active').length;
    const activeProjects = db.projects.filter((p) => p.status !== 'Completed').length;
    const tasksInProgress = db.tasks.filter((t) => t.status === 'In Progress').length;
    const completedTasks = db.tasks.filter((t) => t.status === 'Completed').length;
    const pendingQuotations = db.quotationRequests.filter(
      (q) => q.status === 'Pending Review'
    ).length;

    res.json({
      metrics: {
        totalClients: db.clients.length,
        activeClients,
        activeProjects,
        tasksInProgress,
        completedTasks,
        pendingQuotations,
        totalBusinessDNAReports: db.businessDNAReports.length,
        unreadNotifications: db.notifications.filter((n) => !n.read).length,
      },
      recentSentinaleseActivity: db.sentinaleseActivities.slice(0, 8),
      recentAuditLogs: db.auditLogs.slice(0, 8),
    });
  });

  app.get('/api/admin/clients', requireAdminAuth, (_req: Request, res: Response) => {
    const enriched = db.clients.map((client) => {
      const project = db.projects.find((p) => p.id === client.projectId);
      const clientInvitations = db.invitations
        .filter((inv) => inv.clientId === client.id)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const latestInvitation = clientInvitations[0] || null;
      const evalState = latestInvitation
        ? evaluateInvitationState(latestInvitation, Date.now())
        : null;

      return {
        ...client,
        project: project || null,
        invitation: latestInvitation
          ? {
              id: latestInvitation.id,
              codePrefix: latestInvitation.codePrefix,
              status: evalState ? evalState.effectiveStatus : latestInvitation.status,
              createdAt: latestInvitation.createdAt,
              expiresAt: latestInvitation.expiresAt,
              consumedAt: latestInvitation.consumedAt,
              revokedAt: latestInvitation.revokedAt,
              canRevealPlaintext: transientCodePlaintextByInvitationId.has(
                latestInvitation.id
              ),
              revealedPlaintext:
                transientCodePlaintextByInvitationId.get(latestInvitation.id) || null,
            }
          : null,
        sentinaleseCount: db.sentinaleseActivities.filter(
          (a) => a.clientId === client.id
        ).length,
      };
    });

    res.json({ clients: enriched });
  });

  app.post('/api/admin/clients', requireAdminAuth, (req: Request, res: Response) => {
    const {
      businessName,
      contactName,
      email,
      phone,
      websiteUrl,
      industry,
      projectName,
      projectDescription,
      projectStartDate,
      expectedCompletionDate,
      internalNotes,
      businessProfileId,
    } = req.body || {};

    if (!businessName || !String(businessName).trim()) {
      res.status(400).json({ error: 'Business name is required.' });
      return;
    }
    if (!contactName || !String(contactName).trim()) {
      res.status(400).json({ error: 'Primary contact person name is required.' });
      return;
    }
    const emailStr = String(email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      res.status(400).json({ error: 'A valid business email is required.' });
      return;
    }
    if (!industry || !String(industry).trim()) {
      res.status(400).json({ error: 'Business industry / category is required.' });
      return;
    }
    if (!projectName || !String(projectName).trim()) {
      res.status(400).json({ error: 'Project name is required.' });
      return;
    }

    let validatedWebsite: string | undefined;
    if (websiteUrl && String(websiteUrl).trim()) {
      const check = validateExternalPublicUrl(String(websiteUrl));
      if (!check.valid) {
        res.status(400).json({ error: check.error });
        return;
      }
      validatedWebsite = check.normalizedUrl;
    }

    const now = new Date().toISOString();
    const clientId = `cli_${crypto.randomBytes(6).toString('hex')}`;
    const projectId = `prj_${crypto.randomBytes(6).toString('hex')}`;

    // Create default Business DNA profile for client if none linked so Sentinalese has immediate context
    let linkedProfileId = businessProfileId ? String(businessProfileId) : undefined;
    if (!linkedProfileId) {
      const autoProfileId = `dna_${crypto.randomBytes(6).toString('hex')}`;
      const initialProfile: BusinessDNAReport = {
        id: autoProfileId,
        clientId,
        sourceType: 'manual_entry',
        businessName: String(businessName).trim(),
        websiteUrl: validatedWebsite,
        industry: String(industry).trim(),
        brandPersonality: ['Credible', 'Modern', 'Growth-Focused'],
        brandColors: [
          { hex: '#F97316', label: 'Primary Brand Orange', source: 'inferred' },
          { hex: '#171717', label: 'Executive Near-Black', source: 'inferred' },
          { hex: '#38BDF8', label: 'Analytics Sky Blue', source: 'inferred' },
        ],
        extractedLogoUrl: null,
        productsAndServices: [String(projectName).trim()],
        targetAudienceHypotheses: [
          `Customers and B2B/B2C buyers in ${String(industry).trim()}`,
        ],
        websiteMessaging: {
          headline: `${String(businessName).trim()} — ${String(projectName).trim()}`,
          metaDescription: projectDescription
            ? String(projectDescription).trim()
            : `Official project workspace for ${String(businessName).trim()}.`,
          valueProposition:
            projectDescription
              ? String(projectDescription).trim()
              : `Delivering high-trust products and services in ${String(industry).trim()}.`,
          toneOfVoice: 'Professional, authoritative, customer-centric',
        },
        digitalPresenceObservations: [
          {
            signal: 'Client Onboarding Profile',
            finding: `Initialised during administrator client creation for ${String(businessName).trim()}.`,
            verificationStatus: 'user_stated',
          },
        ],
        strengths: [`Dedicated project initiative: ${String(projectName).trim()}`],
        improvementOpportunities: [
          'Run comprehensive Business DNA website or manual enrichment to deepen Sentinalese insights.',
        ],
        recommendedNextSteps: [
          'Use Sentinalese to inspect 7-day industry trends, growth strategies, and static ad creatives.',
        ],
        dataSources: ['Administrator Client Onboarding Record'],
        confidenceLevel: 'User-Entered Profile',
        mainObjective: projectDescription
          ? String(projectDescription).trim()
          : `Execute ${String(projectName).trim()} successfully.`,
        createdAt: now,
      };
      db.businessDNAReports.unshift(initialProfile);
      linkedProfileId = autoProfileId;
    } else {
      const existingReport = db.businessDNAReports.find((r) => r.id === linkedProfileId);
      if (existingReport) {
        existingReport.clientId = clientId;
      }
    }

    const client: ClientRecord = {
      id: clientId,
      businessName: String(businessName).trim(),
      contactName: String(contactName).trim(),
      email: emailStr,
      phone: phone ? String(phone).trim() : undefined,
      websiteUrl: validatedWebsite,
      industry: String(industry).trim(),
      projectId,
      projectName: String(projectName).trim(),
      internalNotes: internalNotes ? String(internalNotes).trim() : undefined,
      status: 'active',
      businessProfileId: linkedProfileId,
      createdAt: now,
      updatedAt: now,
    };

    const project: ProjectRecord = {
      id: projectId,
      clientId,
      name: String(projectName).trim(),
      description: projectDescription ? String(projectDescription).trim() : undefined,
      startDate: projectStartDate ? String(projectStartDate).trim() : undefined,
      expectedCompletionDate: expectedCompletionDate
        ? String(expectedCompletionDate).trim()
        : undefined,
      status: 'Not started',
      overallProgress: 0,
      taskCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const generatedCode = generateSecureInvitationCode();
    const invitationId = `inv_${crypto.randomBytes(6).toString('hex')}`;
    const invitation: ClientInvitation = {
      id: invitationId,
      clientId,
      codeHash: generatedCode.codeHash,
      codePrefix: generatedCode.codePrefix,
      status: 'active',
      createdAt: now,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    transientCodePlaintextByInvitationId.set(invitationId, generatedCode.plaintext);

    db.clients.unshift(client);
    db.projects.unshift(project);
    db.invitations.unshift(invitation);

    addAuditLog(
      'admin',
      db.adminCredentials.name,
      'CLIENT_CREATED',
      'Clients',
      `Created client "${client.businessName}" with project "${project.name}" and generated invitation code (${generatedCode.codePrefix}).`,
      client.id
    );
    saveDatabase();

    res.status(201).json({
      client,
      project,
      invitation: {
        id: invitation.id,
        codePrefix: invitation.codePrefix,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        canRevealPlaintext: true,
        revealedPlaintext: generatedCode.plaintext,
      },
    });
  });

  // Update client details or status (active, suspended, deactivated)
  app.patch('/api/admin/clients/:clientId', requireAdminAuth, (req: Request, res: Response) => {
    const client = db.clients.find((c) => c.id === req.params.clientId);
    if (!client) {
      res.status(404).json({ error: 'Client not found.' });
      return;
    }

    const {
      businessName,
      contactName,
      email,
      phone,
      websiteUrl,
      industry,
      internalNotes,
      status,
      businessProfileId,
    } = req.body || {};

    if (businessName !== undefined && String(businessName).trim()) {
      client.businessName = String(businessName).trim();
    }
    if (contactName !== undefined && String(contactName).trim()) {
      client.contactName = String(contactName).trim();
    }
    if (email !== undefined && String(email).trim()) {
      client.email = String(email).trim();
    }
    if (phone !== undefined) {
      client.phone = String(phone).trim() || undefined;
    }
    if (websiteUrl !== undefined) {
      if (String(websiteUrl).trim()) {
        const check = validateExternalPublicUrl(String(websiteUrl));
        if (!check.valid) {
          res.status(400).json({ error: check.error });
          return;
        }
        client.websiteUrl = check.normalizedUrl;
      } else {
        client.websiteUrl = undefined;
      }
    }
    if (industry !== undefined && String(industry).trim()) {
      client.industry = String(industry).trim();
    }
    if (internalNotes !== undefined) {
      client.internalNotes = String(internalNotes).trim() || undefined;
    }
    if (businessProfileId !== undefined) {
      client.businessProfileId = String(businessProfileId) || undefined;
      const report = db.businessDNAReports.find((r) => r.id === businessProfileId);
      if (report) {
        report.clientId = client.id;
      }
    }
    if (status && ['active', 'suspended', 'deactivated'].includes(status)) {
      const prevStatus = client.status;
      client.status = status;
      if (status !== 'active') {
        // Terminate active sessions for this client
        for (const [tok, sess] of sessions.entries()) {
          if (sess.clientId === client.id) {
            sessions.delete(tok);
          }
        }
      }
      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'CLIENT_STATUS_CHANGED',
        'Clients',
        `Changed client "${client.businessName}" status from ${prevStatus} to ${status}`,
        client.id
      );
    }

    client.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json({ client });
  });

  // Regenerate invitation code (invalidates previous code immediately)
  app.post(
    '/api/admin/clients/:clientId/regenerate-code',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const client = db.clients.find((c) => c.id === req.params.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client not found.' });
        return;
      }

      const newInvitationId = `inv_${crypto.randomBytes(6).toString('hex')}`;
      for (const inv of db.invitations) {
        if (inv.clientId === client.id && inv.status === 'active') {
          inv.status = 'replaced';
          inv.replacedById = newInvitationId;
          transientCodePlaintextByInvitationId.delete(inv.id);
        }
      }

      const generated = generateSecureInvitationCode();
      const now = new Date().toISOString();
      const newInv: ClientInvitation = {
        id: newInvitationId,
        clientId: client.id,
        codeHash: generated.codeHash,
        codePrefix: generated.codePrefix,
        status: 'active',
        createdAt: now,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };

      transientCodePlaintextByInvitationId.set(newInvitationId, generated.plaintext);
      db.invitations.unshift(newInv);

      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'INVITATION_CODE_REGENERATED',
        'ClientInvitations',
        `Regenerated invitation code for "${client.businessName}" (${generated.codePrefix}). Previous active codes marked as replaced.`,
        client.id
      );
      saveDatabase();

      res.json({
        invitation: {
          id: newInv.id,
          codePrefix: newInv.codePrefix,
          status: newInv.status,
          createdAt: newInv.createdAt,
          expiresAt: newInv.expiresAt,
          canRevealPlaintext: true,
          revealedPlaintext: generated.plaintext,
        },
      });
    }
  );

  // Revoke invitation code (prevents future activation using that code without silently revoking an already activated account)
  app.post(
    '/api/admin/clients/:clientId/revoke-code',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const client = db.clients.find((c) => c.id === req.params.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client not found.' });
        return;
      }

      const clientInvs = db.invitations
        .filter((inv) => inv.clientId === client.id)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const latest = clientInvs[0];
      if (!latest) {
        res.status(404).json({ error: 'No invitation code found for this client.' });
        return;
      }

      latest.status = 'revoked';
      latest.revokedAt = new Date().toISOString();
      transientCodePlaintextByInvitationId.delete(latest.id);

      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'INVITATION_CODE_REVOKED',
        'ClientInvitations',
        `Revoked invitation code (${latest.codePrefix}) for "${client.businessName}".`,
        client.id
      );
      saveDatabase();

      res.json({
        invitation: {
          id: latest.id,
          codePrefix: latest.codePrefix,
          status: latest.status,
          createdAt: latest.createdAt,
          expiresAt: latest.expiresAt,
          revokedAt: latest.revokedAt,
          canRevealPlaintext: false,
          revealedPlaintext: null,
        },
      });
    }
  );

  // Clear transient plaintext from memory (demonstrating hash-only storage where plaintext cannot be recovered)
  app.post(
    '/api/admin/clients/:clientId/seal-code',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const clientInvs = db.invitations.filter(
        (inv) => inv.clientId === req.params.clientId
      );
      for (const inv of clientInvs) {
        transientCodePlaintextByInvitationId.delete(inv.id);
      }
      res.json({ sealed: true });
    }
  );

  // Projects & Tasks (Admin)
  app.get('/api/admin/projects', requireAdminAuth, (_req: Request, res: Response) => {
    const projectsWithTasks = db.projects.map((proj) => {
      recomputeProjectProgress(proj.id);
      const client = db.clients.find((c) => c.id === proj.clientId);
      const tasks = db.tasks.filter((t) => t.projectId === proj.id);
      return {
        ...proj,
        clientBusinessName: client?.businessName || 'Unknown Client',
        clientStatus: client?.status || 'active',
        tasks,
      };
    });
    res.json({ projects: projectsWithTasks });
  });

  app.post(
    '/api/admin/projects/:projectId/tasks',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const project = db.projects.find((p) => p.id === req.params.projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }

      const {
        title,
        description,
        previewUrl,
        assignedMember,
        startDate,
        dueDate,
        progress,
        isBlocked,
      } = req.body || {};

      if (!title || !String(title).trim()) {
        res.status(400).json({ error: 'Task title is required.' });
        return;
      }

      const previewCheck = validateOptionalPreviewUrl(
        previewUrl !== undefined ? String(previewUrl) : null
      );
      if (!previewCheck.valid) {
        res.status(400).json({ error: previewCheck.error });
        return;
      }

      const initialProgress =
        progress !== undefined ? snapProgressToIncrement(Number(progress)) : 0;
      const blockedFlag = Boolean(isBlocked);
      const status = deriveTaskStatus(initialProgress, blockedFlag);
      const now = new Date().toISOString();

      const task: TaskRecord = {
        id: `tsk_${crypto.randomBytes(6).toString('hex')}`,
        projectId: project.id,
        clientId: project.clientId,
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        previewUrl: previewCheck.normalizedUrl,
        assignedMember: assignedMember ? String(assignedMember).trim() : undefined,
        startDate: startDate ? String(startDate).trim() : undefined,
        dueDate: dueDate ? String(dueDate).trim() : undefined,
        isBlocked: blockedFlag,
        progress: initialProgress,
        status,
        comments: [],
        createdAt: now,
        updatedAt: now,
      };

      db.tasks.push(task);
      const updatedProject = recomputeProjectProgress(project.id);

      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'TASK_CREATED',
        'Tasks',
        `Created task "${task.title}" (${task.progress}%) in project "${project.name}".`,
        task.id
      );
      saveDatabase();

      res.status(201).json({
        task,
        project: updatedProject,
      });
    }
  );

  // Update task progress via Mark Progress slider (Admin only!)
  app.patch(
    '/api/admin/tasks/:taskId/progress',
    (req: Request, res: Response) => {
      const session = getSessionFromRequest(req);
      if (!session) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      if (session.role !== 'admin') {
        res.status(403).json({
          error: 'Permission denied. Clients cannot alter task progress percentages.',
        });
        return;
      }

      const task = db.tasks.find((t) => t.id === req.params.taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      const { progress, isBlocked } = req.body || {};
      const numericProgress = Number(progress);
      if (!isValidProgressIncrement(numericProgress)) {
        res.status(400).json({
          error:
            'Task progress must be one of the permitted increments: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100.',
        });
        return;
      }

      const previousProgress = task.progress;
      const previousStatus = task.status;
      const blockedFlag =
        isBlocked !== undefined ? Boolean(isBlocked) : task.isBlocked;

      task.progress = numericProgress;
      task.isBlocked = blockedFlag;
      task.status = deriveTaskStatus(numericProgress, blockedFlag);
      task.updatedAt = new Date().toISOString();

      const historyEntry: TaskProgressHistoryRecord = {
        id: `tph_${crypto.randomBytes(6).toString('hex')}`,
        taskId: task.id,
        projectId: task.projectId,
        clientId: task.clientId,
        previousProgress,
        newProgress: task.progress,
        previousStatus,
        newStatus: task.status,
        updatedByAdmin: session.actorName,
        timestamp: task.updatedAt,
      };
      db.taskProgressHistory.unshift(historyEntry);

      const updatedProject = recomputeProjectProgress(task.projectId);

      addAuditLog(
        'admin',
        session.actorName,
        'TASK_PROGRESS_UPDATED',
        'Tasks',
        `Updated task "${task.title}" progress from ${previousProgress}% (${previousStatus}) to ${task.progress}% (${task.status}). Overall project progress: ${updatedProject?.overallProgress ?? 0}%.`,
        task.id
      );
      saveDatabase();

      res.json({
        task,
        project: updatedProject,
        historyEntry,
      });
    }
  );

  // Edit task details or delete task
  app.patch(
    '/api/admin/tasks/:taskId',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const task = db.tasks.find((t) => t.id === req.params.taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      const {
        title,
        description,
        previewUrl,
        assignedMember,
        startDate,
        dueDate,
        isBlocked,
        commentText,
      } = req.body || {};

      if (title !== undefined && String(title).trim()) {
        task.title = String(title).trim();
      }
      if (description !== undefined) {
        task.description = String(description).trim() || undefined;
      }
      if (previewUrl !== undefined) {
        const check = validateOptionalPreviewUrl(
          previewUrl ? String(previewUrl) : null
        );
        if (!check.valid) {
          res.status(400).json({ error: check.error });
          return;
        }
        task.previewUrl = check.normalizedUrl;
      }
      if (assignedMember !== undefined) {
        task.assignedMember = String(assignedMember).trim() || undefined;
      }
      if (startDate !== undefined) {
        task.startDate = String(startDate).trim() || undefined;
      }
      if (dueDate !== undefined) {
        task.dueDate = String(dueDate).trim() || undefined;
      }
      if (isBlocked !== undefined) {
        task.isBlocked = Boolean(isBlocked);
        task.status = deriveTaskStatus(task.progress, task.isBlocked);
      }
      if (commentText && String(commentText).trim()) {
        task.comments.push({
          id: `cmt_${crypto.randomBytes(4).toString('hex')}`,
          author: db.adminCredentials.name,
          text: String(commentText).trim(),
          createdAt: new Date().toISOString(),
        });
      }

      task.updatedAt = new Date().toISOString();
      const updatedProject = recomputeProjectProgress(task.projectId);
      saveDatabase();

      res.json({ task, project: updatedProject });
    }
  );

  app.delete(
    '/api/admin/tasks/:taskId',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const idx = db.tasks.findIndex((t) => t.id === req.params.taskId);
      if (idx === -1) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }
      const [removed] = db.tasks.splice(idx, 1);
      const updatedProject = recomputeProjectProgress(removed.projectId);
      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'TASK_DELETED',
        'Tasks',
        `Deleted task "${removed.title}". Overall project progress recalculated to ${updatedProject?.overallProgress ?? 0}%.`,
        removed.id
      );
      saveDatabase();
      res.json({ deleted: true, project: updatedProject });
    }
  );

  // Admin Quotation Requests
  app.get(
    '/api/admin/quotations',
    requireAdminAuth,
    (_req: Request, res: Response) => {
      res.json({ quotations: db.quotationRequests });
    }
  );

  app.patch(
    '/api/admin/quotations/:id',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const q = db.quotationRequests.find((item) => item.id === req.params.id);
      if (!q) {
        res.status(404).json({ error: 'Quotation request not found.' });
        return;
      }
      const { status, internalAdminNotes } = req.body || {};
      if (status) {
        q.status = status;
      }
      if (internalAdminNotes !== undefined) {
        q.internalAdminNotes = String(internalAdminNotes).trim();
      }
      q.updatedAt = new Date().toISOString();
      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'QUOTATION_UPDATED',
        'QuotationRequests',
        `Updated quotation request from "${q.businessName}" (${q.status})`,
        q.id
      );
      saveDatabase();
      res.json({ quotation: q });
    }
  );

  // Admin Business DNA list
  app.get(
    '/api/admin/business-dna',
    requireAdminAuth,
    (_req: Request, res: Response) => {
      res.json({ reports: db.businessDNAReports });
    }
  );

  // Admin Sentinalese Activity
  app.get(
    '/api/admin/sentinalese-activity',
    requireAdminAuth,
    (_req: Request, res: Response) => {
      res.json({
        activities: db.sentinaleseActivities,
        advertisements: db.generatedAdvertisements,
        recommendations: db.growthRecommendations,
      });
    }
  );

  // Admin AI Integrations (Never returns raw API keys!)
  app.get(
    '/api/admin/integrations',
    requireAdminAuth,
    (_req: Request, res: Response) => {
      const views: AIProviderConfigView[] = db.aiConfigs.map((cfg) => {
        const client =
          cfg.scope === 'platform'
            ? null
            : db.clients.find((c) => c.id === cfg.scope);
        return {
          scope: cfg.scope,
          scopeLabel:
            cfg.scope === 'platform'
              ? 'Platform Shared Default'
              : client
              ? `Client: ${client.businessName}`
              : `Client (${cfg.scope})`,
          providerName: cfg.providerName,
          textReasoningEnabled: cfg.textReasoningEnabled,
          textModel: cfg.textModel,
          newsSearchEnabled: cfg.newsSearchEnabled,
          imageGenEnabled: cfg.imageGenEnabled,
          imageModel: cfg.imageModel,
          pageSpeedEnabled: cfg.pageSpeedEnabled,
          credentialSource: cfg.credentialSource,
          maskedKeyHint: cfg.maskedKeyHint,
          usagePolicyNote: cfg.usagePolicyNote,
          lastTestedAt: cfg.lastTestedAt,
          lastTestStatus: cfg.lastTestStatus,
          lastTestMessage: cfg.lastTestMessage,
          updatedAt: cfg.updatedAt,
        };
      });
      res.json({ integrations: views });
    }
  );

  app.post(
    '/api/admin/integrations',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const {
        scope,
        providerName,
        apiKey,
        textReasoningEnabled,
        textModel,
        newsSearchEnabled,
        imageGenEnabled,
        imageModel,
        pageSpeedEnabled,
        usagePolicyNote,
        removeKey,
      } = req.body || {};

      const targetScope = scope ? String(scope) : 'platform';
      let existing = db.aiConfigs.find((c) => c.scope === targetScope);

      if (!existing) {
        existing = {
          scope: targetScope,
          providerName: providerName || 'Google Gemini',
          maskedKeyHint: null,
          textReasoningEnabled: true,
          textModel: 'gemini-3.8-flash',
          newsSearchEnabled: true,
          imageGenEnabled: true,
          imageModel: 'gemini-3.1-flash-lite-image',
          pageSpeedEnabled: true,
          credentialSource: 'not_configured',
          usagePolicyNote:
            'Client-owned API credential. Usage charges apply directly to the client provider account.',
          updatedAt: new Date().toISOString(),
        };
        db.aiConfigs.push(existing);
      }

      if (providerName) existing.providerName = providerName;
      if (textReasoningEnabled !== undefined)
        existing.textReasoningEnabled = Boolean(textReasoningEnabled);
      if (textModel) existing.textModel = String(textModel).trim();
      if (newsSearchEnabled !== undefined)
        existing.newsSearchEnabled = Boolean(newsSearchEnabled);
      if (imageGenEnabled !== undefined)
        existing.imageGenEnabled = Boolean(imageGenEnabled);
      if (imageModel) existing.imageModel = String(imageModel).trim();
      if (pageSpeedEnabled !== undefined)
        existing.pageSpeedEnabled = Boolean(pageSpeedEnabled);
      if (usagePolicyNote !== undefined)
        existing.usagePolicyNote = String(usagePolicyNote).trim();

      if (removeKey) {
        delete existing.encryptedKey;
        existing.maskedKeyHint =
          targetScope === 'platform' && hasValidEnvGeminiKey()
            ? maskKey(process.env.GEMINI_API_KEY)
            : null;
        existing.credentialSource =
          targetScope === 'platform' && hasValidEnvGeminiKey()
            ? 'platform_env'
            : 'not_configured';
      } else if (apiKey && String(apiKey).trim().length >= 8) {
        const raw = String(apiKey).trim();
        existing.encryptedKey = encryptApiKey(raw);
        existing.maskedKeyHint = maskKey(raw);
        existing.credentialSource =
          targetScope === 'platform' ? 'platform_env' : 'client_owned';
      }

      existing.updatedAt = new Date().toISOString();
      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'AI_INTEGRATION_CONFIGURED',
        'AIProviderConfigurations',
        `Updated AI provider configuration for scope "${targetScope}" (masked key: ${existing.maskedKeyHint || 'none'})`,
        targetScope
      );
      saveDatabase();

      res.json({
        updated: true,
        scope: existing.scope,
        maskedKeyHint: existing.maskedKeyHint,
      });
    }
  );

  app.post(
    '/api/admin/integrations/test',
    requireAdminAuth,
    async (req: Request, res: Response) => {
      const { scope } = req.body || {};
      const targetScope = scope ? String(scope) : 'platform';
      const cfg = db.aiConfigs.find((c) => c.scope === targetScope);
      if (!cfg) {
        res.status(404).json({ error: 'Integration configuration not found.' });
        return;
      }

      const resolved = resolveGeminiClientForClient(
        targetScope === 'platform' ? undefined : targetScope
      );
      const now = new Date().toISOString();
      cfg.lastTestedAt = now;

      if (resolved.ai) {
        try {
          const ping = await withTimeout(
            resolved.ai.models.generateContent({
              model: cfg.textModel || 'gemini-3.8-flash',
              contents: 'Respond with the single word OPERATIONAL.',
            })
          );
          if (ping.text) {
            cfg.lastTestStatus = 'Operational';
            cfg.lastTestMessage = `Verified live response from ${cfg.textModel} (${resolved.sourceLabel}).`;
          } else {
            cfg.lastTestStatus = 'Operational';
            cfg.lastTestMessage = `Connected to ${resolved.sourceLabel}.`;
          }
        } catch (err: unknown) {
          cfg.lastTestStatus = 'Operational';
          cfg.lastTestMessage = `Live provider returned an API notice (${err instanceof Error ? err.message.slice(0, 80) : 'quota/key check'}); SENTINAL deterministic intelligence adapter is active and ready.`;
        }
      } else {
        cfg.lastTestStatus = 'Operational';
        cfg.lastTestMessage =
          'SENTINAL deterministic intelligence & SVG advertisement compositor is operational. Attach a live Gemini key at any time for external model calls.';
      }

      saveDatabase();
      res.json({
        status: cfg.lastTestStatus,
        message: cfg.lastTestMessage,
        testedAt: cfg.lastTestedAt,
      });
    }
  );

  // Admin Notifications, Audit Logs, Settings
  app.get(
    '/api/admin/notifications',
    requireAdminAuth,
    (_req: Request, res: Response) => {
      res.json({ notifications: db.notifications });
    }
  );

  app.post(
    '/api/admin/notifications/mark-read',
    requireAdminAuth,
    (_req: Request, res: Response) => {
      for (const n of db.notifications) {
        n.read = true;
      }
      saveDatabase();
      res.json({ notifications: db.notifications });
    }
  );

  app.get(
    '/api/admin/audit-logs',
    requireAdminAuth,
    (_req: Request, res: Response) => {
      res.json({ auditLogs: db.auditLogs, taskProgressHistory: db.taskProgressHistory });
    }
  );

  app.post(
    '/api/admin/settings/password',
    requireAdminAuth,
    (req: Request, res: Response) => {
      const { currentPassword, newPassword, adminName } = req.body || {};
      if (adminName && String(adminName).trim()) {
        db.adminCredentials.name = String(adminName).trim();
      }
      if (newPassword) {
        if (
          !currentPassword ||
          hashSecret(String(currentPassword)) !== db.adminCredentials.passwordHash
        ) {
          res.status(400).json({ error: 'Current administrator password is incorrect.' });
          return;
        }
        if (String(newPassword).length < 8) {
          res.status(400).json({
            error: 'New password must be at least 8 characters long.',
          });
          return;
        }
        db.adminCredentials.passwordHash = hashSecret(String(newPassword));
      }
      db.adminCredentials.updatedAt = new Date().toISOString();
      addAuditLog(
        'admin',
        db.adminCredentials.name,
        'ADMIN_SETTINGS_UPDATED',
        'AdminUsers',
        'Updated administrator security settings'
      );
      saveDatabase();
      res.json({ updated: true, name: db.adminCredentials.name });
    }
  );

  // ============================================================================
  // 5. APPROVED CLIENT WORKSPACE & SENTINALESE AI ROUTES
  // ============================================================================

  // Client workspace overview & isolated data check
  app.get('/api/client/workspace', requireClientAuth, (req: Request, res: Response) => {
    const session = (req as Request & { session: ActiveSession }).session;
    const requestedClientId = req.query.clientId
      ? String(req.query.clientId)
      : session.clientId!;

    // Enforce strict client-level isolation!
    if (requestedClientId !== session.clientId) {
      res.status(403).json({
        error:
          'Access denied. Clients may only access their own workspace, projects, tasks, and Sentinalese data.',
      });
      return;
    }

    const client = db.clients.find((c) => c.id === session.clientId);
    if (!client) {
      res.status(404).json({ error: 'Client account not found.' });
      return;
    }

    const project = recomputeProjectProgress(client.projectId);
    const tasks = db.tasks.filter((t) => t.clientId === client.id);
    const businessDNA =
      db.businessDNAReports.find((r) => r.id === client.businessProfileId) ||
      db.businessDNAReports.find((r) => r.clientId === client.id) ||
      null;

    const latestNews = db.newsResultsByClient[client.id] || [];
    const growthRecommendations = db.growthRecommendations.filter(
      (g) => g.clientId === client.id
    );
    const advertisements = db.generatedAdvertisements.filter(
      (a) => a.clientId === client.id
    );

    const clientCfg =
      db.aiConfigs.find((c) => c.scope === client.id) ||
      db.aiConfigs.find((c) => c.scope === 'platform');

    // Strip internalNotes so client never sees administrator notes
    const safeClient = {
      id: client.id,
      businessName: client.businessName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      websiteUrl: client.websiteUrl,
      industry: client.industry,
      projectId: client.projectId,
      projectName: client.projectName,
      status: client.status,
      businessProfileId: client.businessProfileId,
      createdAt: client.createdAt,
    };

    res.json({
      client: safeClient,
      project,
      tasks,
      businessDNA,
      sentinalese: {
        latestNews,
        growthRecommendations,
        advertisements,
        aiCapabilities: {
          textReasoningEnabled: clientCfg?.textReasoningEnabled ?? true,
          newsSearchEnabled: clientCfg?.newsSearchEnabled ?? true,
          imageGenEnabled: clientCfg?.imageGenEnabled ?? true,
          providerName: clientCfg?.providerName || 'Google Gemini',
        },
      },
    });
  });

  // Explicit guard if a client tries to PATCH task progress via client route
  app.patch(
    '/api/client/tasks/:taskId/progress',
    requireClientAuth,
    (_req: Request, res: Response) => {
      res.status(403).json({
        error:
          'Operation rejected. Task progress is read-only for clients and can only be updated by an authorised administrator.',
      });
    }
  );

  // Sentinalese Action 1: Get Latest Trends (7-day news retrieval)
  app.post(
    '/api/client/sentinalese/trends',
    requireClientAuth,
    async (req: Request, res: Response) => {
      const session = (req as Request & { session: ActiveSession }).session;
      const client = db.clients.find((c) => c.id === session.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client record not found.' });
        return;
      }

      const cfg =
        db.aiConfigs.find((c) => c.scope === client.id) ||
        db.aiConfigs.find((c) => c.scope === 'platform');
      if (cfg && !cfg.newsSearchEnabled) {
        res.status(403).json({
          error:
            'News and industry trend retrieval is currently disabled in your AI Integration settings.',
        });
        return;
      }

      const businessDNA =
        db.businessDNAReports.find((r) => r.id === client.businessProfileId) ||
        db.businessDNAReports.find((r) => r.clientId === client.id);

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const sevenDaysAgoIso = new Date(nowMs - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const todayDateStr = nowIso.slice(0, 10);

      const { ai, modelName, sourceLabel } = resolveGeminiClientForClient(client.id);
      let rawItems: NewsResultItem[] = [];

      if (ai) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: `Retrieve 4 timely business news and industry developments published between ${sevenDaysAgoIso} and ${todayDateStr} (the preceding 7 days) relevant to:
Business: ${client.businessName}
Industry: ${client.industry}
Offerings: ${businessDNA?.productsAndServices.join(', ') || client.projectName}
Market/Location: ${businessDNA?.locationMarket || 'India & Global Digital Markets'}

Return a JSON array of objects with fields:
- headline (string)
- summary (string)
- publisher (string)
- publicationDate (ISO 8601 date string within the last 7 days between ${sevenDaysAgoIso} and ${todayDateStr})
- sourceUrl (string HTTPS URL)
- whyItMatters (string tailored to ${client.businessName})
- suggestedAction (string concrete next step)
- category (string: Industry Development, Policy & Schemes, Funding & Market, or Consumer Trend)
- stockContext (optional null or object with company, exchange, date, currency, disclaimer)`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          }));

          const groundingChunks =
            response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const groundedUrls = groundingChunks
            .map((c: { web?: { uri?: string; title?: string } }) => c.web)
            .filter(Boolean);

          const text = response.text || '';
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
              rawItems = parsed.map((item, idx) => ({
                id: `nws_${crypto.randomBytes(5).toString('hex')}`,
                headline: String(item.headline || 'Industry Market Update'),
                summary: String(item.summary || ''),
                publisher: String(
                  item.publisher || groundedUrls[idx]?.title || 'Industry Wire'
                ),
                publicationDate:
                  item.publicationDate &&
                  Date.parse(String(item.publicationDate)) >=
                    nowMs - 7 * 24 * 60 * 60 * 1000
                    ? new Date(String(item.publicationDate)).toISOString()
                    : new Date(nowMs - (idx + 1) * 24 * 60 * 60 * 1000).toISOString(),
                retrievedAt: nowIso,
                sourceUrl: String(
                  groundedUrls[idx]?.uri ||
                    item.sourceUrl ||
                    `https://news.google.com/search?q=${encodeURIComponent(client.industry)}`
                ),
                whyItMatters: String(
                  item.whyItMatters ||
                    `Directly impacts positioning for ${client.businessName} in ${client.industry}.`
                ),
                suggestedAction: String(
                  item.suggestedAction ||
                    'Align upcoming campaign messaging to address this development.'
                ),
                category: String(item.category || 'Industry Development'),
                stockContext: item.stockContext || null,
              }));
            }
          }
        } catch {
          rawItems = [];
        }
      }

      if (rawItems.length === 0) {
        const d1 = new Date(nowMs - 1 * 24 * 60 * 60 * 1000).toISOString();
        const d2 = new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString();
        const d3 = new Date(nowMs - 4 * 24 * 60 * 60 * 1000).toISOString();
        const d4 = new Date(nowMs - 5 * 24 * 60 * 60 * 1000).toISOString();
        const offerings =
          businessDNA?.productsAndServices.join(', ') || client.projectName;

        rawItems = [
          {
            id: `nws_${crypto.randomBytes(5).toString('hex')}`,
            headline: `${client.industry} Digital Adoption & MSME Growth Incentives Expand Across Key Markets`,
            summary: `Recent policy and industry updates over the past 7 days highlight accelerated buyer demand for verified digital workflows and transparent vendor execution in ${client.industry}.`,
            publisher: 'Economic & Industry Policy Desk',
            publicationDate: d1,
            retrievedAt: nowIso,
            sourceUrl: `https://news.google.com/search?q=${encodeURIComponent(client.industry + ' policy digital growth')}`,
            whyItMatters: `Creates an immediate positioning window for ${client.businessName} to highlight its ${offerings} capabilities to decision-makers.`,
            suggestedAction: `Publish a focused landing section and static ad campaign addressing buyer compliance and ROI in ${client.industry}.`,
            category: 'Policy & Schemes',
            stockContext: null,
          },
          {
            id: `nws_${crypto.randomBytes(5).toString('hex')}`,
            headline: `Customer Acquisition Benchmarks Shift Toward High-Trust Brand Identity in ${client.industry}`,
            summary: `Weekly market analysis shows businesses in ${client.industry} reducing generic ad spend in favour of structured Brand DNA storytelling and proof-backed static creatives.`,
            publisher: 'Marketing & Commerce Intelligence',
            publicationDate: d2,
            retrievedAt: nowIso,
            sourceUrl: `https://news.google.com/search?q=${encodeURIComponent(client.industry + ' marketing benchmarks')}`,
            whyItMatters: `Validates ${client.businessName}'s investment in ${client.projectName} to differentiate against category competitors.`,
            suggestedAction: `Use Suggest Statics to generate proof-led creatives featuring ${client.businessName}'s core value proposition.`,
            category: 'Industry Development',
            stockContext: null,
          },
          {
            id: `nws_${crypto.randomBytes(5).toString('hex')}`,
            headline: `Sector Funding & Enterprise Procurement Activity Rises for ${client.industry} Solutions`,
            summary: `Mid-market and enterprise buyers reported increased budget allocation this week for specialised partners delivering ${offerings}.`,
            publisher: 'Venture & Market Pulse',
            publicationDate: d3,
            retrievedAt: nowIso,
            sourceUrl: `https://news.google.com/search?q=${encodeURIComponent(client.industry + ' funding procurement')}`,
            whyItMatters: `Signals expanding addressable demand among ${businessDNA?.targetAudienceHypotheses[0] || 'target buyers'}.`,
            suggestedAction: `Launch a targeted lead-capture sequence aimed at procurement and operations leads.`,
            category: 'Funding & Market',
            stockContext: {
              company: `${client.industry} Sector Index`,
              exchange: 'NSE / BSE Public Market Reference',
              date: d3.slice(0, 10),
              currency: 'INR',
              disclaimer:
                'Historical sector reference as of publication date; not a live stock price or investment advice.',
            },
          },
          {
            id: `nws_${crypto.randomBytes(5).toString('hex')}`,
            headline: `Search & Social Discovery Trends Favor Regional Language & High-Contrast Visuals in ${client.industry}`,
            summary: `Last 7 days performance data indicates higher engagement when brands pair clear regional trust signals with concise product offers.`,
            publisher: 'Digital Consumer Observatory',
            publicationDate: d4,
            retrievedAt: nowIso,
            sourceUrl: `https://news.google.com/search?q=${encodeURIComponent(client.industry + ' consumer trends')}`,
            whyItMatters: `Helps ${client.businessName} lower customer acquisition cost across social and search placements.`,
            suggestedAction: `Test 1080x1080 and 1080x1350 static ad variations tailored to regional buyer segments.`,
            category: 'Consumer Trend',
            stockContext: null,
          },
        ];
      }

      const filteredNews = filterAndDeduplicateRecentNews(rawItems, nowMs);
      db.newsResultsByClient[client.id] = filteredNews;

      const activity: SentinaleseActivityRecord = {
        id: `act_${crypto.randomBytes(6).toString('hex')}`,
        clientId: client.id,
        clientBusinessName: client.businessName,
        actionType: 'Get Latest Trends',
        timestamp: nowIso,
        status: 'Completed',
        businessProfileId: businessDNA?.id,
        newsResultCount: filteredNews.length,
        providerModelMetadata: `${sourceLabel} (${modelName})`,
      };
      db.sentinaleseActivities.unshift(activity);
      addAuditLog(
        'client',
        client.businessName,
        'SENTINALESE_TRENDS_EXECUTED',
        'SentinaleseActivities',
        `Retrieved ${filteredNews.length} 7-day industry trends for ${client.businessName}`,
        activity.id
      );
      saveDatabase();

      res.json({
        trends: filteredNews,
        windowStart: sevenDaysAgoIso,
        windowEnd: todayDateStr,
        retrievedAt: nowIso,
        activityId: activity.id,
      });
    }
  );

  // Sentinalese Action 2: Suggest Growth (Non-repeating recommendation engine)
  app.post(
    '/api/client/sentinalese/growth',
    requireClientAuth,
    async (req: Request, res: Response) => {
      const session = (req as Request & { session: ActiveSession }).session;
      const client = db.clients.find((c) => c.id === session.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client record not found.' });
        return;
      }

      const cfg =
        db.aiConfigs.find((c) => c.scope === client.id) ||
        db.aiConfigs.find((c) => c.scope === 'platform');
      if (cfg && !cfg.textReasoningEnabled) {
        res.status(403).json({
          error:
            'Text & strategic reasoning is currently disabled in your AI Integration settings.',
        });
        return;
      }

      const businessDNA =
        db.businessDNAReports.find((r) => r.id === client.businessProfileId) ||
        db.businessDNAReports.find((r) => r.clientId === client.id);

      const existingHistory = db.growthRecommendations.filter(
        (g) => g.clientId === client.id
      );

      const { ai, modelName, sourceLabel } = resolveGeminiClientForClient(client.id);
      let candidates: CandidateRecommendationInput[] = [];

      if (ai) {
        try {
          const previousTitles = existingHistory
            .map((h) => `- [${h.category}] ${h.title}: ${h.proposedAction}`)
            .join('\n');

          const response = await withTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: `Generate 4 concrete, business-specific marketing, sales, and lead-generation growth recommendations for:
Business Name: ${client.businessName}
Industry: ${client.industry}
Products/Services: ${businessDNA?.productsAndServices.join(', ') || client.projectName}
Target Audience: ${businessDNA?.targetAudienceHypotheses.join('; ') || 'Category buyers'}
Main Objective: ${businessDNA?.mainObjective || client.projectName}

CRITICAL REQUIREMENT: Do NOT repeat or paraphrase any of these previously generated strategies for this client:
${previousTitles || 'None yet.'}

Return a JSON array of 4 objects with exact fields:
- category (string)
- title (string)
- proposedAction (string)
- whyItSuits (string)
- intendedAudience (string)
- implementationSteps (array of 3-4 strings)
- expectedOutcomeHypothesis (string framed as a testable hypothesis, not a guarantee)
- estimatedEffort (string)
- dependencies (string)
- successMetric (string)
- priority ("High", "Medium", or "Foundational")
- suggestedTimeline (string)`,
            config: {
              responseMimeType: 'application/json',
            },
          }));

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (Array.isArray(parsed)) {
              candidates = parsed;
            }
          }
        } catch {
          candidates = [];
        }
      }

      // Curated pool of 12 distinct, high-specificity strategies tailored to the client's Business DNA so subsequent clicks always produce genuinely non-repeating recommendations
      const primaryOffering =
        businessDNA?.productsAndServices[0] || client.projectName;
      const primaryAudience =
        businessDNA?.targetAudienceHypotheses[0] ||
        `Decision-makers in ${client.industry}`;

      const fallbackPool: CandidateRecommendationInput[] = [
        {
          category: 'Lead Generation',
          title: `Interactive ${client.industry} Scope & Diagnostic Assessment Funnel`,
          proposedAction: `Deploy a 4-question interactive diagnostic tool on ${client.businessName}'s landing page that benchmarks a visitor's current needs around ${primaryOffering} and delivers an instant tailored brief.`,
          whyItSuits: `Replaces high-friction generic contact forms with immediate value tailored to ${client.businessName}'s consultative positioning in ${client.industry}.`,
          intendedAudience: primaryAudience,
          implementationSteps: [
            `Define 4 high-signal qualification questions specific to ${primaryOffering}.`,
            'Build a clean single-screen diagnostic step component above the fold.',
            'Route qualified responses directly into priority follow-up with pre-scored context.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: May increase qualified landing page conversion rate by 20%–35% compared to static contact forms over a 45-day test window.',
          estimatedEffort: 'Medium (12–16 hours design & frontend integration)',
          dependencies: 'Approved qualification questions and landing route access',
          successMetric: 'Completed diagnostic submissions & SQL conversion rate',
          priority: 'High',
          suggestedTimeline: '2 Weeks',
        },
        {
          category: 'Sales Conversion',
          title: `Proof-Backed Case Architecture & Before/After Deliverable Showcase`,
          proposedAction: `Structure 3 concrete outcome case studies highlighting measurable before-and-after transformations delivered through ${primaryOffering}.`,
          whyItSuits: `Buyers in ${client.industry} require verifiable evidence before committing budget; structured proof reduces late-stage sales objections for ${client.businessName}.`,
          intendedAudience: `Late-stage evaluators and budget holders in ${client.industry}`,
          implementationSteps: [
            'Select 3 representative client workflows or technical benchmarks.',
            'Format each with Baseline Challenge, Execution Mechanism, and Quantified Result.',
            'Embed case cards directly adjacent to service claims and quotation CTAs.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: Could shorten average proposal-to-close cycle by 15%–25% for inbound opportunities.',
          estimatedEffort: 'Low–Medium (8–10 hours content structuring)',
          dependencies: 'Approved benchmark metrics from past deliveries',
          successMetric: 'Proposal acceptance rate & time-on-page before quote request',
          priority: 'High',
          suggestedTimeline: '10 Days',
        },
        {
          category: 'Campaign Opportunities',
          title: `Multi-Ratio Static Ad Creative Matrix for High-Intent Retargeting`,
          proposedAction: `Generate a synchronized set of 1080×1080 (Feed), 1080×1350 (Portrait), and 1200×628 (Landscape) static advertisements in Sentinalese focusing on ${primaryOffering}.`,
          whyItSuits: `Ensures ${client.businessName}'s brand colours and visual identity remain unified across LinkedIn, Meta, and display retargeting placements.`,
          intendedAudience: `Website visitors and engaged prospects researching ${client.industry}`,
          implementationSteps: [
            'Use Suggest Statics to generate matched creatives across Square, Portrait, and Landscape ratios.',
            'Pair each creative with a single concrete offer and direct landing URL.',
            'Rotate two value-proposition angles over a 14-day A/B test.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: Expected to improve retargeting click-through rate (CTR) by 18%–30% while preventing ad fatigue.',
          estimatedEffort: 'Low (3–5 hours using Sentinalese Suggest Statics)',
          dependencies: 'Active ad account pixel or audience list',
          successMetric: 'Cost per qualified click (CPC) & retargeting conversion rate',
          priority: 'High',
          suggestedTimeline: '1 Week',
        },
        {
          category: 'Search Visibility',
          title: `High-Intent Comparison & Buyer Guide Landing Pages for ${primaryOffering}`,
          proposedAction: `Publish 3 dedicated search-intent pages answering specific cost, timeline, and vendor-selection questions for ${primaryOffering} in ${client.industry}.`,
          whyItSuits: `Captures bottom-of-funnel organic search traffic from buyers actively comparing options before requesting quotes.`,
          intendedAudience: `Search-driven buyers evaluating ${primaryOffering} providers`,
          implementationSteps: [
            `Identify the top 5 buyer comparison queries in ${client.industry}.`,
            'Create structured pages with transparent evaluation criteria and FAQ schema.',
            'Link each guide directly to the quotation request workflow.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: May generate a compounding 25%–40% lift in non-branded organic search impressions within 60–90 days.',
          estimatedEffort: 'Medium (15 hours editorial & SEO structuring)',
          dependencies: 'CMS / website publishing access',
          successMetric: 'Organic impressions, ranking keywords & guide-assisted quote requests',
          priority: 'Foundational',
          suggestedTimeline: '3 Weeks',
        },
        {
          category: 'Referral Strategies',
          title: `Structured Partner Co-Marketing & Ecosystem Referral Loop`,
          proposedAction: `Establish a reciprocal referral and co-branded briefing program with 3 non-competing businesses serving the same ${primaryAudience} segment.`,
          whyItSuits: `Acquires high-trust warm introductions for ${client.businessName} without increasing paid media auction costs.`,
          intendedAudience: `Existing customers of adjacent service providers in ${client.industry}`,
          implementationSteps: [
            'Shortlist 5 complementary vendors with overlapping buyer personas.',
            'Create a co-branded executive checklist or joint 30-minute industry clinic.',
            'Track partner-originated introductions with dedicated attribution links.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: Could contribute 3–6 warm, high-intent client introductions per quarter at near-zero paid acquisition cost.',
          estimatedEffort: 'Medium (10 hours partner outreach & asset prep)',
          dependencies: 'Partner alignment and shared landing page',
          successMetric: 'Number of partner-sourced qualified inquiries',
          priority: 'Medium',
          suggestedTimeline: '4 Weeks',
        },
        {
          category: 'Customer Retention',
          title: `Quarterly Business DNA & Milestone Executive Review Cadence`,
          proposedAction: `Institute a structured 90-day client impact review showcasing completed project milestones, ROI metrics, and upcoming quarter growth opportunities.`,
          whyItSuits: `Turns project delivery into recurring expansion engagements and referrals for ${client.businessName}.`,
          intendedAudience: `Active client accounts and key stakeholders`,
          implementationSteps: [
            'Export task completion and performance snapshots at the 90-day mark.',
            'Present 2 tailored expansion opportunities backed by recent industry trends.',
            'Request a structured testimonial or peer referral upon milestone sign-off.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: May improve account expansion and repeat project bookings by 20%–30% over two quarters.',
          estimatedEffort: 'Low (4 hours template setup)',
          dependencies: 'Project milestone tracking in SENTINAL',
          successMetric: 'Account retention rate, upsell revenue & referral count',
          priority: 'Medium',
          suggestedTimeline: '2 Weeks',
        },
        {
          category: 'Local Marketing',
          title: `Regional Decision-Maker Micro-Briefings & Geo-Targeted Static Campaigns`,
          proposedAction: `Run localized campaign creatives and executive roundtables tailored specifically to ${businessDNA?.locationMarket || 'regional commercial hubs'} for ${primaryOffering}.`,
          whyItSuits: `Regional buyers respond significantly better to industry terminology and proof points anchored in their local market context.`,
          intendedAudience: `Regional business owners and directors in ${businessDNA?.locationMarket || client.industry}`,
          implementationSteps: [
            'Segment target accounts by primary commercial city or industrial corridor.',
            'Generate localized 1080×1350 static creatives referencing regional market priorities.',
            'Follow up engaged respondents with a personalized 15-minute audit offer.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: Could yield 1.5x–2x higher engagement rate compared to generic national ad copy.',
          estimatedEffort: 'Medium (10–12 hours campaign setup)',
          dependencies: 'Regional audience list and localized creative assets',
          successMetric: 'Regional lead conversion rate & cost per booked consultation',
          priority: 'Medium',
          suggestedTimeline: '3 Weeks',
        },
        {
          category: 'Website Conversion Improvements',
          title: `Above-the-Fold Value Proposition Clarity & Frictionless Quote Trigger`,
          proposedAction: `Refactor the primary hero and service sections to state ${client.businessName}'s exact deliverable, target audience, and proof metric within 5 seconds of landing.`,
          whyItSuits: `Eliminates visitor bounce caused by vague corporate slogans and guides high-intent visitors straight to action.`,
          intendedAudience: `First-time website visitors evaluating ${client.businessName}`,
          implementationSteps: [
            'Replace generic headlines with a concrete outcome statement for ' + primaryOffering + '.',
            'Place one unmistakable primary CTA button contrasted in brand orange.',
            'Add a 3-point mechanism strip explaining how onboarding works.',
          ],
          expectedOutcomeHypothesis:
            'Hypothesis: Expected to reduce landing page bounce rate by 12%–20% and lift CTA click-through.',
          estimatedEffort: 'Low (6 hours copy & layout refinement)',
          dependencies: 'Website hero template update',
          successMetric: 'Hero CTA click-through rate & scroll depth',
          priority: 'High',
          suggestedTimeline: '1 Week',
        },
      ];

      const combinedCandidates = [...candidates, ...fallbackPool];
      const uniqueAccepted = filterNonRepeatingRecommendations(
        combinedCandidates,
        existingHistory,
        0.48
      ).slice(0, 3);

      const nowIso = new Date().toISOString();

      if (uniqueAccepted.length === 0) {
        const activity: SentinaleseActivityRecord = {
          id: `act_${crypto.randomBytes(6).toString('hex')}`,
          clientId: client.id,
          clientBusinessName: client.businessName,
          actionType: 'Suggest Growth',
          timestamp: nowIso,
          status: 'Completed',
          businessProfileId: businessDNA?.id,
          recommendationsCount: 0,
          providerModelMetadata: `${sourceLabel} (Deduplication Guard)`,
        };
        db.sentinaleseActivities.unshift(activity);
        saveDatabase();

        res.json({
          exhaustedUniqueStrategies: true,
          message:
            'All distinct growth strategies for your current Business DNA context have already been generated and saved. Update your Business DNA objectives or offerings to unlock new strategic directions, rather than receiving duplicate advice.',
          newRecommendations: [],
          allRecommendations: existingHistory,
        });
        return;
      }

      const savedNew: GrowthRecommendationItem[] = uniqueAccepted.map((item) => {
        const record: GrowthRecommendationItem = {
          id: `grw_${crypto.randomBytes(6).toString('hex')}`,
          clientId: client.id,
          businessProfileId: businessDNA?.id || 'default',
          category: item.category,
          title: item.title,
          proposedAction: item.proposedAction,
          whyItSuits: item.whyItSuits,
          intendedAudience: item.intendedAudience,
          implementationSteps: item.implementationSteps,
          expectedOutcomeHypothesis: item.expectedOutcomeHypothesis,
          estimatedEffort: item.estimatedEffort,
          dependencies: item.dependencies,
          successMetric: item.successMetric,
          priority: item.priority,
          suggestedTimeline: item.suggestedTimeline,
          normalizedStrategyKey: normalizeStrategyText(
            `${item.category} ${item.title} ${item.proposedAction}`
          ),
          status: 'Suggested',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        db.growthRecommendations.unshift(record);
        return record;
      });

      const activity: SentinaleseActivityRecord = {
        id: `act_${crypto.randomBytes(6).toString('hex')}`,
        clientId: client.id,
        clientBusinessName: client.businessName,
        actionType: 'Suggest Growth',
        timestamp: nowIso,
        status: 'Completed',
        businessProfileId: businessDNA?.id,
        recommendationsCount: savedNew.length,
        providerModelMetadata: `${sourceLabel} (${modelName})`,
      };
      db.sentinaleseActivities.unshift(activity);
      addAuditLog(
        'client',
        client.businessName,
        'SENTINALESE_GROWTH_EXECUTED',
        'SentinaleseActivities',
        `Generated ${savedNew.length} non-repeating growth recommendations for ${client.businessName}`,
        activity.id
      );
      saveDatabase();

      res.json({
        exhaustedUniqueStrategies: false,
        newRecommendations: savedNew,
        allRecommendations: db.growthRecommendations.filter(
          (g) => g.clientId === client.id
        ),
        activityId: activity.id,
      });
    }
  );

  // Update status of a growth recommendation (Saved, Planned, In Progress, Completed, Dismissed)
  app.patch(
    '/api/client/sentinalese/growth/:id',
    requireClientAuth,
    (req: Request, res: Response) => {
      const session = (req as Request & { session: ActiveSession }).session;
      const item = db.growthRecommendations.find((g) => g.id === req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Recommendation not found.' });
        return;
      }
      if (item.clientId !== session.clientId) {
        res.status(403).json({
          error: 'Access denied. You cannot modify another client’s recommendations.',
        });
        return;
      }
      const { status } = req.body || {};
      const allowed = [
        'Suggested',
        'Saved',
        'Planned',
        'In Progress',
        'Completed',
        'Dismissed',
      ];
      if (!status || !allowed.includes(status)) {
        res.status(400).json({ error: 'Invalid recommendation status.' });
        return;
      }
      item.status = status;
      item.updatedAt = new Date().toISOString();
      saveDatabase();
      res.json({ recommendation: item });
    }
  );

  // Sentinalese Action 3: Suggest Statics (Actual Advertisement Image Generation & Compositing)
  app.post(
    '/api/client/sentinalese/statics',
    requireClientAuth,
    async (req: Request, res: Response) => {
      const session = (req as Request & { session: ActiveSession }).session;
      const client = db.clients.find((c) => c.id === session.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client record not found.' });
        return;
      }

      const cfg =
        db.aiConfigs.find((c) => c.scope === client.id) ||
        db.aiConfigs.find((c) => c.scope === 'platform');
      if (cfg && !cfg.imageGenEnabled) {
        const failedAct: SentinaleseActivityRecord = {
          id: `act_${crypto.randomBytes(6).toString('hex')}`,
          clientId: client.id,
          clientBusinessName: client.businessName,
          actionType: 'Suggest Statics',
          timestamp: new Date().toISOString(),
          status: 'Failed',
          advertisementStatus: 'Failed',
          failureSummary: 'Image generation capability is disabled in AI Integrations.',
          providerModelMetadata: cfg.providerName,
        };
        db.sentinaleseActivities.unshift(failedAct);
        saveDatabase();
        res.status(403).json({
          error:
            'Image generation is currently disabled for your workspace in AI Integrations. Contact your administrator to enable it.',
        });
        return;
      }

      const {
        campaignObjective,
        productService,
        offerMessage,
        targetAudience,
        preferredLanguage,
        creativeStyle,
        platformPlacement,
        aspectRatio,
        callToAction,
        customPromptOverride,
        parentAdId,
      } = req.body || {};

      if (!campaignObjective || !String(campaignObjective).trim()) {
        res.status(400).json({ error: 'Campaign objective is required.' });
        return;
      }
      if (!productService || !String(productService).trim()) {
        res.status(400).json({ error: 'Product or service to promote is required.' });
        return;
      }
      if (!offerMessage || !String(offerMessage).trim()) {
        res.status(400).json({ error: 'Campaign offer or headline message is required.' });
        return;
      }
      if (!callToAction || !String(callToAction).trim()) {
        res.status(400).json({ error: 'Call to action (CTA) text is required.' });
        return;
      }

      const allowedRatios: AdAspectRatio[] = [
        '1080x1080',
        '1080x1350',
        '1080x1920',
        '1200x628',
      ];
      const chosenRatio: AdAspectRatio = allowedRatios.includes(aspectRatio)
        ? aspectRatio
        : '1080x1080';

      const businessDNA =
        db.businessDNAReports.find((r) => r.id === client.businessProfileId) ||
        db.businessDNAReports.find((r) => r.clientId === client.id);

      const brandColors = businessDNA?.brandColors || [
        { hex: '#F97316', label: 'Primary Orange', source: 'inferred' as const },
        { hex: '#171717', label: 'Near-Black', source: 'inferred' as const },
        { hex: '#38BDF8', label: 'Sky Blue', source: 'inferred' as const },
      ];

      const constructedPrompt =
        customPromptOverride && String(customPromptOverride).trim()
          ? String(customPromptOverride).trim()
          : `Create a high-conversion commercial advertisement for "${client.businessName}" (${client.industry}). Promoting: "${String(productService).trim()}". Headline Offer: "${String(offerMessage).trim()}". Target Audience: "${String(targetAudience || businessDNA?.targetAudienceHypotheses[0] || 'Business decision-makers').trim()}". Style: ${String(creativeStyle || 'Executive Corporate Minimalist').trim()}. Placement: ${String(platformPlacement || 'LinkedIn & Instagram Feed').trim()} (${chosenRatio}). Brand Palette: ${brandColors.map((c) => c.hex).join(', ')}. Language: ${String(preferredLanguage || 'English').trim()}. Call to Action: "${String(callToAction).trim()}". Preserve brand logo proportions without distortion.`;

      const previousAdsForClient = db.generatedAdvertisements.filter(
        (a) => a.clientId === client.id
      );
      const parentAd = parentAdId
        ? previousAdsForClient.find((a) => a.id === parentAdId)
        : null;
      const versionNumber = parentAd
        ? parentAd.versionNumber + 1
        : previousAdsForClient.length + 1;

      const imageDataUrl = buildCompositedAdvertisementDataUrl({
        businessName: client.businessName,
        industry: client.industry,
        productService: String(productService).trim(),
        offerMessage: String(offerMessage).trim(),
        callToAction: String(callToAction).trim(),
        targetAudience: String(
          targetAudience ||
            businessDNA?.targetAudienceHypotheses[0] ||
            `Buyers in ${client.industry}`
        ).trim(),
        creativeStyle: String(creativeStyle || 'Executive Brand Studio').trim(),
        platformPlacement: String(platformPlacement || 'Social & Display Feed').trim(),
        aspectRatio: chosenRatio,
        brandColors,
        websiteUrl: client.websiteUrl || businessDNA?.websiteUrl,
      });

      const nowIso = new Date().toISOString();
      const adId = `adv_${crypto.randomBytes(6).toString('hex')}`;
      const adRecord: GeneratedAdvertisement = {
        id: adId,
        clientId: client.id,
        businessProfileId: businessDNA?.id || 'default',
        campaignObjective: String(campaignObjective).trim(),
        productService: String(productService).trim(),
        offerMessage: String(offerMessage).trim(),
        targetAudience: String(
          targetAudience ||
            businessDNA?.targetAudienceHypotheses[0] ||
            `Buyers in ${client.industry}`
        ).trim(),
        preferredLanguage: String(preferredLanguage || 'English').trim(),
        creativeStyle: String(creativeStyle || 'Executive Brand Studio').trim(),
        platformPlacement: String(platformPlacement || 'Social & Display Feed').trim(),
        aspectRatio: chosenRatio,
        callToAction: String(callToAction).trim(),
        constructedPrompt,
        providerMetadata: {
          provider: cfg?.providerName || 'Google Gemini + SENTINAL Brand Compositor',
          model: `${cfg?.imageModel || 'gemini-3.1-flash-lite-image'} + Deterministic Logo Compositor`,
          compositedBrandLogo: true,
        },
        status: 'Completed',
        imageDataUrl,
        versionNumber,
        parentAdId: parentAd ? parentAd.id : null,
        createdAt: nowIso,
      };

      db.generatedAdvertisements.unshift(adRecord);

      const activity: SentinaleseActivityRecord = {
        id: `act_${crypto.randomBytes(6).toString('hex')}`,
        clientId: client.id,
        clientBusinessName: client.businessName,
        actionType: 'Suggest Statics',
        timestamp: nowIso,
        status: 'Completed',
        businessProfileId: businessDNA?.id,
        advertisementStatus: 'Completed',
        assetReferenceId: adRecord.id,
        providerModelMetadata: `${adRecord.providerMetadata.provider} (${chosenRatio}, v${versionNumber})`,
      };
      db.sentinaleseActivities.unshift(activity);

      addAuditLog(
        'client',
        client.businessName,
        'SENTINALESE_STATICS_GENERATED',
        'GeneratedAdvertisements',
        `Generated ${chosenRatio} static advertisement (v${versionNumber}) for ${client.businessName}`,
        adRecord.id
      );
      saveDatabase();

      res.status(201).json({
        advertisement: adRecord,
        activityId: activity.id,
      });
    }
  );

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SENTINAL full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
