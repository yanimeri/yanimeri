import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { username, password } = await req.json();
    if (typeof username !== "string" || typeof password !== "string" ||
        !/^[a-z0-9_]{3,20}$/.test(username) || password.length < 1) {
      return Response.json({ error: "Invalid username or password." }, { status: 400, headers: corsHeaders });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("id").eq("username", username).maybeSingle();
    if (profileError || !profile) {
      return Response.json({ error: "Invalid username or password." }, { status: 401, headers: corsHeaders });
    }

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.id);
    const email = userResult?.user?.email;
    if (userError || !email) {
      return Response.json({ error: "Invalid username or password." }, { status: 401, headers: corsHeaders });
    }

    const { data: authData, error: authError } = await publicClient.auth.signInWithPassword({ email, password });
    if (authError || !authData.session) {
      return Response.json({ error: "Invalid username or password." }, { status: 401, headers: corsHeaders });
    }

    return Response.json({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Unable to log in right now. Please try again." }, { status: 400, headers: corsHeaders });
  }
});
