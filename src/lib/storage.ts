import {
  createInitialSession,
  type RankingSession,
  type University,
} from "@/lib/ranking";

const STORAGE_KEY = "rank-your-uni.session.v2";

export function loadSession(list: University[]): RankingSession {
  if (typeof window === "undefined") return createInitialSession(list);

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialSession(list);

  try {
    const parsed = JSON.parse(raw) as RankingSession;
    const ids = new Set(list.map((university) => university.id));
    const ratingIds = Object.keys(parsed.ratings);
    const validRatings =
      ratingIds.length === ids.size &&
      ratingIds.every((id) => ids.has(id)) &&
      list.every((university) => parsed.ratings[university.id]);
    const validHistory = parsed.history.every(
      ({ leftId, rightId }) => ids.has(leftId) && ids.has(rightId),
    );
    if (!validRatings || !validHistory) return createInitialSession(list);
    return parsed;
  } catch {
    return createInitialSession(list);
  }
}

export function saveSession(session: RankingSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
