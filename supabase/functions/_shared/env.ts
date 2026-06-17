export interface IngestEnv {
  secret: string;
  userId: string;
  supabaseUrl: string;
  serviceRoleKey: string;
}

const FIELDS: Array<[keyof IngestEnv, string]> = [
  ["secret", "LIVAL_INGEST_SECRET"],
  ["userId", "LIVAL_USER_ID"],
  ["supabaseUrl", "SUPABASE_URL"],
  ["serviceRoleKey", "SUPABASE_SERVICE_ROLE_KEY"],
];

export function readEnv(get: (k: string) => string | undefined): IngestEnv {
  const out: Partial<IngestEnv> = {};
  const missing: string[] = [];
  for (const [field, envName] of FIELDS) {
    const v = get(envName);
    if (!v) missing.push(envName);
    else out[field] = v;
  }
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
  return out as IngestEnv;
}
