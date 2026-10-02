import React from 'react';

interface SpiralBinderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'cyan' | 'blue' | 'yellow' | 'paper';
}

export const SpiralBinder: React.FC<SpiralBinderProps> = ({
  title,
  subtitle,
  badge,
  icon,
  children,
  variant = 'cyan'
}) => {
  // 8 rings along the left spine as in the reference image
  const rings = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="relative max-w-5xl mx-auto px-1 sm:px-4 my-2 sm:my-4 transition-all w-full">
      {/* Top Hanging Binder Tabs (like "SQUIRREL INFO" in reference) */}
      <div className="flex justify-center -mb-2.5 sm:-mb-3 relative z-20">
        <div className="bg-[#38BDF8] border-2 sm:border-3 border-[#0F172A] rounded-xl px-3 sm:px-5 py-1 sm:py-2 shadow-pixel flex items-center space-x-1.5 sm:space-x-2 max-w-[95%]">
          {/* Mini top loops */}
          <div className="flex space-x-1 sm:space-x-2 -mt-3 sm:-mt-4 mb-1">
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                className="w-1.5 sm:w-2.5 h-3 sm:h-4 bg-white border sm:border-2 border-[#0F172A] rounded-full shadow-sm"
              />
            ))}
            {[3, 4].map(idx => (
              <div
                key={idx}
                className="hidden sm:block w-2.5 h-4 bg-white border-2 border-[#0F172A] rounded-full shadow-sm"
              />
            ))}
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-hidden">
            {icon && <span className="text-base sm:text-xl shrink-0">{icon}</span>}
            <span className="font-pixel text-[10px] sm:text-xs md:text-sm text-[#0F172A] tracking-wider uppercase font-bold truncate">
              {title}
            </span>
            {badge && (
              <span className="font-pixel text-[8px] sm:text-[10px] bg-[#FEF08A] border sm:border-2 border-[#0F172A] px-1.5 sm:px-2 py-0.5 rounded text-[#0F172A] font-bold shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Binder Body */}
      <div className="relative bg-[#BAE6FD] border-3 sm:border-4 border-[#0F172A] rounded-2xl sm:rounded-3xl p-1.5 sm:p-5 shadow-pixel-lg">
        {/* Inner Paper Page with Left Spiral Wire Margin */}
        <div className="relative bg-[#F0F9FF] border-2 sm:border-3 border-[#0F172A] rounded-xl sm:rounded-2xl pl-7 sm:pl-14 pr-2 sm:pr-6 py-3 sm:py-5 shadow-inner">
          
          {/* Left Spiral Rings Spine */}
          <div className="absolute left-1.5 sm:left-3 top-4 sm:top-6 bottom-4 sm:bottom-6 flex flex-col justify-between items-center w-4 sm:w-6 z-20 pointer-events-none">
            {rings.map((r) => (
              <div key={r} className="relative flex items-center justify-center">
                {/* Hole in paper */}
                <div className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 bg-[#0284C7] border sm:border-2 border-[#0F172A] rounded-full" />
                {/* Metallic spiral ring coil */}
                <div className="absolute -left-1 sm:-left-2 w-5 sm:w-7 h-2 sm:h-3 bg-white border sm:border-2 border-[#0F172A] rounded-full shadow-sm transform -rotate-12" />
              </div>
            ))}
          </div>

          {/* Subtitle / Header ribbon on paper */}
          {subtitle && (
            <div className="mb-3 sm:mb-5 max-w-sm mx-auto bg-white border sm:border-2 border-[#0F172A] rounded-lg py-0.5 sm:py-1 px-2 sm:px-4 text-center shadow-pixel-sm">
              <span className="font-pixel text-[9px] sm:text-[11px] text-[#0284C7] uppercase font-bold tracking-wider sm:tracking-widest line-clamp-1">
                {subtitle}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 text-[#0F172A]">
            {children}
          </div>
        </div>

        {/* Bottom notebook paper stacked pages effect */}
        <div className="mt-1 h-2 sm:h-2.5 bg-white border sm:border-2 border-[#0F172A] rounded-b-xl mx-2 sm:mx-3 flex items-center justify-center">
          <div className="w-12 sm:w-16 h-0.5 sm:h-1 bg-[#BAE6FD] rounded-full" />
        </div>
      </div>
    </div>
  );
};
