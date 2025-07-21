import * as React from 'react';

// Mobile breakpoint aligned with Tailwind's 'md' breakpoint
const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect mobile screen size
 * 
 * Uses matchMedia API for better performance and consistency
 * with CSS media queries. Returns true for screens smaller than 768px.
 * 
 * @returns {boolean} true if screen width is less than 768px
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    // Create media query list for mobile detection
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Handler for media query changes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Listen for changes and set initial value
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // Cleanup listener on unmount
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Return false during SSR/initial render to prevent hydration mismatch
  return !!isMobile;
}
