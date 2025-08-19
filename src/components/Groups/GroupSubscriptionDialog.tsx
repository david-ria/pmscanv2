import { useState } from 'react';
import { Check, Crown, Users, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface GroupSubscriptionDialogProps {
  group: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '/month',
    description: 'Basic group features',
    features: [
      'Up to 10 members',
      'Basic monitoring',
      'Standard locations & activities',
      'Basic event tracking'
    ],
    limitations: [
      'No custom alarms',
      'No advanced analytics',
      'Limited member quota'
    ],
    icon: Users,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '€19',
    period: '/month',
    description: 'Advanced group monitoring',
    features: [
      'Up to 50 members',
      'Custom pollution thresholds',
      'Advanced automated alerts',
      'Custom event types',
      'Enhanced analytics',
      'Priority support'
    ],
    icon: Crown,
    color: 'text-accent-foreground',
    bgColor: 'bg-accent',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '€49',
    period: '/month',
    description: 'Full enterprise features',
    features: [
      'Unlimited members',
      'Advanced custom thresholds',
      'Real-time automated alerts',
      'Custom event management',
      'Advanced analytics & reporting',
      'API access',
      'Dedicated support',
      'Custom integrations'
    ],
    icon: Zap,
    color: 'text-primary-foreground',
    bgColor: 'bg-primary',
  },
];

export function GroupSubscriptionDialog({ 
  group, 
  open, 
  onOpenChange 
}: GroupSubscriptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const currentPlan = group?.subscription_tier || 'free';

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    
    try {
      // TODO: Implement Stripe integration for group subscriptions
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Upgrade Initiated",
        description: `Group subscription upgrade to ${plans.find(p => p.id === planId)?.name} is being processed.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Upgrade Failed",
        description: "Unable to process subscription upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Group Subscription Plans
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Choose the best plan for your group's monitoring needs
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            const canUpgrade = currentPlan === 'free' || 
              (currentPlan === 'premium' && plan.id === 'enterprise');

            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all hover:shadow-lg ${
                  plan.popular ? 'ring-2 ring-accent' : ''
                } ${isCurrentPlan ? 'bg-muted/50' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-lg ${plan.bgColor} flex items-center justify-center mb-2`}>
                    <Icon className={`h-6 w-6 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations && (
                    <div className="space-y-2 pt-2 border-t">
                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-start gap-2 opacity-60">
                          <span className="text-sm">✗ {limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4">
                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : canUpgrade ? (
                      <Button 
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={loading === plan.id}
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {loading === plan.id ? "Processing..." : `Upgrade to ${plan.name}`}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Not Available
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note:</strong> Group subscription changes will affect all group members. 
            Premium features will be available to all group participants.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}