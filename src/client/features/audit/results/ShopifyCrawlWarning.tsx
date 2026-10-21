import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  CrawlerAccessForm,
  crawlerCredentialsQueryKey,
  saveCrawlerCredentialMutationKey,
} from "@/client/features/crawler-access/CrawlerAccessForm";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import { extractHostname } from "@/client/features/audit/shared";
import { startAudit } from "@/serverFunctions/audit";
import { listCrawlerCredentials } from "@/serverFunctions/crawlerAccess";
import {
  SHOPIFY_CRAWLER_ACCESS_DOC_URL,
  isCrawlerAccessExpired,
} from "@/shared/crawler-access";

/**
 * Shown instead of the generic crawl warnings when a Shopify storefront
 * throttled or refused the crawl. Shopify's own fix is a crawler-access
 * signature the merchant creates in admin, so the report asks for it here.
 *
 * The setup steps only show while the domain has no usable signature. Once
 * one is saved they collapse to a single line with the re-run button.
 */
export function ShopifyCrawlWarning({
  projectId,
  audit,
}: {
  projectId: string;
  audit: AuditResultsData["audit"];
}) {
  const navigate = useNavigate();
  const host = extractHostname(audit.startUrl);
  const usedCredentialId = audit.config.crawlerCredentialId;

  const credentialsQuery = useQuery({
    queryKey: crawlerCredentialsQueryKey,
    queryFn: () => listCrawlerCredentials(),
  });
  // A recorded credential id names the signature this crawl used, whatever
  // else is stored for the host on another project. If that one has expired
  // since (possibly mid-crawl), expiry is the explanation. Without a recorded
  // id, an expired row for the host is why the crawl went out unsigned.
  const expiredCredential = credentialsQuery.data?.find(
    (credential) =>
      (usedCredentialId
        ? credential.id === usedCredentialId
        : credential.host === host) &&
      isCrawlerAccessExpired(credential.expiresAt),
  );
  // Several projects can hold a live signature for this host; the one this
  // crawl used decides whether the crawl was signed.
  const liveCredentials = (credentialsQuery.data ?? []).filter(
    (credential) =>
      credential.host === host && !isCrawlerAccessExpired(credential.expiresAt),
  );
  const liveCredential =
    liveCredentials.find((credential) => credential.id === usedCredentialId) ??
    liveCredentials[0];
  // A re-run started mid-save would resolve the old signature, or none.
  const isSaving =
    useIsMutating({ mutationKey: saveCrawlerCredentialMutationKey }) > 0;

  const rerunMutation = useMutation({
    mutationFn: () =>
      startAudit({
        data: {
          projectId,
          startUrl: audit.startUrl,
          maxPages: audit.config.maxPages,
          lighthouseStrategy: audit.config.lighthouseStrategy,
          renderJavaScript: audit.config.renderJavaScript,
        },
      }),
    onSuccess: (result) => {
      void navigate({
        to: "/p/$projectId/audit",
        params: { projectId },
        search: { auditId: result.auditId, tab: "issues" },
      });
    },
  });

  const rerunButton = (
    <Button
      variant="outline"
      size="sm"
      pending={rerunMutation.isPending}
      disabled={isSaving}
      onClick={() => rerunMutation.mutate()}
    >
      {rerunMutation.isPending ? "Iniciando…" : "Rodar a auditoria de novo"}
    </Button>
  );

  // Until the list loads we can't tell which state applies; don't flash the
  // setup steps at someone who already has a signature.
  if (credentialsQuery.isPending) return null;

  if (liveCredential) {
    const signedAndStillLimited = liveCredential.id === usedCredentialId;
    return (
      <Alert variant={signedAndStillLimited ? "warning" : "success"}>
        {signedAndStillLimited ? <ShieldAlert /> : <ShieldCheck />}
        <AlertDescription className="text-foreground">
          {signedAndStillLimited ? (
            <>
              A Shopify limitou a análise mesmo com a sua assinatura. Para
              conferir se ela foi criada para <span className="font-mono">{host}</span>,
              cole-a de novo em{" "}
              <Link
                to="/p/$projectId/settings/integrations"
                params={{ projectId }}
              >
                Configurações do projeto
              </Link>
              . Se estiver certa, a Shopify ainda está limitando a loja: rode a
              auditoria mais tarde ou com menos páginas.
            </>
          ) : (
            <>
              Acesso de rastreador salvo para{" "}
              <span className="font-mono">{host}</span>. Rode a auditoria de
              novo para usá-lo.
            </>
          )}
        </AlertDescription>
        <div className="col-start-2 mt-2">{rerunButton}</div>
      </Alert>
    );
  }

  return (
    <Alert variant="warning">
      <ShieldAlert />
      <div className="min-w-0 space-y-3">
        {expiredCredential?.expiresAt ? (
          <>
            <AlertTitle>
              A assinatura da Shopify desta loja expirou.
            </AlertTitle>
            <p className="text-muted-foreground">
              Ela venceu em{" "}
              {new Date(expiredCredential.expiresAt).toLocaleDateString("pt-BR")}, então
              os acessos seguintes foram limitados pela Shopify. Assinaturas
              não são renovadas: crie uma nova no painel da Shopify e cole
              abaixo para substituir a antiga.
            </p>
          </>
        ) : (
          <>
            <AlertTitle>A Shopify limitou esta análise.</AlertTitle>
            <p className="text-muted-foreground">
              A Shopify limita robôs que ela não autorizou, então partes deste
              relatório estão faltando. Se a loja é sua, autorizar leva cerca de
              um minuto.
            </p>
          </>
        )}

        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            No painel da Shopify, vá em Loja virtual &rarr; Preferências &rarr;
            Acesso de rastreadores e clique em Criar assinatura.
          </li>
          <li>
            Escolha o domínio <span className="font-mono">{host}</span> e a
            validade (até 3 meses).
          </li>
          <li>Cole os dois valores abaixo.</li>
        </ol>

        {/* Keyed by host: the report stays mounted when the audit changes. */}
        <CrawlerAccessForm
          key={host}
          projectId={projectId}
          initialHost={host}
          lockHost
        />

        <div className="flex flex-wrap items-center gap-4">
          {rerunButton}
          <a
            className="text-primary underline underline-offset-3"
            href={SHOPIFY_CRAWLER_ACCESS_DOC_URL}
            target="_blank"
            rel="noreferrer"
          >
            Guia da Shopify sobre acesso de rastreadores
          </a>
        </div>
      </div>
    </Alert>
  );
}
