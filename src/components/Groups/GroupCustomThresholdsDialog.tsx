import { useState, useEffect } from 'react';
import { Plus, Target, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  useGroupCustomThresholds, 
  GroupCustomThreshold 
} from '@/hooks/useGroupCustomThresholds';
import { Group } from '@/hooks/useGroups';
import { GroupThresholdDialog } from './GroupThresholdDialog';

interface GroupCustomThresholdsDialogProps {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupCustomThresholdsDialog({ group, open, onOpenChange }: GroupCustomThresholdsDialogProps) {
  const { thresholds, loading, deleteThreshold } = useGroupCustomThresholds(group.id);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<GroupCustomThreshold | undefined>();

  const handleEdit = (threshold: GroupCustomThreshold) => {
    setEditingThreshold(threshold);
    setThresholdDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingThreshold(undefined);
    setThresholdDialogOpen(true);
  };

  const handleCloseThresholdDialog = () => {
    setThresholdDialogOpen(false);
    setEditingThreshold(undefined);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Seuils Personnalisés - {group.name}
            </DialogTitle>
            <DialogDescription>
              Gérez les seuils personnalisés pour ce groupe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Seuils du groupe</h3>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un seuil
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : thresholds.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun seuil personnalisé</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Créez des seuils personnalisés pour ce groupe afin de mieux surveiller la qualité de l'air
                  </p>
                  <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer le premier seuil
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {thresholds.map((threshold) => (
                  <Card key={threshold.id} className="relative">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: threshold.color }}
                          />
                          {threshold.name}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(threshold)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteThreshold(threshold.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardTitle>
                      <Badge variant={threshold.enabled ? "default" : "secondary"} className="w-fit">
                        {threshold.enabled ? "Actif" : "Inactif"}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {threshold.pm1_min !== undefined || threshold.pm1_max !== undefined ? (
                        <div className="text-sm">
                          <span className="font-medium">PM1:</span>{" "}
                          {threshold.pm1_min || 0} - {threshold.pm1_max || "∞"} μg/m³
                        </div>
                      ) : null}
                      {threshold.pm25_min !== undefined || threshold.pm25_max !== undefined ? (
                        <div className="text-sm">
                          <span className="font-medium">PM2.5:</span>{" "}
                          {threshold.pm25_min || 0} - {threshold.pm25_max || "∞"} μg/m³
                        </div>
                      ) : null}
                      {threshold.pm10_min !== undefined || threshold.pm10_max !== undefined ? (
                        <div className="text-sm">
                          <span className="font-medium">PM10:</span>{" "}
                          {threshold.pm10_min || 0} - {threshold.pm10_max || "∞"} μg/m³
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GroupThresholdDialog
        group={group}
        threshold={editingThreshold}
        open={thresholdDialogOpen}
        onOpenChange={handleCloseThresholdDialog}
      />
    </>
  );
}