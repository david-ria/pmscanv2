import { useEffect } from 'react';
import { useCrashRecovery } from '@/hooks/useCrashRecovery';

function CrashRecoveryInitializer() {
  // The crash recovery hook handles all initialization logic
  useCrashRecovery();

  // This component doesn't render anything
  return null;
}

export default CrashRecoveryInitializer;
