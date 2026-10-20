import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sessão da Fullweb no modo self-hosted: cookie `openseo_session` assinado com
 * HMAC-SHA256 (segredo BETTER_AUTH_SECRET). Antes o servidor só olhava se o
 * cookie existia, então qualquer valor entrava.
 * Usuários vêm do Chatwoot (login único); a senha de admin fica como reserva.
 */
export interface FullwebSession {
  uid: string;
  name: string;
  email: string;
  accountId: number | null;
  role: "admin" | "administrator" | "agent";
  src: "chatwoot" | "admin";
  exp: number;
}

export const CHATWOOT_URL = process.env.CHATWOOT_URL || "https://chat.chathook.com.br";
const MAX_AGE = 30 * 24 * 3600;

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET não configurado");
  return s;
}

const hmac = (body: string) => createHmac("sha256", secret()).update(body).digest();

export function signSession(p: Omit<FullwebSession, "exp">): string {
  const payload: FullwebSession = { ...p, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body).toString("base64url")}`;
}

export function readSession(cookieHeader: string | null): FullwebSession | null {
  if (!cookieHeader || cookieHeader.includes("openseo_signed_out=true")) return null;
  const m = cookieHeader.match(/(?:^|;\s*)openseo_session=([^;]+)/);
  if (!m) return null;
  const [body, sig] = m[1].split(".");
  if (!body || !sig) return null;
  const expected = hmac(body);
  const got = Buffer.from(sig, "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as FullwebSession;
    return p.exp && p.exp > Date.now() / 1000 ? p : null;
  } catch {
    return null;
  }
}

export const sessionCookie = (value: string) =>
  `openseo_session=${value}; Path=/; SameSite=Lax; Secure; Max-Age=${MAX_AGE}; HttpOnly`;

export const clearSignedOutCookie = "openseo_signed_out=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly";

type CwAccount = { id: number; name?: string; role?: string };
type CwUser = { id: number; name: string; email: string; accounts?: CwAccount[] };

/** Valida a sessão que o Chatwoot já tem no navegador (cookie cw_d_session_info). */
export async function chatwootUserFromTokens(t: Record<string, unknown>): Promise<CwUser | null> {
  const token = t["access-token"];
  const client = t.client;
  const uid = t.uid;
  if (typeof token !== "string" || typeof client !== "string" || typeof uid !== "string") return null;
  const r = await fetch(`${CHATWOOT_URL}/api/v1/profile`, {
    headers: { "access-token": token, client, uid, "token-type": "Bearer" },
  });
  if (!r.ok) return null;
  return (await r.json()) as CwUser;
}

/** Acesso direto (fora do Chatwoot) com o mesmo e-mail e senha do Chatwoot. */
export async function chatwootSignIn(email: string, password: string): Promise<CwUser | null> {
  const r = await fetch(`${CHATWOOT_URL}/auth/sign_in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { data?: CwUser };
  return j.data || null;
}

export function sessionFromChatwoot(u: CwUser, preferredAccountId?: number | null): string {
  const accounts = u.accounts || [];
  const acc = accounts.find((a) => a.id === preferredAccountId) || accounts[0] || null;
  return signSession({
    uid: `cw-${u.id}`,
    name: u.name,
    email: u.email,
    accountId: acc?.id ?? null,
    role: acc?.role === "administrator" ? "administrator" : "agent",
    src: "chatwoot",
  });
}
