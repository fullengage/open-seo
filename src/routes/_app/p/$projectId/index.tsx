import { dashboardSearchSchema } from "@/types/schemas/dashboard";
import { createFileRoute } from "@tanstack/react-router";
import { PainelGeral } from "@/client/features/fullweb/PainelGeral";

export const Route = createFileRoute("/_app/p/$projectId/")({
  validateSearch: dashboardSearchSchema,
  component: DashboardRoute,
});

function DashboardRoute() {
  const { projectId } = Route.useParams();
  return <PainelGeral key={projectId} projectId={projectId} />;
}
