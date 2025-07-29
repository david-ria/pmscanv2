import { memo } from 'react';

interface OptimizedPlaceholderProps {
  title?: string;
  description?: string;
  className?: string;
}

export const OptimizedPlaceholder = memo(({ 
  title = "AirSentinels", 
  description = "Chargement des données de qualité de l'air…",
  className = ""
}: OptimizedPlaceholderProps) => {
  return (
    <div className={`min-h-screen bg-background px-2 sm:px-4 py-4 sm:py-6 ${className}`}>
      <div className="text-center p-8">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <div className="mt-4 w-8 h-8 bg-primary/20 rounded-full animate-pulse mx-auto" />
      </div>
    </div>
  );
});

OptimizedPlaceholder.displayName = 'OptimizedPlaceholder';