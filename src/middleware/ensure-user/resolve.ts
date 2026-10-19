import { env } from "cloudflare:workers";
import { getAuthMode, isHostedAuthMode } from "@/lib/auth-mode";
import { resolveCloudflareAccessContext } from "./cloudflareAccess";
import { resolveLocalNoAuthContext } from "./delegated";
import { resolveHostedContext } from "./hosted";
import type { EnsuredUserContext } from "./types";

import { AppError } from "@/server/lib/errors";

// Resolves the authenticated user for a request's headers across every auth
// mode. Shared by ensureUserMiddleware (server functions) and raw API routes,
// which can't use function middleware.
export async function resolveUserContextFromHeaders(
  headers: Headers,
): Promise<EnsuredUserContext> {
  const authMode = getAuthMode(env.AUTH_MODE);
  if (authMode === "local_noauth") {
    const cookieHeader = headers.get("cookie") || "";
    if (cookieHeader.includes("openseo_signed_out=true")) {
      throw new AppError("UNAUTHENTICATED");
    }
    return resolveLocalNoAuthContext();
  }
  if (isHostedAuthMode(authMode)) {
    return resolveHostedContext(headers);
  }
  return resolveCloudflareAccessContext(headers);
}
