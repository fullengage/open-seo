import { createFileRoute } from "@tanstack/react-router";
import { MonitorPosicoes } from "@/client/features/fullweb/MonitorPosicoes";
import { rankTrackingListSearchSchema } from "@/types/schemas/rank-tracking-search";

export const Route = createFileRoute("/_app/p/$projectId/rank-tracking/")({
  validateSearch: rankTrackingListSearchSchema,
  remountDeps: ({ params }) => params.projectId,
  component: RankTrackingIndex,
});

function RankTrackingIndex() {
  const { projectId } = Route.useParams();
  return <MonitorPosicoes projectId={projectId} />;
}
