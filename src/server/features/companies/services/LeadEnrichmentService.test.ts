import { describe, it, expect } from "vitest";
import { detectFromHtml, parseLinkedinCompany, samePlace } from "./LeadEnrichmentService";

describe("detectFromHtml", () => {
  it("acha plataforma, rastreamento, WhatsApp e redes", () => {
    const html = `<link href="/wp-content/x.css"><script src="https://www.googletagmanager.com/gtag/js?id=G-ABC"></script>
      <a href="https://wa.me/5511999">Fale</a><form action="/c"></form>
      <a href="https://www.instagram.com/lagunecosmeticos">ig</a>
      <a href="https://br.linkedin.com/company/lagune-cosmetics">in</a>`;
    const d = detectFromHtml(html);
    expect(d.tech).toEqual(["WordPress"]);
    expect(d.analytics).toBe(true);
    expect(d.metaPixel).toBe(false);
    expect(d.whatsapp).toBe(true);
    expect(d.form).toBe(true);
    expect(d.instagram).toBe("https://www.instagram.com/lagunecosmeticos");
    expect(d.linkedin).toBe("https://br.linkedin.com/company/lagune-cosmetics");
  });
});

describe("samePlace", () => {
  it("aceita o perfil da própria empresa e recusa outro", () => {
    expect(samePlace("LAGUNE COSMETICS", "Lagune Cosmetics Indústria, Comércio")).toBe(true);
    expect(samePlace("WB BEAUTY TERCEIRIZACAO DE COSMETICOS", "WB Beauty Terceirização")).toBe(true);
    expect(samePlace("Clínica Auxilium Vita", "Clínica Viavita")).toBe(false);
  });
});

describe("parseLinkedinCompany", () => {
  it("lê os campos com nomes alternativos e ignora vazios", () => {
    const d = parseLinkedinCompany({ name: "Lagune", followers: 1043, company_size: "11-50", industries: ["Cosméticos"], headquarters: "" });
    expect(d).toEqual({ nome: "Lagune", seguidores: "1043", funcionariosNoLinkedin: null, porte: "11-50", setor: "Cosméticos", sede: null, fundada: null });
    expect(parseLinkedinCompany(null)).toBeNull();
  });
});
