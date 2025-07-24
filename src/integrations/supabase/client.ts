import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://shydpfwuvnlzdzbubmgb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoeWRwZnd1dm5semR6YnVibWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzM1MjcsImV4cCI6MjA2NzU0OTUyN30.l_PAPBy1hlb4J-amKx7qPJ1lPIFseA9GznwL6CcyaQQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);