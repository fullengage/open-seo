import { AlertTriangle } from "lucide-react";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";

export function GoogleOAuthSetupWarning({
  integrationName,
  docsUrl,
}: {
  integrationName: string;
  docsUrl: string;
}) {
  return (
    <Alert variant="warning">
      <AlertTriangle className="size-4" />
      <AlertTitle>Integração com {integrationName} aguardando configuração</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>
          Para visualizar cliques, impressões e termos de busca reais do seu site, conecte sua conta Google Search Console com segurança.
        </p>
        <p className="text-xs text-muted-foreground">
          Caso ainda não tenha configurado as credenciais no servidor, consulte o guia passo a passo.
        </p>
        <SafeExternalLink
          url={docsUrl}
          label="Ver guia de conexão do Google"
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
        />
      </AlertDescription>
    </Alert>
  );
}
