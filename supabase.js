// supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ezpyogcjwtgpxsoluqnh.supabase.co";  // <-- replace
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6cHlvZ2Nqd3RncHhzb2x1cW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODQ2MzUsImV4cCI6MjA3MDk2MDYzNX0.v19P5ldxwIlwqaZajrNjruRtXSUZSZCjM1yCIteXCCk";         // <-- replace

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
