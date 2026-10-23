import React from 'react';

export const OFFICIAL_LOGO_PATH = '/assets/aistudio/image_c8c362ee.png';

interface SentinalLogoProps {
  variant?: 'orange-card' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showImageTile?: boolean;
  className?: string;
}

export const SentinalLogo: React.FC<SentinalLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClass = {
    sm: 'w-[112px] h-auto',
    md: 'w-[132px] sm:w-[148px] h-auto',
    lg: 'w-[160px] h-auto',
    xl: 'w-[220px] sm:w-[280px] h-auto',
  }[size];

  return (
    <span className={`inline-flex items-center select-none shrink-0 ${className}`}>
      <img
        src={OFFICIAL_LOGO_PATH}
        alt="SENTINAL"
        className={`${sizeClass} object-contain shrink-0 block`}
      />
    </span>
  );
};

