import { Shield, Zap, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGroups } from '@/hooks/useGroups';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface GroupSubscriptionDialogProps {
  group: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const accessLevels = [
  {
    id: 'free' as const,
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
    id: 'premium' as const,
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
    id: 'enterprise' as const,
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
  const [currentTier, setCurrentTier] = useState<'free' | 'premium' | 'enterprise'>(
    group?.subscription_tier || 'free'
  );
  const { updateGroup } = useGroups();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLevelChange = async (newTier: 'free' | 'premium' | 'enterprise') => {
    if (newTier === currentTier || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateGroup(group.id, { subscription_tier: newTier });
      setCurrentTier(newTier); // Update local state immediately
      toast({
        title: "Access level updated",
        description: `Group access level changed to ${accessLevels.find(l => l.id === newTier)?.level}`,
      });
    } catch (error) {
      toast({
        title: "Failed to update access level",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Group Access Levels
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            Select an access level to change group functionalities
          </p>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {accessLevels.map((level) => {
            const isCurrent = level.id === currentTier;
            return (
              <Card 
                key={level.id} 
                className={`relative transition-all duration-200 ${
                  isCurrent 
                    ? 'border-2 border-primary shadow-lg' 
                    : 'border hover:border-accent hover:shadow-md cursor-pointer'
                }`}
                onClick={() => !isCurrent && handleLevelChange(level.id)}
              >
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Current
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-3">
                  <div className={`w-12 h-12 mx-auto rounded-lg ${level.bgColor} flex items-center justify-center mb-2`}>
                    <level.icon className={`h-6 w-6 ${level.color}`} />
                  </div>
                  <CardTitle className="text-lg">{level.level}</CardTitle>
                  <h3 className="text-sm font-semibold">{level.name}</h3>
                  <p className="text-xs text-muted-foreground">{level.description}</p>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    {level.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        <span className="text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {!isCurrent && (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled={isUpdating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLevelChange(level.id);
                      }}
                    >
                      {isUpdating ? 'Updating...' : 'Select Level'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}