import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth, hasHostedAuthConfig } from "@/lib/auth";
import { isHostedAuthMode } from "@/lib/auth-mode";

async function handleAuthRequest(request: Request) {
  if (!isHostedAuthMode(env.AUTH_MODE)) {
    const url = new URL(request.url);
    const cookieHeader = request.headers.get("cookie") || "";
    const hasSessionCookie = cookieHeader.includes("openseo_session=");
    const isSignedOut = cookieHeader.includes("openseo_signed_out=true");

    if (url.pathname.endsWith("/get-session")) {
      if (!hasSessionCookie || isSignedOut) {
        return Response.json(null);
      }
      return Response.json({
        user: {
          id: "local-admin",
          name: "Richard Wagner",
          email: "admin@localhost",
          role: "admin",
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        session: {
          id: "local-session",
          userId: "local-admin",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    if (url.pathname.endsWith("/sign-out")) {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.append(
        "Set-Cookie",
        "openseo_session=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly"
      );
      headers.append(
        "Set-Cookie",
        "openseo_signed_out=true; Path=/; SameSite=Lax; Max-Age=86400; HttpOnly"
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers,
      });
    }

    if (
      url.pathname.endsWith("/sign-in") ||
      url.pathname.endsWith("/sign-in/email") ||
      url.pathname.endsWith("/sign-in/local")
    ) {
      let bodyPassword = "";
      try {
        const body = (await request.json()) as { password?: string };
        bodyPassword = body?.password || "";
      } catch {
        // empty body
      }

      const configuredPassword =
        (Reflect.get(env, "ADMIN_PASSWORD") as string | undefined) ||
        process.env.ADMIN_PASSWORD;

      if (!configuredPassword || configuredPassword.trim() === "") {
        return Response.json(
          { error: { message: "ADMIN_PASSWORD não configurada no servidor." } },
          { status: 500 },
        );
      }

      if (!bodyPassword || bodyPassword.trim() === "") {
        return Response.json(
          { error: { message: "Senha não informada." } },
          { status: 401 },
        );
      }

      if (bodyPassword !== configuredPassword) {
        return Response.json(
          { error: { message: "Senha incorreta. Verifique e tente novamente." } },
          { status: 401 },
        );
      }

      const sessionToken = crypto.randomUUID();
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.append(
        "Set-Cookie",
        `openseo_session=${sessionToken}; Path=/; SameSite=Lax; Max-Age=2592000; HttpOnly`
      );
      headers.append(
        "Set-Cookie",
        "openseo_signed_out=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly"
      );

      return new Response(
        JSON.stringify({
          user: {
            id: "local-admin",
            name: "Richard Wagner",
            email: "admin@localhost",
            role: "admin",
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          session: {
            id: sessionToken,
            userId: "local-admin",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
        {
          status: 200,
          headers,
        },
      );
    }

    return Response.json(null);
  }

  if (!hasHostedAuthConfig()) {
    return new Response("Missing Better Auth hosted configuration", {
      status: 500,
    });
  }

  const auth = getAuth();
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
    },
  },
});
