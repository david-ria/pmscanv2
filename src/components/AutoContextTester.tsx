import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, User, Bike, Home, Trash2 } from 'lucide-react';

interface AutoContextTesterProps {
  className?: string;
}

export function AutoContextTester({ className }: AutoContextTesterProps) {
  const [currentState, setCurrentState] = React.useState<string>('');

  React.useEffect(() => {
    const state = localStorage.getItem('mock_movement_state') || '';
    setCurrentState(state);
  }, []);

  const setMockState = (state: string) => {
    if (state) {
      localStorage.setItem('mock_movement_state', state);
    } else {
      localStorage.removeItem('mock_movement_state');
    }
    setCurrentState(state);
    console.log('🧪 Mock movement state set to:', state || 'none');
  };

  const setMockWifi = (ssid: string) => {
    if (ssid) {
      localStorage.setItem('mock_wifi_ssid', ssid);
    } else {
      localStorage.removeItem('mock_wifi_ssid');
    }
    console.log('📶 Mock WiFi SSID set to:', ssid || 'none');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          🧪 AutoContext Testing
          {currentState && (
            <Badge variant="outline" className="text-xs">
              {currentState}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Movement States */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Simulate Movement:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={currentState === 'driving' ? 'default' : 'outline'}
              onClick={() => setMockState('driving')}
              className="text-xs"
            >
              <Car className="h-3 w-3 mr-1" />
              Driving
            </Button>
            <Button
              size="sm"
              variant={currentState === 'walking' ? 'default' : 'outline'}
              onClick={() => setMockState('walking')}
              className="text-xs"
            >
              <User className="h-3 w-3 mr-1" />
              Walking
            </Button>
            <Button
              size="sm"
              variant={currentState === 'cycling' ? 'default' : 'outline'}
              onClick={() => setMockState('cycling')}
              className="text-xs"
            >
              <Bike className="h-3 w-3 mr-1" />
              Cycling
            </Button>
            <Button
              size="sm"
              variant={currentState === '' ? 'default' : 'outline'}
              onClick={() => setMockState('')}
              className="text-xs"
            >
              <Home className="h-3 w-3 mr-1" />
              Stationary
            </Button>
          </div>
        </div>

        {/* WiFi States */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Simulate WiFi:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMockWifi('HomeWiFi')}
              className="text-xs"
            >
              🏠 Set Home WiFi
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMockWifi('WorkWiFi')}
              className="text-xs"
            >
              🏢 Set Work WiFi
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMockWifi('')}
              className="text-xs"
            >
              📵 No WiFi
            </Button>
          </div>
        </div>

        {/* Clear All */}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            setMockState('');
            setMockWifi('');
          }}
          className="text-xs w-full"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear All Mock Data
        </Button>

        <p className="text-xs text-muted-foreground">
          💡 Change movement states to test autocontext behavior. Check console for debug logs.
        </p>
      </CardContent>
    </Card>
  );
}