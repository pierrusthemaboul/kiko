// lib/supabase/supabaseClients.ts
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const extra: any = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
const supabaseUrl: string | undefined = extra.supabaseUrl;
const supabaseKey: string | undefined = extra.supabaseKey;

console.log("[supabaseClients] url set:", !!supabaseUrl, "key set:", !!supabaseKey);
if (!supabaseUrl) throw new Error("supabaseUrl is required.");
if (!supabaseKey) throw new Error("supabaseKey is required.");

export const supabase = createClient(supabaseUrl, supabaseKey);
