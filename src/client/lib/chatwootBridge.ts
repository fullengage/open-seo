// Login único: dentro da aba do Chatwoot, o script do Chatwoot manda a sessão
// do usuário (AUTH_TOKEN). Trocamos por uma sessão assinada do OpenSEO e, se
// estávamos na tela de login, seguimos para o funil. Nada roda fora de iframe.
const CHATWOOT_ORIGIN = "https://chat.chathook.com.br";
type W = Window & { __fwChatwootBridge?: boolean };

if (typeof window !== "undefined" && window.parent !== window && !(window as W).__fwChatwootBridge) {
  (window as W).__fwChatwootBridge = true;

  window.addEventListener("message", async (e: MessageEvent) => {
    if (e.origin !== CHATWOOT_ORIGIN) return;
    const data = e.data as { type?: string; payload?: Record<string, unknown>; path?: string } | null;
    if (data?.type === "NAVIGATE" && typeof data.path === "string") {
      // "companies" é global; o resto é seção do último projeto aberto
      const projectId = window.localStorage.getItem("openseo:lastProjectId");
      const target =
        data.path === "companies" || !projectId ? "/companies" : `/p/${projectId}${data.path ? `/${data.path}` : ""}`;
      if (window.location.pathname !== target) window.location.href = target;
      return;
    }
    if (data?.type !== "AUTH_TOKEN" || !data.payload) return;
    try {
      const res = await fetch("/api/auth/chatwoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: data.payload, accountId: data.payload.account_id ?? null }),
      });
      if (res.ok && window.location.pathname === "/sign-in") {
        window.location.href = "/companies";
      }
    } catch {
      // sem sessão do Chatwoot: a tela de login continua disponível
    }
  });

  window.parent.postMessage({ type: "OPENSEO_READY" }, CHATWOOT_ORIGIN);
}

export {};
