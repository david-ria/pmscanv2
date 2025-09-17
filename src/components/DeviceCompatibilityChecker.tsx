import React, { useEffect, useState } from 'react';
import { useAndroidApiLevel } from '../hooks/useAndroidApiLevel';
import { AndroidPermissionManager } from '../services/androidPermissions';
import { deviceLogger } from '../services/deviceLogger';
import { MtuInfoDisplay } from './MtuInfoDisplay';
import { BleDebugControl } from './BleDebugControl';
import { BleDebugDiagnostic } from './BleDebugDiagnostic';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface CompatibilityCheck {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
}

interface DeviceCompatibilityCheckerProps {
  isConnected?: boolean;
}

export const DeviceCompatibilityChecker: React.FC<DeviceCompatibilityCheckerProps> = ({ 
  isConnected = false 
}) => {
  const androidInfo = useAndroidApiLevel();
  const [compatibility, setCompatibility] = useState<CompatibilityCheck | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkCompatibility = async () => {
      if (!androidInfo.isAndroid) return;

      deviceLogger.log('info', 'ble', 'Starting device compatibility check', androidInfo);
      
      try {
        const result = await AndroidPermissionManager.checkPermissionCompatibility();
        setCompatibility(result);
        
        deviceLogger.log(
          result.compatible ? 'info' : 'warn',
          'ble',
          `Compatibility check complete: ${result.compatible ? 'compatible' : 'issues found'}`,
          androidInfo,
          { issues: result.issues.length, recommendations: result.recommendations.length }
        );
      } catch (error) {
        deviceLogger.log('error', 'ble', 'Compatibility check failed', androidInfo, { error });
      }
    };

    checkCompatibility();
  }, [androidInfo]);

  if (!androidInfo.isAndroid) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Device compatibility checker is only available on Android devices.
        </AlertDescription>
      </Alert>
    );
  }

  const requiredPermissions = AndroidPermissionManager.getRequiredPermissions(androidInfo);
  const brandInstructions = AndroidPermissionManager.getBrandSpecificInstructions(androidInfo.brand);

  const getStatusIcon = (compatible: boolean) => {
    if (compatible) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getApiLevelBadge = () => {
    const { apiLevel } = androidInfo;
    if (apiLevel >= 34) return <Badge variant="default">Latest</Badge>;
    if (apiLevel >= 31) return <Badge variant="secondary">Modern</Badge>;
    if (apiLevel >= 29) return <Badge variant="outline">Supported</Badge>;
    return <Badge variant="destructive">Legacy</Badge>;
  };

  return (
    <div className="space-y-4" data-testid="compatibility-checker">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Device Information
            {compatibility && getStatusIcon(compatibility.compatible)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Brand:</span> {androidInfo.brand}
            </div>
            <div>
              <span className="font-medium">Model:</span> {androidInfo.model}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">API Level:</span>
              <span>{androidInfo.apiLevel}</span>
              {getApiLevelBadge()}
            </div>
            <div>
              <span className="font-medium">Version:</span> {androidInfo.version}
            </div>
          </div>

          {androidInfo.isKnownProblematicBrand && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This device brand may require additional power management configuration.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-1"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  View instructions
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Required Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requiredPermissions.map((perm, index) => (
              <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <Badge variant={perm.required ? "default" : "secondary"}>
                  {perm.required ? "Required" : "Optional"}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium text-sm">{perm.permission.split('.').pop()}</div>
                  <div className="text-xs text-muted-foreground">{perm.description}</div>
                  {perm.fallbackMessage && (
                    <div className="text-xs text-blue-600 mt-1">{perm.fallbackMessage}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(showDetails || compatibility?.issues.length) && (
        <Card>
          <CardHeader>
            <CardTitle>Device-Specific Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {brandInstructions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{androidInfo.brand} Device Setup:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {brandInstructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ul>
                </div>
              )}

              {compatibility?.issues.length && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Detected Issues:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {compatibility.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {compatibility?.recommendations.length && (
                <div>
                  <h4 className="font-medium mb-2 text-blue-600">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {compatibility.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && (
        <div className="grid gap-4">
          <BleDebugDiagnostic />
          <BleDebugControl />
          <MtuInfoDisplay isConnected={isConnected} />
        </div>
      )}
    </div>
  );
};