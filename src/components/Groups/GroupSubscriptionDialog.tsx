import { Shield, Zap, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GroupSubscriptionDialogProps {
  group: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const accessLevels = [
  {
    id: 'free',
    level: 'Level 1',
    name: 'Basic Access',
    description: 'Standard group monitoring capabilities',
    features: [
      'Up to 10 members',
      'Basic monitoring',
      'Standard locations & activities',
      'Basic event tracking'
    ],
    icon: Shield,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
  },
  {
    id: 'premium',
    level: 'Level 2',
    name: 'Enhanced Access',
    description: 'Advanced group monitoring features',
    features: [
      'Up to 50 members',
      'Custom pollution thresholds',
      'Advanced automated alerts',
      'Custom event types',
      'Enhanced analytics'
    ],
    icon: Zap,
    color: 'text-accent-foreground',
    bgColor: 'bg-accent/20',
  },
  {
    id: 'enterprise',
    level: 'Level 3',
    name: 'Full Access',
    description: 'Complete enterprise functionality',
    features: [
      'Unlimited members',
      'Advanced custom thresholds',
      'Real-time automated alerts',
      'Custom event management',
      'Advanced analytics & reporting',
      'API access',
      'Custom integrations'
    ],
    icon: Crown,
    color: 'text-primary-foreground',
    bgColor: 'bg-primary/20',
  },
];

export function GroupSubscriptionDialog({ 
  group, 
  open, 
  onOpenChange 
}: GroupSubscriptionDialogProps) {
  const currentTier = group?.subscription_tier || 'free';
  const currentLevel = accessLevels.find(level => level.id === currentTier);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Group Access Level
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Current access level and available functionalities
          </p>
        </DialogHeader>

        <div className="mt-6">
          {currentLevel && (
            <Card className="relative border-2 border-primary">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                Current Level
              </Badge>
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 mx-auto rounded-lg ${currentLevel.bgColor} flex items-center justify-center mb-3`}>
                  <currentLevel.icon className={`h-8 w-8 ${currentLevel.color}`} />
                </div>
                <CardTitle className="text-2xl">{currentLevel.level}</CardTitle>
                <h3 className="text-lg font-semibold">{currentLevel.name}</h3>
                <p className="text-sm text-muted-foreground">{currentLevel.description}</p>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Available Features
                  </h4>
                  {currentLevel.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Note:</strong> Access levels are managed by administrators. 
              Contact support if you need access to additional features.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}