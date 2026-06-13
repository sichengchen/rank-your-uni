import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCopy,
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
      <main className="min-h-screen bg-[linear-gradient(180deg,var(--background)_0%,oklch(0.97_0.01_220)_100%)] text-foreground">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5 lg:px-8">
          <section className="flex flex-col gap-4 lg:min-h-[calc(100vh-2rem)]">
            <header className="grid gap-4 rounded-lg border bg-card px-4 py-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                  Which is Better? Click to Choose.
                </h1>
              </div>
              <div className="grid gap-2 sm:w-80">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {session.history.length} compared · {confidence}% confident
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          aria-label="Undo last comparison"
                          disabled={session.history.length === 0}
                          onClick={() =>
                            setSession((current) => undoComparison(current))
                          }
                          size="icon"
                          variant="ghost"
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
                          variant="ghost"
                        >
                          <RotateCcw />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset ranking</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <Progress value={confidence} className="h-1.5" />
              </div>
            </header>

            {left && right ? (
              <div className="grid items-center gap-3 md:grid-cols-[1fr_3.25rem_1fr] lg:gap-4">
                <UniversityChoice
                  onChoose={() => choose("left")}
                  rating={session.ratings[left.id]}
                  university={left}
                />
                <div className="flex items-center justify-center">
                  <div className="flex size-10 items-center justify-center rounded-full border bg-card text-xs font-semibold shadow-sm sm:size-11">
                    OR
                  </div>
                </div>
                <UniversityChoice
                  onChoose={() => choose("right")}
                  rating={session.ratings[right.id]}
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

            {left && right ? (
              <div className="flex justify-center">
                <Button onClick={() => choose("skip")} variant="outline">
                  <SkipForward />
                  Skip this pair
                </Button>
              </div>
            ) : null}
          </section>

          <aside className="lg:min-h-[calc(100vh-2rem)]">
            <Card className="h-[min(420px,calc(100vh-2rem))] rounded-lg lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Personal Ranking</CardTitle>
                    <CardDescription>
                      Top choices so far
                    </CardDescription>
                  </div>
                  <Button onClick={copyRanking} size="sm" variant="outline">
                    <ClipboardCopy />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <ol className="space-y-1.5 py-3">
                    {ordered.map((university, index) => {
                      const rating = session.ratings[university.id];
                      return (
                        <li
                          className="grid grid-cols-[1.6rem_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/70"
                          key={university.id}
                        >
                          <span className="text-xs tabular-nums text-muted-foreground">
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
                          <Badge className="text-xs" variant="outline">
                            {Math.round(rating.score)}
                          </Badge>
                        </li>
                      );
                    })}
                  </ol>
                </div>
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
  university,
}: {
  onChoose: () => void;
  rating: RankingSession["ratings"][string];
  university: University;
}) {
  const location = [university.city, university.country].filter(Boolean).join(", ");

  return (
    <button
      aria-label={`Choose ${university.name}`}
      className="group flex w-full flex-col rounded-lg border bg-card p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 sm:min-h-[340px]"
      onClick={onChoose}
      type="button"
    >
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal sm:text-3xl">
            {university.name}
          </h2>
          {location ? (
            <div className="mt-3 flex items-center gap-2 text-sm leading-snug text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>{location}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <DetailRow label="Score" value={Math.round(rating.score)} />
          <DetailRow label="Compared" value={rating.comparisons} />
          <DetailRow label="Record" value={`${rating.wins}-${rating.losses}`} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Rankings
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(university.ranks) as [RankingSource, string | number][]).map(
              ([source, rank]) => (
                <Badge className="text-xs" key={source} variant="outline">
                  {SOURCE_LABELS[source]} #{rank}
                </Badge>
              ),
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-muted px-2.5 py-2 sm:px-3">
      <span className="block text-[11px] leading-tight text-muted-foreground sm:text-xs">
        {label}
      </span>
      <span className="mt-1 block text-sm font-semibold">{value}</span>
    </div>
  );
}
