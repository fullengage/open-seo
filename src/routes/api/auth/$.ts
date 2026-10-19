import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth, hasHostedAuthConfig } from "@/lib/auth";
import { isHostedAuthMode } from "@/lib/auth-mode";

async function handleAuthRequest(request: Request) {
  if (!isHostedAuthMode(env.AUTH_MODE)) {
    const url = new URL(request.url);
    const cookieHeader = request.headers.get("cookie") || "";
    const isSignedOut = cookieHeader.includes("openseo_signed_out=true");

    if (url.pathname.endsWith("/get-session")) {
      if (isSignedOut) {
        return Response.json(null);
      }
      return Response.json({
        user: {
          id: "local-admin",
          name: "Admin",
          email: "admin@localhost",
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        session: {
          id: "local-session",
          userId: "local-admin",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    if (url.pathname.endsWith("/sign-out")) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "openseo_signed_out=true; Path=/; SameSite=Lax; Max-Age=86400; HttpOnly",
        },
      });
    }

    if (
      url.pathname.endsWith("/sign-in") ||
      url.pathname.endsWith("/sign-in/email") ||
      url.pathname.endsWith("/sign-in/local")
    ) {
      return new Response(
        JSON.stringify({
          user: {
            id: "local-admin",
            name: "Admin",
            email: "admin@localhost",
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          session: {
            id: "local-session",
            userId: "local-admin",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie":
              "openseo_signed_out=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly",
          },
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
