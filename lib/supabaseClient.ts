import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("URL =", supabaseUrl);
console.log("KEY =", supabaseAnonKey?.substring(0,20));
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Variables Supabase manquantes.");
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
