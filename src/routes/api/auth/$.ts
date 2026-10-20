import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth, hasHostedAuthConfig } from "@/lib/auth";
import { isHostedAuthMode } from "@/lib/auth-mode";
import {
  chatwootSignIn,
  chatwootUserFromTokens,
  clearSignedOutCookie,
  readSession,
  sessionCookie,
  sessionFromChatwoot,
  signSession,
} from "@/server/lib/fullwebSession";

function withSession(token: string, body: unknown): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", sessionCookie(token));
  headers.append("Set-Cookie", clearSignedOutCookie);
  return new Response(JSON.stringify(body), { status: 200, headers });
}

const unauthorized = (message: string) => Response.json({ error: { message } }, { status: 401 });

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return ((await request.json()) as Record<string, unknown>) || {};
  } catch {
    return {};
  }
}

async function handleLocalAuth(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.endsWith("/get-session")) {
    const s = readSession(request.headers.get("cookie"));
    if (!s) return Response.json(null);
    return Response.json({
      user: {
        id: s.uid,
        name: s.name,
        email: s.email,
        role: s.role === "agent" ? "user" : "admin",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: { id: s.uid, userId: s.uid, expiresAt: new Date(s.exp * 1000).toISOString() },
    });
  }

  if (path.endsWith("/sign-out")) {
    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append("Set-Cookie", "openseo_session=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly");
    headers.append("Set-Cookie", "openseo_signed_out=true; Path=/; SameSite=Lax; Max-Age=86400; HttpOnly");
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  // Login único dentro do Chatwoot: troca a sessão do Chatwoot por uma sessão do OpenSEO
  if (path.endsWith("/chatwoot")) {
    const body = await readJson(request);
    const tokens = (body.session as Record<string, unknown>) || {};
    const user = await chatwootUserFromTokens(tokens);
    if (!user) return unauthorized("Sessão do Chatwoot inválida.");
    const accountId = typeof body.accountId === "number" ? body.accountId : null;
    return withSession(sessionFromChatwoot(user, accountId), { ok: true, name: user.name });
  }

  if (path.endsWith("/sign-in") || path.endsWith("/sign-in/email") || path.endsWith("/sign-in/local")) {
    const body = await readJson(request);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!password.trim()) return unauthorized("Senha não informada.");

    // Usuário do Chatwoot (mesmo e-mail e senha)
    if (email && email !== "admin@localhost") {
      const user = await chatwootSignIn(email, password);
      if (!user) return unauthorized("E-mail ou senha incorretos.");
      return withSession(sessionFromChatwoot(user), { user: { id: `cw-${user.id}`, name: user.name, email: user.email } });
    }

    // Reserva: senha de admin (ponytail: some quando todos entrarem pelo Chatwoot)
    const configured = (Reflect.get(env, "ADMIN_PASSWORD") as string | undefined) || process.env.ADMIN_PASSWORD;
    if (!configured || !configured.trim()) {
      return Response.json({ error: { message: "ADMIN_PASSWORD não configurada no servidor." } }, { status: 500 });
    }
    if (password !== configured) return unauthorized("Senha incorreta. Verifique e tente novamente.");
    const token = signSession({
      uid: "local-admin",
      name: "Richard Wagner",
      email: "admin@localhost",
      accountId: 1,
      role: "admin",
      src: "admin",
    });
    return withSession(token, { user: { id: "local-admin", name: "Richard Wagner", email: "admin@localhost", role: "admin" } });
  }

  return Response.json(null);
}

async function handleAuthRequest(request: Request) {
  if (!isHostedAuthMode(env.AUTH_MODE)) return handleLocalAuth(request);

  if (!hasHostedAuthConfig()) {
    return new Response("Missing Better Auth hosted configuration", { status: 500 });
  }
  return getAuth().handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handleAuthRequest(request),
      POST: async ({ request }: { request: Request }) => handleAuthRequest(request),
    },
  },
});
