import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getContext } from "@/lib/workspace";
import { getTracker, listEntryTitles, listTrackers } from "@/lib/trackers/data";
import { ListSkeleton } from "@/components/app/skeletons";
import { TrackerWorkspace } from "@/components/trackers/tracker-workspace";

export const metadata: Metadata = { title: "Tracker" };

export default function TrackerPage({ params }: PageProps<"/trackers/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Tracker params={params} />
    </Suspense>
  );
}

async function Tracker({ params }: { params: PageProps<"/trackers/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { workspace, today } = await getContext();
  const [tracker, trackers] = await Promise.all([getTracker(id), listTrackers(workspace.id)]);
  if (!tracker) notFound();
  const relationOptions: Record<string, { id: string; label: string }[]> = {};
  await Promise.all(
    tracker.properties
      .filter((p) => p.type === "relation" && p.config.targetTrackerId)
      .map(async (p) => {
        relationOptions[p.id] = await listEntryTitles(p.config.targetTrackerId!);
      }),
  );
  return (
    <TrackerWorkspace
      tracker={tracker}
      today={today}
      trackers={trackers.map((t) => ({ id: t.id, name: t.name }))}
      relationOptions={relationOptions}
    />
  );
}
