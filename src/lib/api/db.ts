// src/lib/api/db.ts
import { supabase } from '@/integrations/supabase/client';

export type Page<T> = { rows: T[]; nextCursor?: string };

export async function listRows<T = any>(
  table: string,
  { limit = 200, cursor }: { limit?: number; cursor?: string } = {}
): Promise<Page<T>> {
  let query = (supabase as any).from(table).select('*').order('created_at', { ascending: false }).limit(limit + 1);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw new Error(`DB list ${table} failed: ${error.message}`);

  const rows = (data ?? []) as T[];
  const hasMore = rows.length > limit;
  return {
    rows: hasMore ? rows.slice(0, limit) : rows,
    nextCursor: hasMore ? (rows[limit - 1] as any)?.created_at : undefined,
  };
}

export async function insertRow<T = any>(table: string, data: any): Promise<T> {
  const { data: result, error } = await (supabase as any)
    .from(table)
    .insert(data)
    .select()
    .single();
    
  if (error) throw new Error(`DB insert ${table} failed: ${error.message}`);
  return result as T;
}

export async function updateRow<T = any>(
  table: string, 
  id: string, 
  updates: any
): Promise<T> {
  const { data: result, error } = await (supabase as any)
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw new Error(`DB update ${table} failed: ${error.message}`);
  return result as T;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await (supabase as any).from(table).delete().eq('id', id);
  if (error) throw new Error(`DB delete ${table} failed: ${error.message}`);
}