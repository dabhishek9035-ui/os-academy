"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SIM_TITLES } from "@/data/curriculum/config";
import { getSimComponent, SimPlaceholder } from "@/components/visualizations/registry";

export default function SimLabPage() {
  const params = useParams<{ simId: string }>();
  const simId = params?.simId ?? "";
  const Sim = getSimComponent(simId);
  const title = SIM_TITLES[simId];

  if (!title) {
    return (
      <div className="card panel-pad">
        <h1 className="text-lg font-semibold text-ink">Lab not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No simulation “{simId}”.{" "}
          <Link href="/playground" className="link">
            Back to the playground
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
        <Link href="/playground" className="hover:text-ink">
          Playground
        </Link>{" "}
        / <span className="text-ink-muted">{title}</span>
      </nav>
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {Sim ? (
        <Sim />
      ) : (
        <SimPlaceholder label="This lab is being connected to its engine — check back shortly." />
      )}
      <p className="text-xs text-ink-faint">
        Playground experiments do not affect course progress. Reset any lab with
        the Reset button.
      </p>
    </div>
  );
}
