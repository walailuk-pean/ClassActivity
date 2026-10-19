import React from 'react';

interface BuLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'badge';
  theme?: 'light' | 'dark'; // 'light' is for light backgrounds, 'dark' is for dark backgrounds (white text)
  size?: 'sm' | 'md' | 'lg';
}

export const BuBusinessLogo: React.FC<BuLogoProps> = ({
  className = '',
  variant = 'full',
  theme = 'light',
  size = 'md',
}) => {
  const isDark = theme === 'dark';

  // Scales
  const iconScale = size === 'sm' ? 'w-7 h-5' : size === 'lg' ? 'w-12 h-9' : 'w-9 h-6.5';

  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {/* Authentic BU 3D Diamond Mark */}
      <div className={`relative shrink-0 flex items-center justify-center ${iconScale}`}>
        <svg
          viewBox="0 0 44 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          <g>
            <path d="M43.1596 8.57204L35.7342 0.941406H7.40707L0 8.57204L21.5175 31.0205L43.1596 8.57204Z" fill={isDark ? '#CBD5E1' : '#9BA8AD'} />
            <path d="M0.875948 8.5867L7.95683 1.46185H35.3311L42.4156 8.5867H0.875948Z" fill={isDark ? '#E2E8F0' : '#C8CDCF'} />
            <path d="M35.3311 1.46184L35.7342 0.941406L43.1596 8.57204H42.0748L35.3311 1.46184Z" fill="#FFFFFF" />
            <path d="M42.0748 8.57204L7.95682 1.46185H35.3311L42.0748 8.57204Z" fill={isDark ? '#94A3B8' : '#BAC3C7'} />
            <path d="M0.875948 8.64168L21.3782 28.8068L42.4156 8.5867L0.875948 8.64168Z" fill={isDark ? '#E2E8F0' : '#C8CDCF'} />
            <path d="M43.1596 8.57204H42.0748L19.8462 26.5711L20.6599 28.7995L21.5175 31.0205L43.1596 8.57204Z" fill="#FFFFFF" />
            <path d="M42.0748 8.57204L38.0249 11.8449C38.0249 11.8449 27.0884 11.8449 20.9531 13.3256C14.8801 14.7916 10.2182 17.841 10.2182 17.841L0.817307 8.5867L42.0748 8.57204Z" fill={isDark ? '#94A3B8' : '#BAC3C7'} />
            <path d="M21.1987 29.8183L21.5175 31.0205L43.1596 8.57204L21.1987 29.8183Z" fill={isDark ? '#64748B' : '#9BA8AD'} />
            <path d="M29.401 18.9588L13.9089 10.958L21.5175 31.0205L12.4978 10.958L9.92129 13.8607L11.3433 10.0784L0.120947 8.57937H11.1454L8.51391 3.03782L12.2523 7.61546L17.2844 1.23461L13.9235 7.52384L24.4202 1.98595L14.9314 8.57937H42.7528L14.9314 9.92811L29.401 18.9588Z" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {variant !== 'icon' && (
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-black tracking-tight ${
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
              } ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              BANGKOK UNIVERSITY
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className={`font-bold tracking-wider ${
                size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]'
              } ${isDark ? 'text-rose-300' : 'text-[#bc1b11]'}`}
            >
              BUSINESS ADMINISTRATION
            </span>
          </div>
          {size !== 'sm' && (
            <span
              className={`text-[9px] ${
                isDark ? 'text-indigo-200' : 'text-slate-500'
              }`}
            >
              คณะบริหารธุรกิจ มหาวิทยาลัยกรุงเทพ
            </span>
          )}
        </div>
      )}
    </div>
  );
};
