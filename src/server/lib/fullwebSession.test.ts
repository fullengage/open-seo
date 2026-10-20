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
