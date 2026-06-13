import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardCopy,
  GraduationCap,
  MapPin,
  RotateCcw,
  SkipForward,
  Trophy,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  applyComparison,
  createInitialSession,
  exportRanking,
  getConfidence,
  getOrderedUniversities,
  getSuggestedPair,
  rankingsMetadata,
  undoComparison,
  type ComparisonResult,
  type RankingSource,
  type RankingSession,
  type University,
  universities,
} from "@/lib/ranking";
import { clearSession, loadSession, saveSession } from "@/lib/storage";

const SOURCE_LABELS: Record<RankingSource, string> = {
  QS: "QS",
  THE: "THE",
  ARWU: "ARWU",
  US_NEWS: "U.S. News",
};

export function App() {
  const [session, setSession] = useState<RankingSession>(() =>
    loadSession(universities),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  const ordered = useMemo(() => getOrderedUniversities(session), [session]);
  const pair = useMemo(() => getSuggestedPair(session), [session]);
  const left = pair ? universities.find((item) => item.id === pair.leftId) : null;
  const right = pair
    ? universities.find((item) => item.id === pair.rightId)
    : null;
  const confidence = getConfidence(session, universities.length);

  function choose(result: ComparisonResult) {
    if (!pair) return;
    setSession((current) => applyComparison(current, pair, result));
  }

  function reset() {
    clearSession();
    setSession(createInitialSession(universities));
    setCopied(false);
  }

  async function copyRanking() {
    await navigator.clipboard.writeText(exportRanking(session));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-[linear-gradient(180deg,var(--background)_0%,oklch(0.965_0.015_220)_100%)] text-foreground">
        <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <section className="flex min-h-[calc(100vh-2.5rem)] flex-col">
            <header className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <GraduationCap className="size-4" />
                  {rankingsMetadata.unionRecords} universities
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
                  Which is Better? Click to Choose.
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Undo last comparison"
                      disabled={session.history.length === 0}
                      onClick={() =>
                        setSession((current) => undoComparison(current))
                      }
                      size="icon"
                      variant="outline"
                    >
                      <Undo2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo last comparison</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Reset ranking"
                      onClick={reset}
                      size="icon"
                      variant="outline"
                    >
                      <RotateCcw />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset ranking</TooltipContent>
                </Tooltip>
              </div>
            </header>

            <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <Progress value={confidence} className="h-2" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {session.history.length} comparisons completed. Confidence{" "}
                  {confidence}%.
                </p>
              </div>
              <Button onClick={() => choose("skip")} variant="outline">
                <SkipForward />
                Skip
              </Button>
            </div>

            {left && right ? (
              <div className="grid flex-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
                <UniversityChoice
                  onChoose={() => choose("left")}
                  rating={session.ratings[left.id]}
                  side="left"
                  university={left}
                />
                <div className="flex items-center justify-center">
                  <div className="flex size-14 items-center justify-center rounded-full border bg-card text-base font-semibold shadow-sm">
                    OR
                  </div>
                </div>
                <UniversityChoice
                  onChoose={() => choose("right")}
                  rating={session.ratings[right.id]}
                  side="right"
                  university={right}
                />
              </div>
            ) : (
              <Card className="flex flex-1 items-center justify-center rounded-lg">
                <CardContent className="text-center">
                  <Trophy className="mx-auto size-10 text-primary" />
                  <h2 className="mt-4 text-2xl font-semibold">
                    Ranking complete
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Every available pair has been reviewed.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          <aside className="min-h-[calc(100vh-2.5rem)]">
            <Card className="sticky top-5 h-[calc(100vh-2.5rem)] rounded-lg">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Personal Ranking</CardTitle>
                    <CardDescription>
                      Updated after every choice
                    </CardDescription>
                  </div>
                  <Button onClick={copyRanking} size="sm" variant="outline">
                    <ClipboardCopy />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
                <SourceSummary />
                <Separator />
                <ScrollArea className="min-h-0 flex-1 pr-3">
                  <ol className="space-y-2">
                    {ordered.slice(0, 60).map((university, index) => {
                      const rating = session.ratings[university.id];
                      return (
                        <li
                          className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/70"
                          key={university.id}
                        >
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {university.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {university.country ?? "Location unavailable"}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {Math.round(rating.score)}
                          </Badge>
                        </li>
                      );
                    })}
                  </ol>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </TooltipProvider>
  );
}

function UniversityChoice({
  onChoose,
  rating,
  side,
  university,
}: {
  onChoose: () => void;
  rating: RankingSession["ratings"][string];
  side: "left" | "right";
  university: University;
}) {
  const location = [university.city, university.country].filter(Boolean).join(", ");

  return (
    <button
      className="group flex min-h-[480px] w-full flex-col rounded-lg border bg-card p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
      onClick={onChoose}
      type="button"
    >
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <Badge variant="secondary">{side === "left" ? "University 1" : "University 2"}</Badge>
          <div className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            <Check className="size-3.5 opacity-0 transition group-hover:opacity-100" />
            Choose
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
            {university.name}
          </h2>
          {location ? (
            <div className="mt-4 flex items-center gap-2 text-base text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>{location}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-3">
          <DetailRow label="Current score" value={Math.round(rating.score)} />
          <DetailRow label="Compared" value={rating.comparisons} />
          <DetailRow label="Record" value={`${rating.wins}-${rating.losses}`} />
        </div>

        <div className="mt-8">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Rankings
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(university.ranks) as [RankingSource, string | number][]).map(
              ([source, rank]) => (
                <Badge key={source} variant="outline">
                  {SOURCE_LABELS[source]} #{rank}
                </Badge>
              ),
            )}
          </div>
        </div>

        {university.aliases.length > 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Also listed as {university.aliases.join(", ")}
          </p>
        ) : null}

        <div className="mt-auto pt-8" />
      </div>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SourceSummary() {
  return (
    <div className="grid gap-2 text-sm">
      {(Object.entries(rankingsMetadata.sources) as [
        RankingSource,
        { edition: string; records: number; sourceUrl: string },
      ][]).map(([source, info]) => (
        <a
          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          href={info.sourceUrl}
          key={source}
          rel="noreferrer"
          target="_blank"
        >
          <span className="truncate">{SOURCE_LABELS[source]}</span>
          <span className="tabular-nums">{info.records}</span>
        </a>
      ))}
    </div>
  );
}
