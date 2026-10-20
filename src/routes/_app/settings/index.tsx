import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ApiKeySettings } from "@/client/features/settings/ApiKeySettings";
import { SectionHeader } from "@/client/components/PageHeader";
import { ThemePreferenceRadio } from "@/client/components/ThemePreferenceMenuItems";
import { Switch } from "@/client/components/ui/switch";
import { authClient, useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { QuotasCard } from "@/client/features/companies/QuotasCard";
import { version } from "../../../../package.json";

export const Route = createFileRoute("/_app/settings/")({
  component: PersonalSettings,
});

function PersonalSettings() {
  const isHosted = isHostedClientAuthMode();
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const analyticsEnabled = session?.user?.analyticsOptedOut !== true;

  async function updateAnalyticsPreference(enabled: boolean) {
    setIsSaving(true);
    try {
      const result = await authClient.updateUser({
        analyticsOptedOut: !enabled,
      });
      if (result.error) {
        toast.error("We couldn't update your analytics setting.");
      } else {
        toast.success(enabled ? "Analytics enabled" : "Analytics disabled");
      }
    } catch {
      toast.error("We couldn't update your analytics setting.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <SectionHeader title="Aparência" />
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm">Tema visual</span>
          <ThemePreferenceRadio />
        </div>
      </section>

      {isHosted ? (
        <>
          <ApiKeySettings />

          <section className="space-y-3">
            <SectionHeader title="Analytics" />
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm">Ajude a melhorar o OpenSEO</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Compartilhe dados anônimos de uso.
                </p>
              </div>
              <Switch
                checked={analyticsEnabled}
                disabled={isSaving}
                onCheckedChange={(checked) => {
                  void updateAnalyticsPreference(checked);
                }}
                aria-label="Ativar analytics do produto"
              />
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-3">
          <SectionHeader title="Sobre o Sistema" />
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm">Versão</span>
            <span className="font-mono text-sm text-muted-foreground">
              v{version}
            </span>
          </div>
        </section>
      )}


      <section className="space-y-4 pt-4 border-t border-border/50">
        <SectionHeader title="Infraestrutura, Cotas & Custos de APIs" />
        <p className="text-sm text-muted-foreground">
          Monitoramento em tempo real da arquitetura de custo zero: PageSpeed API, Web Crawler e Base CNPJ.
        </p>
        <QuotasCard />
      </section>
    </div>
  );
}

