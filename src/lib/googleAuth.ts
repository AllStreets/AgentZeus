import { createServiceClient } from "@/lib/supabase";

export async function getGoogleToken(service: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", "default")
    .eq("service", service)
    .single();

  if (!data) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() - Date.now() < 60_000 : false;

  if (!isExpired) return data.access_token;

  // Refresh
  if (!data.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const tokens = await res.json();
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase.from("user_integrations").update({
    access_token: tokens.access_token,
    expires_at: newExpiry,
    updated_at: new Date().toISOString(),
  }).eq("user_id", "default").eq("service", service);

  return tokens.access_token;
}

export async function disconnectService(service: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("user_integrations").delete().eq("user_id", "default").eq("service", service);
}

export async function isServiceConnected(service: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_integrations")
    .select("id")
    .eq("user_id", "default")
    .eq("service", service)
    .single();
  return !!data;
}
