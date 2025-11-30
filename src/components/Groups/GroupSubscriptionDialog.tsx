import { Shield, Zap, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGroups } from '@/hooks/useGroups';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface GroupSubscriptionDialogProps {
  group: {
    id: string;
    name: string;
    subscription_tier?: string;
    [key: string]: unknown;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getAccessLevels = (t: (key: string) => string) => [
  {
    id: 'free' as const,
    level: t('groups.subscription.levels.basic.level'),
    name: t('groups.subscription.levels.basic.name'),
    description: t('groups.subscription.levels.basic.description'),
    features: [
      t('groups.subscription.features.upTo10Members'),
      t('groups.subscription.features.basicMonitoring'),
      t('groups.subscription.features.standardLocations'),
      t('groups.subscription.features.basicEventTracking')
    ],
    icon: Shield,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
  },
  {
    id: 'premium' as const,
    level: t('groups.subscription.levels.enhanced.level'),
    name: t('groups.subscription.levels.enhanced.name'),
    description: t('groups.subscription.levels.enhanced.description'),
    features: [
      t('groups.subscription.features.upTo50Members'),
      t('groups.subscription.features.customThresholds'),
      t('groups.subscription.features.advancedAlerts'),
      t('groups.subscription.features.customEventTypes'),
      t('groups.subscription.features.enhancedAnalytics')
    ],
    icon: Zap,
    color: 'text-accent-foreground',
    bgColor: 'bg-accent/20',
  },
  {
    id: 'enterprise' as const,
    level: t('groups.subscription.levels.full.level'),
    name: t('groups.subscription.levels.full.name'),
    description: t('groups.subscription.levels.full.description'),
    features: [
      t('groups.subscription.features.unlimitedMembers'),
      t('groups.subscription.features.advancedCustomThresholds'),
      t('groups.subscription.features.realtimeAlerts'),
      t('groups.subscription.features.customEventManagement'),
      t('groups.subscription.features.advancedAnalyticsReporting'),
      t('groups.subscription.features.apiAccess'),
      t('groups.subscription.features.customIntegrations')
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
  const { t } = useTranslation();
  const [currentTier, setCurrentTier] = useState<'free' | 'premium' | 'enterprise'>(
    (group?.subscription_tier as 'free' | 'premium' | 'enterprise') || 'free'
  );
  const { updateGroup } = useGroups();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const accessLevels = getAccessLevels(t);

  const handleLevelChange = async (newTier: 'free' | 'premium' | 'enterprise') => {
    if (newTier === currentTier || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateGroup(group.id, { subscription_tier: newTier });
      setCurrentTier(newTier); // Update local state immediately
      toast({
        title: t('groups.subscription.levelUpdated'),
        description: t('groups.subscription.levelChangedTo', { 
          level: accessLevels.find(l => l.id === newTier)?.level 
        }),
      });
    } catch (error) {
      toast({
        title: t('groups.subscription.updateFailed'),
        description: t('groups.subscription.tryAgainLater'),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-xl font-bold text-center">
            {t('groups.subscription.title')}
          </ResponsiveDialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            {t('groups.subscription.selectLevel')}
          </p>
        </ResponsiveDialogHeader>

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
                    {t('groups.subscription.current')}
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
                      {isUpdating ? t('groups.subscription.updating') : t('groups.subscription.selectLevelButton')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}