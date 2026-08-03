import React, { useState, useRef, useEffect, useMemo } from 'react';
import { buildSrcSet, getOptimizedMediaUrl, uniqueMediaCandidates } from '@/lib/media';

function OptimizedImage({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  objectFit = 'cover',
  lazy = true,
  priority = false,
  fallbackIcon = null,
  fallbackSrcs = [],
  onLoad: externalOnLoad,
  sizes,
  widths = [320, 480, 640, 768, 960, 1200],
  quality = 70,
  width,
  height,
  imgClassName = '',
}) {
  const candidates = useMemo(
    () => uniqueMediaCandidates([src, ...(Array.isArray(fallbackSrcs) ? fallbackSrcs : [fallbackSrcs])]),
    [src, fallbackSrcs],
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);
  const activeSrc = candidates[sourceIndex] || '';

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [activeSrc]);

  useEffect(() => {
    setSourceIndex(0);
    setLoaded(false);
    setError(false);
  }, [candidates.join('||')]);

  const srcSet = useMemo(() => buildSrcSet(activeSrc, widths, { quality }), [activeSrc, widths, quality]);
  const resolvedSrc = useMemo(
    () => getOptimizedMediaUrl(activeSrc, { width: priority ? 1200 : 960, quality }),
    [activeSrc, priority, quality],
  );

  const handleLoad = () => {
    setLoaded(true);
    if (externalOnLoad) externalOnLoad();
  };

  const handleError = () => {
    if (sourceIndex + 1 < candidates.length) {
      setSourceIndex((prev) => prev + 1);
      setLoaded(false);
      return;
    }

    setError(true);
  };

  if (!activeSrc || error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${containerClassName}`.trim()}>
        {fallbackIcon || (
          <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`.trim()}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
      <img
        ref={imgRef}
        src={resolvedSrc}
        srcSet={srcSet || undefined}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : lazy ? 'lazy' : undefined}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ease-in-out ${loaded ? 'opacity-100' : 'opacity-0'} ${className} ${imgClassName}`.trim()}
        style={{ objectFit }}
      />
    </div>
  );
}

export default React.memo(OptimizedImage);
