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
import { ScrollArea } from "@/components/ui/scroll-area";
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
        <div className="mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <section className="flex min-h-[calc(100vh-2rem)] flex-col gap-4">
            <header className="grid gap-4 rounded-lg border bg-card px-4 py-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-normal">
                  Which is Better? Click to Choose.
                </h1>
              </div>
              <div className="grid gap-3 sm:w-80">
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
              <div className="grid items-center gap-4 lg:grid-cols-[1fr_4rem_1fr]">
                <UniversityChoice
                  onChoose={() => choose("left")}
                  rating={session.ratings[left.id]}
                  university={left}
                />
                <div className="flex items-center justify-center">
                  <div className="flex size-12 items-center justify-center rounded-full border bg-card text-sm font-semibold shadow-sm">
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

          <aside className="min-h-[calc(100vh-2rem)]">
            <Card className="sticky top-4 h-[calc(100vh-2rem)] rounded-lg">
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
                <ScrollArea className="min-h-0 flex-1 pr-3">
                  <ol className="space-y-1.5 py-3">
                    {ordered.slice(0, 60).map((university, index) => {
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
  university,
}: {
  onChoose: () => void;
  rating: RankingSession["ratings"][string];
  university: University;
}) {
  const location = [university.city, university.country].filter(Boolean).join(", ");

  return (
    <button
      className="group flex min-h-[360px] w-full flex-col rounded-lg border bg-card p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
      onClick={onChoose}
      type="button"
    >
      <div className="flex flex-1 flex-col p-6">
        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-normal">
            {university.name}
          </h2>
          {location ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>{location}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <DetailRow label="Current score" value={Math.round(rating.score)} />
          <DetailRow label="Compared" value={rating.comparisons} />
          <DetailRow label="Record" value={`${rating.wins}-${rating.losses}`} />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
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
      </div>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 block text-sm font-semibold">{value}</span>
    </div>
  );
}
