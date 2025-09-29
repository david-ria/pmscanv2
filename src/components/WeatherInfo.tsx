import { Cloud, Sun, CloudRain, Snowflake } from 'lucide-react';
import { useWeatherDisplay } from '@/hooks/useWeatherDisplay';

interface WeatherInfoProps {
  weatherDataId?: string;
  className?: string;
  compact?: boolean;
}

const getWeatherIcon = (weatherMain: string) => {
  switch (weatherMain?.toLowerCase()) {
    case 'clear':
      return <Sun className="h-3 w-3 text-yellow-500" />;
    case 'clouds':
      return <Cloud className="h-3 w-3 text-gray-500" />;
    case 'rain':
    case 'drizzle':
      return <CloudRain className="h-3 w-3 text-blue-500" />;
    case 'snow':
      return <Snowflake className="h-3 w-3 text-blue-200" />;
    default:
      return <Cloud className="h-3 w-3 text-gray-500" />;
  }
};

export function WeatherInfo({ weatherDataId, className, compact = false }: WeatherInfoProps) {
  const { weatherData, weatherSummary, loading } = useWeatherDisplay(weatherDataId);

  // Debug logging
  console.log('🌤️ WeatherInfo - weatherDataId:', weatherDataId, 'loading:', loading, 'weatherData:', weatherData);

  if (!weatherDataId) {
    console.log('🌤️ WeatherInfo - No weatherDataId provided, returning null');
    return null;
  }

  if (loading) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Loading weather...
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Weather: {weatherDataId.slice(0, 8)}...
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        {getWeatherIcon(weatherData.weather_main)}
        <span>{weatherSummary}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      {getWeatherIcon(weatherData.weather_main)}
      <span>{weatherSummary}</span>
      <span>•</span>
      <span>{weatherData.humidity}% humidity</span>
    </div>
  );
}