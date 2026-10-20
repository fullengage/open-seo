// Depois de um deploy, a aba aberta ainda chama os ids de server functions da
// versão antiga e recebe 404. Recarrega uma vez para pegar a versão nova.
// ponytail: só olha /_serverFn/ com 404; trava de 60 s para não entrar em loop.
const RELOAD_KEY = "openseo:stale-deploy-reload-at";

if (typeof window !== "undefined" && !(window as { __staleReloadPatched?: boolean }).__staleReloadPatched) {
  (window as { __staleReloadPatched?: boolean }).__staleReloadPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0];
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (response.status === 404 && url.includes("/_serverFn/")) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
      }
    } catch {
      // nunca quebrar a chamada original
    }
    return response;
  };
}

export {};
