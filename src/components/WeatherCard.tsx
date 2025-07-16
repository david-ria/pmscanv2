import React from 'react';
import { BaseCard } from '@/components/shared/BaseCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Sun, CloudRain, CloudSnow, Eye, Wind, Droplets, Thermometer, Gauge } from 'lucide-react';

interface WeatherData {
  id: string;
  temperature: number;
  humidity: number;
  pressure: number;
  weather_main: string;
  weather_description: string;
  wind_speed?: number;
  wind_direction?: number;
  visibility?: number;
  timestamp: string;
}

interface WeatherCardProps {
  weatherData: WeatherData | null;
  className?: string;
}

const getWeatherIcon = (weatherMain: string) => {
  switch (weatherMain.toLowerCase()) {
    case 'clear':
      return <Sun className="h-8 w-8 text-yellow-500" />;
    case 'clouds':
      return <Cloud className="h-8 w-8 text-gray-500" />;
    case 'rain':
    case 'drizzle':
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    case 'snow':
      return <CloudSnow className="h-8 w-8 text-blue-200" />;
    default:
      return <Cloud className="h-8 w-8 text-gray-500" />;
  }
};

const getWeatherBackground = (weatherMain: string) => {
  switch (weatherMain.toLowerCase()) {
    case 'clear':
      return 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20';
    case 'clouds':
      return 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-900/20';
    case 'rain':
    case 'drizzle':
      return 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20';
    case 'snow':
      return 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900/20';
    default:
      return 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-900/20';
  }
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ weatherData, className = '' }) => {
  if (!weatherData) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No weather data available</div>
        </CardContent>
      </Card>
    );
  }

  const backgroundClass = getWeatherBackground(weatherData.weather_main);

  return (
    <Card className={`${backgroundClass} ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getWeatherIcon(weatherData.weather_main)}
          Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{Math.round(weatherData.temperature)}°C</div>
            <div className="text-sm text-muted-foreground capitalize">
              {weatherData.weather_description}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Droplets className="h-3 w-3 text-blue-500" />
            <span>{weatherData.humidity}% humidity</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Gauge className="h-3 w-3 text-purple-500" />
            <span>{weatherData.pressure} hPa</span>
          </div>
          
          {weatherData.wind_speed && (
            <div className="flex items-center gap-1">
              <Wind className="h-3 w-3 text-green-500" />
              <span>{weatherData.wind_speed.toFixed(1)} m/s</span>
            </div>
          )}
          
          {weatherData.visibility && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-gray-500" />
              <span>{weatherData.visibility.toFixed(1)} km</span>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          Updated: {new Date(weatherData.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};