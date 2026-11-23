import type { Metadata } from "next";
import { count } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { getContext } from "@/lib/workspace";
import { listTrackers } from "@/lib/trackers/data";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/inputs";
import { GridSkeleton } from "@/components/app/skeletons";
import { NewTrackerButton } from "@/components/trackers/new-tracker";

export const metadata: Metadata = { title: "Trackers" };

export default function TrackersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <PageHeader title="Trackers" description="Mide lo que te importa." />
          <GridSkeleton />
        </div>
      }
    >
      <Trackers />
    </Suspense>
  );
}

async function Trackers() {
  const { workspace } = await getContext();
  const trackers = await listTrackers(workspace.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trackers"
        description="Mide lo que te importa."
        actions={<NewTrackerButton trackers={trackers} />}
      />
      {trackers.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trackers.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trackers/${t.id}`}
                className="block h-full rounded-[var(--radius-card)]"
              >
                <Card className="flex h-full flex-col gap-2 p-5 transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5">
                  <h2 className="text-[17px] font-medium break-words">
                    {t.icon ? (
                      <span aria-hidden className="mr-1.5">
                        {t.icon}
                      </span>
                    ) : null}
                    {t.name}
                  </h2>
                  {t.description ? (
                    <p className="line-clamp-2 text-[14px] text-fg-muted">{t.description}</p>
                  ) : null}
                  <p className="mt-auto text-[13px] text-fg-subtle">
                    {count(t.entries, "registro")}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Crea tu primer tracker" action={<NewTrackerButton trackers={[]} />}>
          Empieza con una plantilla (peso, sueño, gastos, lecturas…) o diseña el tuyo con las
          propiedades que quieras.
        </EmptyState>
      )}
    </div>
  );
}
