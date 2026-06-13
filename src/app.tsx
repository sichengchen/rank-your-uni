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
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:h-screen lg:min-h-0 lg:overflow-hidden lg:px-8">
          <section className="flex flex-col gap-5 lg:shrink-0">
            <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_20rem] sm:items-end">
              <div className="min-w-0 space-y-2">
                <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
                  Which is Better? Click to Choose.
                </h1>
                <p className="text-sm text-muted-foreground">
                  {session.history.length} compared · {confidence}% confident
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-end gap-1.5">
                  {left && right ? (
                    <Button
                      className="mr-auto sm:mr-2"
                      onClick={() => choose("skip")}
                      variant="outline"
                    >
                      <SkipForward />
                      Skip
                    </Button>
                  ) : null}
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
                <Progress value={confidence} className="h-1.5" />
              </div>
            </header>

            {left && right ? (
              <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] lg:gap-5">
                <UniversityChoice
                  onChoose={() => choose("left")}
                  rating={session.ratings[left.id]}
                  university={left}
                />
                <div className="flex items-center justify-center">
                  <div className="flex size-10 items-center justify-center rounded-full border bg-background/85 text-xs font-semibold shadow-sm">
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
              <Card className="flex flex-1 items-center justify-center">
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

          <aside className="lg:min-h-0 lg:flex-1 lg:basis-0 lg:overflow-hidden">
            <Card className="h-[min(520px,calc(100vh-2.5rem))] lg:h-full lg:min-h-0">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Personal Ranking</CardTitle>
                    <CardDescription>
                      All {ordered.length} universities
                    </CardDescription>
                  </div>
                  <Button onClick={copyRanking} size="sm" variant="outline">
                    <ClipboardCopy />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                <ol className="space-y-1">
                  {ordered.map((university, index) => {
                    const rating = session.ratings[university.id];
                    return (
                      <li
                        className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/70"
                        key={university.id}
                      >
                        <RankNumber index={index} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium leading-tight">
                            {university.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {formatLocation(university)}
                          </p>
                        </div>
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {Math.round(rating.score)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
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
  const location = formatLocation(university);
  const rankingEntries = Object.entries(university.ranks) as [
    RankingSource,
    string | number,
  ][];

  return (
    <button
      aria-label={`Choose ${university.name}`}
      className="group flex w-full overflow-hidden rounded-lg border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
      onClick={onChoose}
      type="button"
    >
      <div className="flex min-h-[280px] flex-1 flex-col p-5 sm:min-h-[320px] sm:p-6">
        <div className="flex-1">
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

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-sm">
          <Metric label="Score" value={Math.round(rating.score)} />
          <Metric label="Compared" value={rating.comparisons} />
          <Metric label="Record" value={`${rating.wins}-${rating.losses}`} />
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap gap-1.5">
            {rankingEntries.map(([source, rank]) => (
              <Badge className="text-xs" key={source} variant="outline">
                {SOURCE_LABELS[source]} #{rank}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="mt-0.5 block font-semibold">{value}</span>
    </div>
  );
}

function formatLocation(university: University): string {
  return (
    [university.city, university.country].filter(Boolean).join(", ") ||
    "Location unavailable"
  );
}

function RankNumber({ index }: { index: number }) {
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      {index + 1}
    </span>
  );
}
