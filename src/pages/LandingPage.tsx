import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileSearch,
  Layers,
  Lock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { OFFICIAL_LOGO_PATH } from '../components/SentinalLogo';

interface LandingPageProps {
  navigate: (to: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const scrollToExplore = () => {
    const el = document.getElementById('section-challenge');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#F8FAFC] text-[#171717]">
      {/* SECTION 1 — HERO */}
      <section className="relative bg-white border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold tracking-wider uppercase text-[#EA580C]">
                SENTINAL Business Intelligence & Marketing Platform · Brand Banao. Duniya Hilao.
              </p>
              <h1
                className="font-display font-extrabold text-[#171717] tracking-tight leading-[1.08]"
                style={{ fontSize: 'clamp(2.35rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
              >
                Your Business Has a DNA. Let&apos;s Decode It.
              </h1>
              <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl">
                Understand your digital identity, uncover business opportunities and create marketing assets with SENTINAL.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/business-dna')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Discover Your Business DNA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={scrollToExplore}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#171717] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Explore SENTINAL</span>
                </button>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                <span>Public Website Inspection</span>
                <span aria-hidden="true">·</span>
                <span>Structured Brand DNA Profiling</span>
                <span aria-hidden="true">·</span>
                <span>Approved Client Sentinalese AI</span>
                <span aria-hidden="true">·</span>
                <span>Verified Task Progress Tracking</span>
              </div>
            </div>

            {/* Hero Visual: Digital Brand Identity Decoder Preview */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-[#171717] text-white rounded-2xl p-6 sm:p-8 border border-neutral-800">
              <div className="flex items-center justify-between pb-5 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <img
                    src={OFFICIAL_LOGO_PATH}
                    alt="SENTINAL"
                    className="w-[116px] sm:w-[128px] h-auto object-contain shrink-0"
                  />
                  <div>
                    <p className="font-display text-sm font-bold text-white">
                      Business DNA Signal Decoder
                    </p>
                    <p className="text-xs text-neutral-400">
                      Illustrative Architecture Preview
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#38BDF8]">HTTPS · DOM</span>
              </div>

              <div className="my-6 space-y-4">
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Extracted Signal Layer</span>
                    <span className="font-mono text-[#16A34A]">Verified Signal</span>
                  </div>
                  <p className="font-display text-sm font-semibold text-white">
                    Brand Identity, Positioning &amp; Colour Tokens
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="w-6 h-3 rounded bg-[#F97316]" title="#F97316" />
                    <span className="w-6 h-3 rounded bg-[#38BDF8]" title="#38BDF8" />
                    <span className="w-6 h-3 rounded bg-[#16A34A]" title="#16A34A" />
                    <span className="w-6 h-3 rounded bg-white" title="#FFFFFF" />
                    <span className="font-mono text-xs text-neutral-400 ml-1">
                      #F97316 · #38BDF8 · #16A34A
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <p className="text-xs text-neutral-400">Signal Extraction</p>
                    <p className="mt-1 font-display text-sm font-semibold text-white">
                      Title, Meta &amp; Copy
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <p className="text-xs text-neutral-400">Growth Output</p>
                    <p className="mt-1 font-display text-sm font-semibold text-[#F97316]">
                      Trends, Growth &amp; Ads
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                <span>No login required for Business DNA</span>
                <button
                  type="button"
                  onClick={() => navigate('/business-dna')}
                  className="text-[#F97316] hover:underline font-medium cursor-pointer"
                >
                  Try Live Decoder →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE CHALLENGE */}
      <section id="section-challenge" className="py-20 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
              01. The Challenge
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-bold text-[#171717]"
              style={{ textWrap: 'balance' }}
            >
              Why Growing Businesses Struggle to Turn Digital Presence Into Revenue
            </h2>
            <p className="text-base text-[#64748B] leading-relaxed">
              Most businesses invest in websites and campaigns without a unified view of their brand identity, market timing, or creative delivery.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <p className="font-mono text-xs font-semibold text-[#F97316]">01 / IDENTITY</p>
              <h3 className="font-display text-lg font-bold text-[#171717]">
                Unclear Online Identity
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Websites often fail to communicate what the business offers, who it serves, and why a buyer should trust it within the first few seconds.
              </p>
            </div>

            <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <p className="font-mono text-xs font-semibold text-[#F97316]">02 / MESSAGING</p>
              <h3 className="font-display text-lg font-bold text-[#171717]">
                Inconsistent Brand Messaging
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Disconnected colours, shifting tone of voice, and scattered value propositions weaken recall across search and social channels.
              </p>
            </div>

            <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <p className="font-mono text-xs font-semibold text-[#F97316]">03 / MARKET TIMING</p>
              <h3 className="font-display text-lg font-bold text-[#171717]">
                Missed Market Opportunities
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Sorting through generic headlines hides the industry developments, policy shifts, and competitor movements that actually affect your category.
              </p>
            </div>

            <div className="md:col-span-6 bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <p className="font-mono text-xs font-semibold text-[#F97316]">04 / EXECUTION</p>
              <h3 className="font-display text-lg font-bold text-[#171717]">
                Repetitive Marketing Work
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Teams repeatedly rebuild campaign briefs from scratch and receive recycled, generic marketing advice instead of concrete, non-repeating strategies.
              </p>
            </div>

            <div className="md:col-span-6 bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <p className="font-mono text-xs font-semibold text-[#F97316]">05 / VISIBILITY</p>
              <h3 className="font-display text-lg font-bold text-[#171717]">
                Limited Visibility Into Ongoing Creative Projects
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Clients are left guessing which deliverables have started, where preview links are hosted, and how close the overall project is to completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — DISCOVER BUSINESS DNA */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
                02. Public Diagnostic Engine
              </p>
              <h2
                className="font-display text-2xl sm:text-3xl font-bold text-[#171717]"
                style={{ textWrap: 'balance' }}
              >
                Discover Your Business DNA in Seconds
              </h2>
              <p className="text-base text-[#64748B] leading-relaxed">
                Submit your public business website URL for live server-side signal inspection, or enter your business details manually when building a new venture or operating without a website.
              </p>
              <ul className="space-y-3 text-sm text-[#171717]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Extracts public title tags, meta descriptions, heading structure, and brand colour tokens.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Measures initial HTTPS transport status, response time, and HTML payload structure.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Provides a complete manual builder if a website is blocked or still under construction.</span>
                </li>
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/business-dna')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <FileSearch className="w-4 h-4" />
                  <span>Analyse My Business</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#F8FAFC] p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <span className="font-display text-sm font-bold text-[#171717]">
                  Two Pathways to Your Business DNA
                </span>
                <span className="text-xs text-[#64748B]">Publicly Accessible</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-mono text-xs font-semibold text-[#F97316]">PATHWAY A</p>
                  <h3 className="font-display text-base font-bold text-[#171717]">
                    Automatic Website Inspection
                  </h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Enter any public HTTPS website URL. SENTINAL inspects accessible HTML metadata, brand signals, and response performance.
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-mono text-xs font-semibold text-[#38BDF8]">PATHWAY B</p>
                  <h3 className="font-display text-base font-bold text-[#171717]">
                    Guided Manual DNA Builder
                  </h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    No website yet? Provide your offerings, target customers, brand personality, and growth goals to synthesize a structured DNA report.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — UNDERSTAND YOUR BUSINESS (Illustrative Report Preview) */}
      <section className="py-20 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
                03. Understand Your Business
              </p>
              <h2
                className="font-display text-2xl sm:text-3xl font-bold text-[#171717]"
                style={{ textWrap: 'balance' }}
              >
                Why Decoding Brand Identity Comes Before Spending on Ads
              </h2>
              <p className="text-sm sm:text-base text-[#64748B]">
                Before launching campaigns, every stakeholder needs a shared reference of positioning, audience hypotheses, and digital readiness.
              </p>
            </div>
            <p className="text-xs font-mono text-[#64748B]">
              Illustrative Report Format · Not a Live Client Record
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <p className="text-xs font-mono text-[#EA580C]">
                  ILLUSTRATIVE BUSINESS DNA REPORT STRUCTURE
                </p>
                <h3 className="font-display text-xl font-bold text-[#171717] mt-1">
                  Structured Executive Report Sections
                </h3>
              </div>
              <span className="text-xs text-[#64748B]">
                Distinguishes Measured Signals · User Input · AI Hypotheses
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-mono text-[#64748B]">SECTION 01–02</p>
                <h4 className="font-display text-base font-bold text-[#171717]">
                  Business Overview &amp; Brand DNA
                </h4>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Captures industry category, brand personality traits, extracted or declared hex colour tokens, and core value proposition.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-mono text-[#64748B]">SECTION 03–05</p>
                <h4 className="font-display text-base font-bold text-[#171717]">
                  Offerings, Audience &amp; Digital Presence
                </h4>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Maps primary products/services to target buyer hypotheses and audits live website title tags, meta descriptions, and HTTPS delivery.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-mono text-[#64748B]">SECTION 06–07</p>
                <h4 className="font-display text-base font-bold text-[#171717]">
                  Opportunities &amp; Recommended Next Steps
                </h4>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Identifies concrete messaging gaps and prioritises the next marketing actions before media budget is committed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — INTRODUCING SENTINALESE */}
      <section className="py-20 bg-[#171717] text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                04. Introducing Sentinalese
              </p>
              <h2
                className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                The AI Business Growth Workspace Personalised to Your Business DNA
              </h2>
              <p className="text-base text-neutral-300 leading-relaxed">
                Sentinalese connects directly to an approved client&apos;s Business DNA profile to power three focused growth engines. Access is restricted exclusively to selected, approved clients.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-300 font-mono shrink-0">
              <Lock className="w-4 h-4 text-[#F97316]" />
              <span>Approved Client Workspace Only</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#38BDF8]">CAPABILITY 01</span>
                  <Compass className="w-5 h-5 text-[#38BDF8]" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  Get Latest Trends
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Retrieves relevant industry developments, government schemes, policy shifts, funding announcements, and market movements from the preceding seven days—filtered specifically to your industry and market.
                </p>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                7-Day Window · Source Attribution · Why It Matters
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#16A34A]">CAPABILITY 02</span>
                  <TrendingUp className="w-5 h-5 text-[#16A34A]" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  Suggest Growth
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Generates actionable lead-generation, sales conversion, and retention strategies with implementation steps, testable outcome hypotheses, effort estimates, and persistent duplicate exclusion.
                </p>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Non-Repeating History · 8-Point Action Plan
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#F97316]">CAPABILITY 03</span>
                  <Sparkles className="w-5 h-5 text-[#F97316]" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">
                  Suggest Statics
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Prefills your Business DNA brand colours, offerings, and audience to generate actual downloadable static advertisement images across Square, Portrait, Story, and Landscape formats.
                </p>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                1080×1080 · 1080×1350 · 1080×1920 · 1200×628
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800">
            <p className="text-sm text-neutral-300">
              Want Sentinalese configured for your business? Request a business quotation to get onboarded.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/request-quote')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Request a Business Quote
              </button>
              <button
                type="button"
                onClick={() => navigate('/client-access')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Client Access
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — FROM INSIGHTS TO CREATIVE OUTPUT */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
                05. From Insights to Creative Output
              </p>
              <h2
                className="font-display text-2xl sm:text-3xl font-bold text-[#171717]"
                style={{ textWrap: 'balance' }}
              >
                How Brand Identity, Audience &amp; Campaign Objective Shape Every Advertisement
              </h2>
            </div>
            <p className="text-xs font-mono text-[#64748B]">
              Illustrative Creative Pipeline · No Unauthorised API Call Executed
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <p className="font-mono text-xs font-semibold text-[#F97316]">STEP 1 · DNA</p>
                <h3 className="font-display text-base font-bold text-[#171717]">
                  Prefilled Brand Context
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Reads saved hex palette, brand tone, industry category, and verified logo from Business DNA.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <p className="font-mono text-xs font-semibold text-[#38BDF8]">STEP 2 · BRIEF</p>
                <h3 className="font-display text-base font-bold text-[#171717]">
                  Campaign Delta Inputs
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Collects only the missing campaign offer, placement aspect ratio, language, and call to action.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <p className="font-mono text-xs font-semibold text-[#16A34A]">STEP 3 · COMPOSITE</p>
                <h3 className="font-display text-base font-bold text-[#171717]">
                  Brand-Accurate Creative
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Generates the visual asset and deterministically composites the original brand mark without distortion.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#171717] text-white p-6 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span>ILLUSTRATIVE STATIC AD PREVIEW</span>
                <span>1080 × 1080</span>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-[#EA580C]/30 border border-neutral-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-bold tracking-wider uppercase text-[#F97316]">
                    B2B Supply Chain Automation
                  </span>
                  <span className="font-mono text-xs text-[#38BDF8]">v1 · Verified</span>
                </div>
                <p className="font-display text-xl font-extrabold text-white leading-snug">
                  Cut Warehouse Dispatch Delays by 40% With Automated Inventory Sync
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="inline-block px-4 py-2 text-xs font-bold bg-[#F97316] text-white rounded-lg">
                    Book Technical Demo
                  </span>
                  <span className="font-display text-xs font-bold text-white/80">
                    sentinal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — PROJECT TRANSPARENCY */}
      <section className="py-20 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
                06. Project Transparency
              </p>
              <h2
                className="font-display text-2xl sm:text-3xl font-bold text-[#171717]"
                style={{ textWrap: 'balance' }}
              >
                Real-Time Task Progress &amp; Deliverable Previews Without Guesswork
              </h2>
              <p className="text-base text-[#64748B] leading-relaxed">
                Every approved client workspace displays individual task completion in 10% increments, verified external preview links when ready, and an automatically calculated overall project completion percentage.
              </p>
              <p className="text-xs font-mono text-[#64748B]">
                Formula: Overall Progress = round( Σ Task Progress / n )
              </p>
            </div>

            {/* Illustrative Task Progress Visual (Explicitly labelled) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <p className="text-xs font-mono text-[#64748B]">
                    ILLUSTRATIVE WORKSPACE PREVIEW (NOT LIVE DB DATA)
                  </p>
                  <h3 className="font-display text-lg font-bold text-[#171717]">
                    Marketing &amp; Website Development
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#64748B]">Overall Project Progress</p>
                  <p className="font-mono text-2xl font-bold text-[#16A34A] tabular-nums">
                    67%
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-display font-bold text-[#171717]">
                      Website Design
                    </span>
                    <span className="font-mono text-xs text-[#171717] tabular-nums">
                      In Progress · 60%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#F97316] rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-display font-bold text-[#171717]">
                      Social Media Creatives
                    </span>
                    <span className="font-mono text-xs text-[#171717] tabular-nums">
                      In Progress · 40%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-display font-bold text-[#171717]">
                      SEO Setup
                    </span>
                    <span className="font-mono text-xs text-[#16A34A] tabular-nums">
                      Completed · 100%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#16A34A] rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — DESIGNED FOR COLLABORATION */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
              07. Designed for Collaboration
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-bold text-[#171717]"
              style={{ textWrap: 'balance' }}
            >
              Structured Governance Between Administrator Teams and Approved Clients
            </h2>
            <p className="text-base text-[#64748B]">
              Clear role separation ensures administrators control project execution and access codes while approved clients enjoy isolated, distraction-free visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#F97316]">
                  ADMINISTRATOR COMMAND WORKSPACE
                </span>
                <Layers className="w-5 h-5 text-[#F97316]" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#171717]">
                Full Control Over Clients, Tasks &amp; AI Governance
              </h3>
              <ul className="space-y-2.5 text-sm text-[#64748B]">
                <li>• Create client records and issue single-use cryptographic invitation codes.</li>
                <li>• Assign project tasks, attach optional preview URLs, and update progress in 10% increments.</li>
                <li>• Configure platform or client-owned AI credentials and audit all Sentinalese activity.</li>
              </ul>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#16A34A]">
                  APPROVED CLIENT WORKSPACE
                </span>
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#171717]">
                Dedicated Deliverable Tracking &amp; Sentinalese Access
              </h3>
              <ul className="space-y-2.5 text-sm text-[#64748B]">
                <li>• Activate access via invitation code and bind a secure authenticated session.</li>
                <li>• Inspect real-time task progress, due dates, and live preview links in a read-only view.</li>
                <li>• Run Get Latest Trends, Suggest Growth, and Suggest Statics in strict account isolation.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9 — HOW SENTINAL WORKS */}
      <section className="py-20 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
              08. End-to-End Workflow
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl font-bold text-[#171717]"
              style={{ textWrap: 'balance' }}
            >
              How SENTINAL Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Discover the business',
                desc: 'Submit a website URL or manual profile to capture public brand and market signals.',
              },
              {
                step: '02',
                title: 'Understand its DNA',
                desc: 'Review structured Brand DNA, audience hypotheses, and digital presence observations.',
              },
              {
                step: '03',
                title: 'Identify growth opportunities',
                desc: 'Approved clients unlock 7-day industry trends and non-repeating growth strategies.',
              },
              {
                step: '04',
                title: 'Create marketing assets',
                desc: 'Generate brand-aligned static advertisements across social and display aspect ratios.',
              },
              {
                step: '05',
                title: 'Track project execution',
                desc: 'Monitor every assigned task, preview link, and milestone percentage in real time.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4"
              >
                <span className="font-mono text-xs font-bold text-[#F97316]">
                  STEP {item.step}
                </span>
                <div className="space-y-1.5">
                  <h3 className="font-display text-base font-bold text-[#171717]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10 — FINAL CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#EA580C]">
            Brand Banao. Duniya Hilao.
          </p>
          <h2
            className="font-display text-3xl sm:text-4xl font-extrabold text-[#171717] tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            Ready to Understand Your Business Better?
          </h2>
          <p className="text-base text-[#64748B] max-w-2xl mx-auto">
            Start by decoding your Business DNA for free, request a tailored marketing quotation, or enter your client invitation code to access your private workspace.
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/business-dna')}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Discover Business DNA
            </button>
            <button
              type="button"
              onClick={() => navigate('/request-quote')}
              className="px-6 py-3.5 text-sm font-semibold text-[#171717] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Request a Business Quote
            </button>
            <button
              type="button"
              onClick={() => navigate('/client-access')}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-[#171717] hover:bg-neutral-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Client Access
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
