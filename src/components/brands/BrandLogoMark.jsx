import React, { useEffect, useMemo, useState } from 'react';
import { uniqueMediaCandidates } from '@/lib/media';

export default function BrandLogoMark({
  sources = [],
  alt,
  fallbackLabel = 'F',
  wrapperClassName = '',
  imageClassName = '',
  fallbackClassName = '',
  loading = 'lazy',
}) {
  const candidates = useMemo(() => uniqueMediaCandidates([...(Array.isArray(sources) ? sources : [sources]), '/logo.png']), [sources]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [candidates.join('||')]);

  const currentSrc = candidates[sourceIndex] || '';

  const handleError = () => {
    setSourceIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : candidates.length));
  };

  return (
    <div className={wrapperClassName}>
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          className={imageClassName}
          loading={loading}
          referrerPolicy="no-referrer"
          onError={handleError}
        />
      ) : (
        <span className={fallbackClassName}>{fallbackLabel}</span>
      )}
    </div>
  );
}
