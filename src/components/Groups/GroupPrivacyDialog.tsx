import { useState } from 'react';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Info, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GEOHASH_PRECISION_LEVELS, getGeohashPrecisionDescription } from '@/utils/geohash';

interface GroupPrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currentEnabled: boolean;
  currentPrecision: number;
  onSaved?: () => void;
}

export function GroupPrivacyDialog({
  open,
  onOpenChange,
  groupId,
  currentEnabled,
  currentPrecision,
  onSaved,
}: GroupPrivacyDialogProps) {
  const [enabled, setEnabled] = useState(currentEnabled);
  const [precision, setPrecision] = useState(currentPrecision);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('group_settings')
        .update({
          geohash_privacy_enabled: enabled,
          geohash_precision: precision,
        })
        .eq('group_id', groupId);

      if (error) throw error;

      toast({
        title: 'Privacy settings updated',
        description: `Geohash privacy ${enabled ? 'enabled' : 'disabled'}`,
      });

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update privacy settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const precisionOptions = [
    { value: GEOHASH_PRECISION_LEVELS.CITY, label: 'City Level', description: '~20km × 20km', recommended: false },
    { value: GEOHASH_PRECISION_LEVELS.DISTRICT, label: 'District Level', description: '~2.4km × 4.8km', recommended: false },
    { value: GEOHASH_PRECISION_LEVELS.NEIGHBORHOOD, label: 'Neighborhood Level', description: '~610m × 1.2km', recommended: true },
    { value: GEOHASH_PRECISION_LEVELS.BLOCK, label: 'Block Level', description: '~76m × 153m', recommended: false },
    { value: GEOHASH_PRECISION_LEVELS.BUILDING, label: 'Building Level', description: '~19m × 38m', recommended: false },
  ];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data Privacy Settings
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Control how location data is shared with other group members
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="privacy-toggle" className="text-base">
                Enable Geohash Privacy
              </Label>
              <p className="text-sm text-muted-foreground">
                Protect member locations in shared data
              </p>
            </div>
            <Switch
              id="privacy-toggle"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Privacy Explanation */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">How Geohash Privacy Works:</p>
              <ul className="list-disc ml-5 space-y-1 text-sm">
                <li><strong>Your own data:</strong> You always see exact GPS coordinates</li>
                <li><strong>Shared with group:</strong> Other members see aggregated location (geohash cell)</li>
                <li><strong>Minimum privacy:</strong> At least 3 measurements required per cell for statistics</li>
                <li><strong>Applied to:</strong> Group analysis, collaborative maps, and shared statistics</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Precision Selector */}
          {enabled && (
            <div className="space-y-3">
              <Label htmlFor="precision-select">Privacy Level (Precision)</Label>
              <Select 
                value={precision.toString()} 
                onValueChange={(value) => setPrecision(parseInt(value))}
              >
                <SelectTrigger id="precision-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {precisionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                        {option.recommended && (
                          <Badge variant="secondary" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getGeohashPrecisionDescription(precision)}
              </p>
            </div>
          )}

          {/* Privacy Status */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              {enabled ? (
                <>
                  <Lock className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Privacy Protected</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Exact GPS Shared</span>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              {enabled ? (
                <>
                  <p>✓ Members' exact locations are protected</p>
                  <p>✓ Data aggregated by {getGeohashPrecisionDescription(precision).toLowerCase()}</p>
                  <p>✓ Individual recordings remain private</p>
                </>
              ) : (
                <>
                  <p>⚠ Exact GPS coordinates are shared with group</p>
                  <p>⚠ Members can see precise locations</p>
                  <p>💡 Enable privacy for better data protection</p>
                </>
              )}
            </div>
          </div>

          {/* Example Visual */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              What members will see:
            </div>
            <div className="text-sm text-muted-foreground">
              {enabled ? (
                <p>
                  "Measurement from neighborhood area near [location name]" with geohash cell boundaries on map
                </p>
              ) : (
                <p>
                  "Measurement at 48.8566°N, 2.3522°E" with exact marker on map
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
