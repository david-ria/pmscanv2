
import { cn } from '@/lib/utils';

/**
 * Optimized CSS utility functions for common patterns
 */

// Common layout classes
export const layoutClasses = {
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  gridCenter: 'grid place-items-center',
  layoutStable: 'min-h-screen flex flex-col',
  contentGrid: 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
} as const;

// Common spacing classes
export const spacingClasses = {
  spaceYResponsive: 'space-y-2 sm:space-y-4',
  paddingResponsive: 'p-4 sm:p-6 lg:p-8',
  marginResponsive: 'm-4 sm:m-6 lg:m-8',
} as const;

// Common interaction classes
export const interactionClasses = {
  hoverScale: 'transition-transform duration-200 hover:scale-105',
  interactiveHover: 'transition-all duration-200 hover:-translate-y-0.5',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
} as const;

// Common card classes
export const cardClasses = {
  elevated: 'card-elevated',
  airQuality: 'air-quality-card',
  interactive: cn(interactionClasses.interactiveHover, 'cursor-pointer'),
} as const;

// Common form classes
export const formClasses = {
  input: 'form-input',
  label: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  error: 'text-sm font-medium text-destructive',
} as const;

// Helper function to combine layout utilities
export const createLayoutClass = (
  type: keyof typeof layoutClasses,
  additional?: string
) => {
  return cn(layoutClasses[type], additional);
};

// Helper function to create responsive spacing
export const createSpacingClass = (
  type: keyof typeof spacingClasses,
  additional?: string
) => {
  return cn(spacingClasses[type], additional);
};

// Helper function to create interactive elements
export const createInteractiveClass = (
  type: keyof typeof interactionClasses,
  additional?: string
) => {
  return cn(interactionClasses[type], additional);
};
