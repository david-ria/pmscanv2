import { supabase } from '@/integrations/supabase/client';
import { shouldInitExternalServices } from '@/utils/environmentDetection';

interface InvokeOptions {
  body?: any;
  headers?: Record<string, string>;
}

export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options?: InvokeOptions
): Promise<{ data: T | null; error: any | null }> {
  if (!shouldInitExternalServices()) {
    return {
      data: null,
      error: { message: 'Preview Mode: external services disabled' },
    };
  }
  return supabase.functions.invoke(functionName, options as any);
}
