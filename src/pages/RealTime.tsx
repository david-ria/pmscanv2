
import { useState, useEffect, lazy, Suspense, startTransition } from 'react';
import { OptimizedPlaceholder } from '@/components/shared/OptimizedPlaceholder';

// Lazy load the heavy content - this keeps the main bundle minimal
const RealTimeContent = lazy(() => import('@/components/RealTime/RealTimeContent'));

export default function RealTime() {
  // Granular loading states for optimal performance
  const [initialized, setInitialized] = useState(false);
  const [uiReady, setUiReady] = useState(false);

  // Defer initialization to allow immediate paint of placeholder
  useEffect(() => {
    // Use startTransition to keep the initial render non-blocking
    startTransition(() => {
      setInitialized(true);
    });
  }, []);

  // Second phase: defer heavy UI loading until browser is idle after LCP
  useEffect(() => {
    if (initialized) {
      // Use requestIdleCallback to defer heavy work until after critical rendering
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          startTransition(() => {
            setUiReady(true);
          });
        }, { timeout: 2000 }); // Fallback timeout for slower devices
      } else {
        // Fallback for browsers without requestIdleCallback (older Safari)
        setTimeout(() => {
          startTransition(() => {
            setUiReady(true);
          });
        }, 0);
      }
    }
  }, [initialized]);

  const handleUiReady = () => {
    // Additional callback for when the heavy content is fully loaded
    // Can be used for analytics or further optimizations
  };

  // Step 1: Show immediate placeholder (minimal JS, fast paint)
  if (!initialized) {
    return <OptimizedPlaceholder />;
  }

  // Step 2: Show placeholder while heavy content loads
  if (!uiReady) {
    return (
      <OptimizedPlaceholder 
        description="Initialisation des composants…"
      />
    );
  }

  // Step 3: Load the heavy content with Suspense boundary
  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6">
      <Suspense 
        fallback={
          <OptimizedPlaceholder 
            description="Chargement de l'interface…"
          />
        }
      >
        <RealTimeContent onUiReady={handleUiReady} />
      </Suspense>
    </div>
  );
}

