import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { sessionPersistence } from '@/services/sessionPersistence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function AppLifecycleDebug() {
  const { 
    appState, 
    isVisible, 
    orientation, 
    isRestoring,
    persistSession,
    restoreSession,
    clearSession 
  } = useAppLifecycle();

  const sessionInfo = sessionPersistence.getSessionInfo();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 w-80 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">App Lifecycle Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span>State:</span>
          <Badge variant={appState === 'active' ? 'default' : 'secondary'}>
            {appState}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Visible:</span>
          <Badge variant={isVisible ? 'default' : 'secondary'}>
            {isVisible ? 'Yes' : 'No'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Orientation:</span>
          <Badge variant="outline" className="text-xs">
            {orientation || 'Unknown'}
          </Badge>
        </div>
        
        {isRestoring && (
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <Badge variant="destructive">Restoring...</Badge>
          </div>
        )}
        
        {sessionInfo && (
          <div className="mt-2 p-2 bg-muted rounded text-xs">
            <div>Session: {new Date(sessionInfo.timestamp).toLocaleTimeString()}</div>
            <div>Connection: {sessionInfo.connectionState}</div>
            <div>Recording: {sessionInfo.isGlobalRecording ? 'Yes' : 'No'}</div>
            <div>Background: {sessionInfo.isBackgroundRecording ? 'Yes' : 'No'}</div>
          </div>
        )}
        
        <div className="flex gap-1 mt-2">
          <Button size="sm" variant="outline" onClick={persistSession}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={restoreSession}>
            Restore
          </Button>
          <Button size="sm" variant="destructive" onClick={clearSession}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}