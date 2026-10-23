import React, { useEffect, useState } from 'react';
import { OFFICIAL_LOGO_PATH } from './SentinalLogo';

const INTRO_WORDS = [
  'Discover',
  'Experience',
  'Engage',
  'Approve',
  'Get Boarded',
] as const;

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'words' | 'logo' | 'fadeout'>('words');
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      onComplete();
      return;
    }

    // 0-3s: 5 words at ~600ms each
    const wordTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < INTRO_WORDS.length; i++) {
      wordTimers.push(
        setTimeout(() => {
          setWordIndex(i);
        }, i * 600)
      );
    }

    // 3.0s-5.0s: Official SENTINAL Logo reveal
    const logoTimer = setTimeout(() => {
      setPhase('logo');
    }, 3000);

    // 5.0s-5.6s: Smooth landing page reveal transition
    const fadeTimer = setTimeout(() => {
      setPhase('fadeout');
    }, 5000);

    const doneTimer = setTimeout(() => {
      onComplete();
    }, 5600);

    return () => {
      wordTimers.forEach(clearTimeout);
      clearTimeout(logoTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      role="dialog"
      aria-label="SENTINAL Introduction"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F95716] text-white transition-opacity duration-500 ${
        phase === 'fadeout' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center justify-center px-6 text-center max-w-2xl w-full">
        {phase === 'words' && (
          <div key={wordIndex} className="animate-fade-in">
            <p className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
              {INTRO_WORDS[wordIndex]}
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              {INTRO_WORDS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-200 ${
                    idx === wordIndex ? 'w-8 bg-white' : 'w-2 bg-white/35'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {(phase === 'logo' || phase === 'fadeout') && (
          <div className="flex flex-col items-center justify-center transition-transform duration-500 scale-100">
            <img
              src={OFFICIAL_LOGO_PATH}
              alt="SENTINAL — Brand Banao. Duniya Hilao."
              className="w-72 sm:w-96 max-h-72 object-contain"
            />
            <p className="mt-2 font-display text-lg sm:text-xl font-medium tracking-wide text-white/95">
              Brand Banao. Duniya Hilao.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="absolute bottom-8 right-8 px-4 py-2 text-xs font-medium text-white/90 hover:text-white border border-white/30 hover:border-white rounded-lg transition-colors whitespace-nowrap"
      >
        Skip Intro
      </button>
    </div>
  );
};
