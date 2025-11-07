import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { Badge } from '@/components/ui/badge';

export function GroupStats() {
  const { activeGroup, isGroupMode } = useGroupSettings();

  if (!isGroupMode || !activeGroup) {
    return null; // Ne rien afficher si pas en mode groupe
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Group Statistics
          <Badge variant="outline" className="ml-auto">
            Coming Soon
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            Group statistics will be displayed here
          </p>
          <p className="text-xs mt-2 text-muted-foreground/70">
            This will show shared missions, average PM levels, and member activity
          </p>
        </div>
        
        {/* Placeholder pour futures stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 opacity-50 pointer-events-none">
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold">--</div>
            <div className="text-xs text-muted-foreground">Shared Missions</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold">--</div>
            <div className="text-xs text-muted-foreground">Avg PM2.5</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold">--</div>
            <div className="text-xs text-muted-foreground">Active Members</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
