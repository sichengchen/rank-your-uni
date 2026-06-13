import {
  createInitialSession,
  type RankingSession,
  type University,
} from "@/lib/ranking";

const STORAGE_KEY = "rank-your-uni.session.v1";

export function loadSession(list: University[]): RankingSession {
  if (typeof window === "undefined") return createInitialSession(list);

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialSession(list);

  try {
    const parsed = JSON.parse(raw) as RankingSession;
    const ids = new Set(list.map((university) => university.id));
    const validRatings = Object.keys(parsed.ratings).every((id) => ids.has(id));
    if (!validRatings) return createInitialSession(list);
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
