import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, Link, Clock } from "lucide-react";
import { useGoogleFit } from "@/hooks/useGoogleFit";
import { cn } from "@/lib/utils";

interface GoogleFitIntegrationProps {
  onActivityDetected?: (activity: string) => void;
  className?: string;
}

export function GoogleFitIntegration({ onActivityDetected, className }: GoogleFitIntegrationProps) {
  const { 
    activities, 
    isLoading, 
    isAuthenticated, 
    connectGoogleFit, 
    syncActivities, 
    getRecentActivity 
  } = useGoogleFit();

  const recentActivity = getRecentActivity();

  const handleConnect = async () => {
    await connectGoogleFit();
  };

  const handleSync = async () => {
    await syncActivities();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}min`;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Google Fit Integration
          {isAuthenticated && (
            <Badge variant="secondary" className="text-xs">
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {!isAuthenticated ? (
          <Button 
            onClick={handleConnect} 
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <Link className="h-4 w-4 mr-2" />
            {isLoading ? "Connecting..." : "Connect Google Fit"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button 
                onClick={handleSync} 
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Sync Activities
              </Button>
            </div>

            {/* Recent Activity Display */}
            {recentActivity && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Activity</span>
                  <Badge variant="default" className="text-xs">
                    {recentActivity.activity_type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(recentActivity.duration_minutes)}
                  </div>
                  
                  {recentActivity.steps && (
                    <div>{recentActivity.steps.toLocaleString()} steps</div>
                  )}
                  
                  {recentActivity.distance_meters && (
                    <div>{(recentActivity.distance_meters / 1000).toFixed(1)}km</div>
                  )}
                </div>
                
                {onActivityDetected && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => onActivityDetected(recentActivity.activity_type)}
                  >
                    Use for Recording Context
                  </Button>
                )}
              </div>
            )}

            {/* Recent Activities List */}
            {activities.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Recent Activities</span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {activities.slice(0, 5).map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-center justify-between bg-muted/30 rounded p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {activity.activity_type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {formatDuration(activity.duration_minutes)}
                        </span>
                      </div>
                      
                      <span className="text-muted-foreground">
                        {new Date(activity.start_time).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activities.length === 0 && !isLoading && (
              <div className="text-center py-4">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No recent activities</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sync to see your Google Fit activities
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}