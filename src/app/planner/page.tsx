import Studio from "@/components/Studio";
import InteractiveNeuralVortexBackground from "@/components/ui/interactive-neural-vortex-background";
import type { EventType } from "@/lib/types";

export default function PlannerPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const type = searchParams.type;
  const initialType: EventType | undefined =
    type === "wedding" || type === "birthday" || type === "community" ? type : undefined;
  return (
    <div className="planner-page">
      <InteractiveNeuralVortexBackground />
      <Studio initialType={initialType} />
    </div>
  );
}
