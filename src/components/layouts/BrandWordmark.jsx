import React from 'react';

function BrandWordmark({
  className = '',
  logoWrapperClassName = '',
  logoImageClassName = '',
  titleClassName = '',
  subtitleClassName = '',
  showSubtitle = false,
  subtitle = 'Phones & Accessories • Electronics • Home Appliances',
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <span className={`flex items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20 ${logoWrapperClassName}`.trim()}>
        <img
          src="/logo.png"
          alt="FMM CLASSICO logo"
          className={`h-full w-full object-contain ${logoImageClassName}`.trim()}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </span>
      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span className={`truncate font-black uppercase tracking-[0.18em] ${titleClassName}`.trim()}>
          FMM CLASSICO
        </span>
        {showSubtitle ? (
          <span className={`mt-1 truncate ${subtitleClassName}`.trim()}>{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}

export default React.memo(BrandWordmark);
