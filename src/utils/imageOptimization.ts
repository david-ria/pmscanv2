/**
 * Image optimization utilities for better performance
 */

// Image cache for frequently used images
const imageCache = new Map<string, HTMLImageElement>();

// Preload critical images
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) {
      resolve(imageCache.get(src)!);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

// Lazy load images with intersection observer
export const createLazyImageObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void
): IntersectionObserver => {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
  });
};

// Optimize image size based on device
export const getOptimizedImageSrc = (
  baseSrc: string,
  width: number,
  height: number
): string => {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const optimizedWidth = Math.round(width * Math.min(devicePixelRatio, 2));
  const optimizedHeight = Math.round(height * Math.min(devicePixelRatio, 2));
  
  // If it's a standard image, return as-is
  if (!baseSrc.includes('w=') && !baseSrc.includes('h=')) {
    return baseSrc;
  }
  
  // For API-based images that support resizing
  return baseSrc
    .replace(/w=\d+/, `w=${optimizedWidth}`)
    .replace(/h=\d+/, `h=${optimizedHeight}`);
};

// Get optimized image attributes
export const getOptimizedImageProps = (
  src: string,
  alt: string,
  className?: string
) => ({
  src,
  alt,
  className,
  loading: 'lazy' as const,
  decoding: 'async' as const,
  style: {
    contentVisibility: 'auto',
    containIntrinsicSize: '1px 400px'
  }
});