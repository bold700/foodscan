"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AnalysisResult } from "@/lib/analyze";
import { getSearchUrl } from "@/lib/search-links";
import { cn } from "@/lib/utils";

const novaColors: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  2: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  3: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
  4: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
};

export function ResultCard({ result }: { result: AnalysisResult }) {
  const nova = result.nova ?? 4;
  const novaClass = novaColors[nova] ?? novaColors[4];

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border font-semibold",
            novaClass
          )}
        >
          {nova ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{result.naam || "Onbekend"}</p>
          {result.merk ? <p className="text-sm text-muted-foreground">{result.merk}</p> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium", novaClass)}>
          {result.nova_label || ""}
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">{result.oordeel}</p>
        {result.aandachtspunten && result.aandachtspunten.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {result.aandachtspunten.map((punt, i) => (
              <li key={i}>{punt}</li>
            ))}
          </ul>
        ) : null}
        {result.alternatieven && result.alternatieven.length > 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Gezonde alternatieven
            </p>
            <ul className="space-y-2">
              {result.alternatieven.map((alt, i) => {
                const searchUrl = getSearchUrl(alt.naam, alt.waar);
                return (
                  <li key={i} className="flex items-center justify-between gap-2 border-b border-border/50 py-2 last:border-0">
                    <div className="min-w-0 flex-1">
                      {searchUrl ? (
                        <a
                          href={searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {alt.naam}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-foreground">{alt.naam}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{alt.waar}</p>
                    </div>
                    <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      NOVA {alt.nova}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
