import { describe, expect, it } from "vitest";
import {
  applyComparison,
  createInitialSession,
  exportRanking,
  getConfidence,
  getOrderedUniversities,
  getSuggestedPair,
  rankNumber,
  undoComparison,
  universities,
  type University,
} from "./ranking";

const fixture: University[] = [
  {
    id: "alpha",
    name: "Alpha University",
    aliases: [],
    country: "United States",
    ranks: { QS: 1, THE: 2 },
    sourceUrls: {},
    profileUrls: {},
  },
  {
    id: "beta",
    name: "Beta University",
    aliases: [],
    country: "United States",
    ranks: { QS: 2, THE: 1 },
    sourceUrls: {},
    profileUrls: {},
  },
  {
    id: "gamma",
    name: "Gamma University",
    aliases: [],
    country: "Canada",
    ranks: { QS: 3, THE: 3 },
    sourceUrls: {},
    profileUrls: {},
  },
];

describe("ranking engine", () => {
  it("does not ship duplicate generated universities", () => {
    const ids = new Set<string>();
    const names = new Set<string>();

    for (const university of universities) {
      const normalizedName = university.name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^the\s+/i, "")
        .replace(/&/g, " and ")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toLowerCase();

      expect(ids.has(university.id), university.id).toBe(false);
      expect(names.has(normalizedName), university.name).toBe(false);
      ids.add(university.id);
      names.add(normalizedName);
    }
  });

  it("parses numeric rank values from ties and labels", () => {
    expect(rankNumber("=17")).toBe(17);
    expect(rankNumber("top 10")).toBe(10);
    expect(rankNumber(undefined)).toBe(126);
  });

  it("uses source rankings only as initial order reference", () => {
    const session = createInitialSession(fixture);
    const scores = Object.values(session.ratings).map((rating) => rating.score);

    expect(new Set(scores)).toEqual(new Set([1400]));
    expect(getOrderedUniversities(session, fixture).map(({ id }) => id)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("suggests an uncompared pair and updates ratings", () => {
    const session = createInitialSession(fixture);
    const pair = getSuggestedPair(session, fixture);

    expect(pair).not.toBeNull();
    const next = applyComparison(session, pair!, "right");

    expect(next.history).toHaveLength(1);
    expect(next.ratings[pair!.rightId].wins).toBe(1);
    expect(next.ratings[pair!.leftId].losses).toBe(1);
  });

  it("undoes the last comparison exactly", () => {
    const session = createInitialSession(fixture);
    const pair = { leftId: "alpha", rightId: "beta" };
    const next = applyComparison(session, pair, "left");
    const undone = undoComparison(next);

    expect(undone.history).toHaveLength(0);
    expect(undone.ratings.alpha).toEqual(session.ratings.alpha);
    expect(undone.ratings.beta).toEqual(session.ratings.beta);
  });

  it("exports the personalized order", () => {
    const session = createInitialSession(fixture);
    const next = applyComparison(
      applyComparison(session, { leftId: "alpha", rightId: "gamma" }, "right"),
      { leftId: "gamma", rightId: "beta" },
      "left",
    );

    expect(getOrderedUniversities(next, fixture)[0].id).toBe("gamma");
    expect(exportRanking(next, fixture)).toContain("1. Gamma University");
    expect(getConfidence(next, fixture.length)).toBeGreaterThan(0);
  });
});
