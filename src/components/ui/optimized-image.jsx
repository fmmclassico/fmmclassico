import React, { useState, useRef, useEffect } from 'react';

/**
 * OptimizedImage - Professional image component with:
 * - Shimmer/pulse placeholder while loading
 * - Smooth fade-in when loaded
 * - Lazy loading for off-screen images
 * - Graceful error fallback
 */
export default function OptimizedImage({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  objectFit = 'cover',
  lazy = true,
  priority = false,
  fallbackIcon = null,
  onLoad: externalOnLoad,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  // If the image is already cached by the browser, it loads instantly
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    if (externalOnLoad) externalOnLoad();
  };

  const handleError = () => {
    setError(true);
  };

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${containerClassName}`}>
        {fallbackIcon || (
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Shimmer placeholder - visible until image loads */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : lazy ? 'lazy' : undefined}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ease-in-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{ objectFit }}
      />
    </div>
  );
}
