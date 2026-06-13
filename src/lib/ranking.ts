import rankingsPayload from "@/data/universities.json";

export type RankingSource = "QS" | "THE" | "ARWU" | "US_NEWS";

export type University = {
  id: string;
  name: string;
  aliases: string[];
  country?: string;
  city?: string;
  ranks: Partial<Record<RankingSource, number | string>>;
  sourceUrls: Partial<Record<RankingSource, string>>;
  profileUrls: Partial<Record<RankingSource, string>>;
};

export type RankingsMetadata = typeof rankingsPayload.metadata;

export type ComparisonResult = "left" | "right" | "skip";

export type Comparison = {
  leftId: string;
  rightId: string;
  result: ComparisonResult;
  before: Record<string, RatingState>;
};

export type RatingState = {
  score: number;
  comparisons: number;
  wins: number;
  losses: number;
  skips: number;
};

export type RankingSession = {
  ratings: Record<string, RatingState>;
  history: Comparison[];
};

export type Pair = {
  leftId: string;
  rightId: string;
};

export const universities = rankingsPayload.universities as University[];
export const rankingsMetadata = rankingsPayload.metadata;

const DEFAULT_RATING = 1400;
const SOURCE_FALLBACK_RANK = 126;
const K_FACTOR = 36;

export function rankNumber(value: number | string | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return SOURCE_FALLBACK_RANK;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : SOURCE_FALLBACK_RANK;
}

export function sourceAverage(university: University): number {
  const values = Object.values(university.ranks).map(rankNumber);
  if (!values.length) return SOURCE_FALLBACK_RANK;
  return values.reduce((sum, rank) => sum + rank, 0) / values.length;
}

export function createInitialSession(list: University[] = universities): RankingSession {
  const ratings = Object.fromEntries(
    list.map((university) => {
      const sourceSeed = Math.max(0, SOURCE_FALLBACK_RANK - sourceAverage(university));
      return [
        university.id,
        {
          score: Math.round(DEFAULT_RATING + sourceSeed * 2.2),
          comparisons: 0,
          wins: 0,
          losses: 0,
          skips: 0,
        },
      ];
    }),
  );

  return { ratings, history: [] };
}

export function getOrderedUniversities(
  session: RankingSession,
  list: University[] = universities,
): University[] {
  return [...list].sort((a, b) => {
    const ratingDiff = session.ratings[b.id].score - session.ratings[a.id].score;
    if (ratingDiff !== 0) return ratingDiff;
    return sourceAverage(a) - sourceAverage(b);
  });
}

export function getSuggestedPair(
  session: RankingSession,
  list: University[] = universities,
): Pair | null {
  if (list.length < 2) return null;

  const ordered = getOrderedUniversities(session, list);
  const compared = new Set(
    session.history.map(({ leftId, rightId }) => pairKey(leftId, rightId)),
  );
  let best: { pair: Pair; score: number } | null = null;

  for (let i = 0; i < ordered.length; i += 1) {
    const left = ordered[i];
    const leftRating = session.ratings[left.id];
    const windowSize = leftRating.comparisons < 2 ? 24 : 12;

    for (let j = i + 1; j < Math.min(ordered.length, i + windowSize); j += 1) {
      const right = ordered[j];
      if (compared.has(pairKey(left.id, right.id))) continue;

      const rightRating = session.ratings[right.id];
      const scoreGap = Math.abs(leftRating.score - rightRating.score);
      const attention =
        20 / (1 + leftRating.comparisons + rightRating.comparisons);
      const frontier = Math.max(0, 18 - Math.min(i, j) * 0.15);
      const score = scoreGap - attention - frontier;

      if (!best || score < best.score) {
        best = { pair: { leftId: left.id, rightId: right.id }, score };
      }
    }
  }

  return best?.pair ?? null;
}

export function applyComparison(
  session: RankingSession,
  pair: Pair,
  result: ComparisonResult,
): RankingSession {
  const leftBefore = session.ratings[pair.leftId];
  const rightBefore = session.ratings[pair.rightId];
  const ratings = {
    ...session.ratings,
    [pair.leftId]: { ...leftBefore },
    [pair.rightId]: { ...rightBefore },
  };

  if (result === "skip") {
    ratings[pair.leftId].comparisons += 1;
    ratings[pair.rightId].comparisons += 1;
    ratings[pair.leftId].skips += 1;
    ratings[pair.rightId].skips += 1;
  } else {
    const leftWon = result === "left";
    const expectedLeft = expectedScore(leftBefore.score, rightBefore.score);
    const leftActual = leftWon ? 1 : 0;
    const scoreDelta = K_FACTOR * (leftActual - expectedLeft);

    ratings[pair.leftId].score = Math.round(leftBefore.score + scoreDelta);
    ratings[pair.rightId].score = Math.round(rightBefore.score - scoreDelta);
    ratings[pair.leftId].comparisons += 1;
    ratings[pair.rightId].comparisons += 1;
    ratings[pair.leftId].wins += leftWon ? 1 : 0;
    ratings[pair.leftId].losses += leftWon ? 0 : 1;
    ratings[pair.rightId].wins += leftWon ? 0 : 1;
    ratings[pair.rightId].losses += leftWon ? 1 : 0;
  }

  return {
    ratings,
    history: [
      ...session.history,
      {
        leftId: pair.leftId,
        rightId: pair.rightId,
        result,
        before: {
          [pair.leftId]: leftBefore,
          [pair.rightId]: rightBefore,
        },
      },
    ],
  };
}

export function undoComparison(session: RankingSession): RankingSession {
  const previous = session.history.at(-1);
  if (!previous) return session;

  return {
    ratings: {
      ...session.ratings,
      ...previous.before,
    },
    history: session.history.slice(0, -1),
  };
}

export function getConfidence(session: RankingSession, total: number): number {
  if (total === 0) return 0;
  const touched = Object.values(session.ratings).filter(
    (rating) => rating.comparisons > 0,
  ).length;
  const coverage = touched / total;
  const volume = Math.min(1, session.history.length / Math.max(20, total * 0.8));
  return Math.round((coverage * 0.55 + volume * 0.45) * 100);
}

export function exportRanking(
  session: RankingSession,
  list: University[] = universities,
): string {
  const ordered = getOrderedUniversities(session, list);
  return ordered
    .map((university, index) => {
      const rating = session.ratings[university.id];
      return `${index + 1}. ${university.name} (${Math.round(rating.score)})`;
    })
    .join("\n");
}

function expectedScore(leftScore: number, rightScore: number): number {
  return 1 / (1 + 10 ** ((rightScore - leftScore) / 400));
}

function pairKey(leftId: string, rightId: string): string {
  return [leftId, rightId].sort().join("__");
}
