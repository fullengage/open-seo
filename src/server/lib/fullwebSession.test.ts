import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = "segredo-de-teste";
});

describe("sessão assinada", async () => {
  const { signSession, readSession } = await import("./fullwebSession");
  const base = { uid: "cw-1", name: "Richard", email: "r@x.com", accountId: 1, role: "administrator" as const, src: "chatwoot" as const };

  it("aceita a sessão assinada", () => {
    const token = signSession(base);
    expect(readSession(`openseo_session=${token}`)?.uid).toBe("cw-1");
  });

  it("recusa cookie falso, adulterado ou após sair", () => {
    expect(readSession("openseo_session=qualquercoisa")).toBeNull();
    const token = signSession(base);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...base, uid: "admin", exp: 9999999999 })).toString("base64url");
    expect(readSession(`openseo_session=${forged}.${sig}`)).toBeNull();
    expect(readSession(`openseo_session=${body}.${sig}; openseo_signed_out=true`)).toBeNull();
    expect(readSession(null)).toBeNull();
  });
});

describe("contas liberadas", async () => {
  const { signSession, readSession, sessionFromChatwoot } = await import("./fullwebSession");
  it("conta da Fullweb (1) entra; conta de cliente (30) não", () => {
    const fullweb = signSession({ uid: "cw-1", name: "R", email: "r@x", accountId: 1, role: "administrator", src: "chatwoot" });
    const cliente = signSession({ uid: "cw-9", name: "M", email: "m@x", accountId: 30, role: "agent", src: "chatwoot" });
    expect(readSession(`openseo_session=${fullweb}`)).not.toBeNull();
    expect(readSession(`openseo_session=${cliente}`)).toBeNull();
    expect(sessionFromChatwoot({ id: 9, name: "M", email: "m@x", accounts: [{ id: 30, role: "administrator" }] })).toBeNull();
  });
});
