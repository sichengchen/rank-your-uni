import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const QS_URL =
  "https://www.topuniversities.com/rankings/endpoint?nid=4061771&page=0&items_per_page=100&tab=&region=&countries=&cities=&search=&star=&sort_by=rank&order_by=asc&program_type=&scholarship=&fee=&english_score=&academic_score=&mix_student=&loggedincache=";
const QS_SOURCE_URL =
  "https://www.topuniversities.com/world-university-rankings?items_per_page=100";
const THE_URL =
  "https://www.timeshighereducation.com/json/ranking_tables/world_university_rankings/2026";
const THE_SOURCE_URL =
  "https://www.timeshighereducation.com/world-university-rankings/latest/world-ranking";
const ARWU_PAYLOAD_URL =
  "https://www.shanghairanking.com/_nuxt/static/1779447311/rankings/arwu/2025/payload.js";
const ARWU_SOURCE_URL = "https://www.shanghairanking.com/rankings/arwu/2025";
const US_NEWS_NATIONAL_SOURCE_URL =
  "https://www.usnews.com/best-colleges/rankings/national-universities";
const US_NEWS_SEED_PATH = new URL(
  "../src/data/us-news-national-2026.json",
  import.meta.url,
);

const ALIASES = new Map([
  ["mit", "Massachusetts Institute of Technology"],
  ["massachusetts institute of technology mit", "Massachusetts Institute of Technology"],
  ["ucl", "University College London"],
  ["university college london ucl", "University College London"],
  ["california institute of technology caltech", "California Institute of Technology"],
  ["caltech", "California Institute of Technology"],
  ["national university of singapore nus", "National University of Singapore"],
  ["epfl ecole polytechnique federale de lausanne", "EPFL"],
  ["ecole polytechnique federale de lausanne", "EPFL"],
  ["eth zurich swiss federal institute of technology", "ETH Zurich"],
  ["eth zurich", "ETH Zurich"],
  ["university of california berkeley", "University of California, Berkeley"],
  ["university of california at berkeley", "University of California, Berkeley"],
  ["uc berkeley", "University of California, Berkeley"],
  ["university of michigan ann arbor", "University of Michigan-Ann Arbor"],
  ["university of michigan", "University of Michigan-Ann Arbor"],
  ["university of north carolina chapel hill", "University of North Carolina at Chapel Hill"],
  ["university of texas austin", "University of Texas at Austin"],
  ["the university of texas austin", "University of Texas at Austin"],
  ["the ohio state university", "Ohio State University"],
  ["university of illinois urbana champaign", "University of Illinois Urbana-Champaign"],
  ["university of illinois at urbana champaign", "University of Illinois Urbana-Champaign"],
  ["university of wisconsin madison", "University of Wisconsin-Madison"],
  ["purdue university main campus", "Purdue University"],
  ["the pennsylvania state university university park", "Pennsylvania State University"],
  ["pennsylvania state university university park", "Pennsylvania State University"],
  ["stony brook university suny", "Stony Brook University"],
  ["university of minnesota twin cities", "University of Minnesota Twin Cities"],
  ["binghamton university suny", "Binghamton University"],
  ["indiana university bloomington", "Indiana University Bloomington"],
  ["university at buffalo suny", "University at Buffalo"],
  ["technical university of munich", "Technical University of Munich"],
  ["tum", "Technical University of Munich"],
  ["the university of tokyo", "University of Tokyo"],
  ["the university of melbourne", "University of Melbourne"],
  ["the university of sydney", "University of Sydney"],
  ["the university of manchester", "University of Manchester"],
  ["the university of edinburgh", "University of Edinburgh"],
  ["the london school of economics and political science", "London School of Economics and Political Science"],
  ["king's college london", "King's College London"],
  ["kings college london", "King's College London"],
]);

function rankValue(value) {
  if (typeof value === "number") return value;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function cleanName(name) {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\bThe\s+University\b/g, "University")
    .replace(/\s+/g, " ")
    .trim();
}

function keyFor(name) {
  return cleanName(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalName(name) {
  const key = keyFor(name);
  return ALIASES.get(key) ?? cleanName(name);
}

function idFor(name) {
  return keyFor(canonicalName(name)).replace(/\s+/g, "-");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; RankYourUniBot/0.1; +https://localhost)",
      accept: "application/json,text/plain,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; RankYourUniBot/0.1; +https://localhost)",
      accept: "text/javascript,text/plain,*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchQs() {
  const payload = await fetchJson(QS_URL);
  return payload.score_nodes
    .filter((row) => rankValue(row.rank_display) <= 100)
    .map((row) => ({
      source: "QS",
      rank: row.rank_display,
      name: row.title,
      country: normalizeCountry(row.country),
      city: row.city?.trim(),
      url: `${new URL(row.path, "https://www.topuniversities.com")}`,
      sourceUrl: QS_SOURCE_URL,
    }));
}

async function fetchThe() {
  const payload = await fetchJson(THE_URL);
  return payload.data
    .filter((row) => rankValue(row.rank) <= 100)
    .map((row) => ({
      source: "THE",
      rank: row.rank,
      name: row.name,
      country: normalizeCountry(row.location),
      url: `${new URL(row.url, "https://www.timeshighereducation.com")}`,
      sourceUrl: THE_SOURCE_URL,
    }));
}

async function fetchArwu() {
  const js = await fetchText(ARWU_PAYLOAD_URL);
  let captured;
  vm.runInNewContext(
    js,
    {
      __NUXT_JSONP__: (_path, payload) => {
        captured = payload;
      },
    },
    { timeout: 5000 },
  );

  const rows = captured?.data?.[0]?.univList;
  if (!Array.isArray(rows)) {
    throw new Error("ARWU payload did not contain univList");
  }

  return rows
    .filter((row) => rankValue(row.ranking) <= 100)
    .map((row) => ({
      source: "ARWU",
      rank: row.ranking,
      name: row.univNameEn,
      country: normalizeCountry(row.region),
      url: `${new URL(`/institution/${row.univCode}`, "https://www.shanghairanking.com")}`,
      sourceUrl: ARWU_SOURCE_URL,
    }));
}

function getUsNewsNational() {
  const rows = JSON.parse(readFileSync(US_NEWS_SEED_PATH, "utf8"));
  return rows.map((row) => ({
    source: "US_NEWS",
    rank: row.rank,
    name: row.name,
    country: "United States",
    city: row.location.replace(/,\s*[A-Z]{2}$/, ""),
    sourceUrl: US_NEWS_NATIONAL_SOURCE_URL,
  }));
}

function normalizeCountry(country) {
  return country
    ?.replace("China (Mainland)", "China")
    .replace("Hong Kong SAR", "Hong Kong")
    .trim();
}

function mergeRecords(entries) {
  const byId = new Map();
  for (const entry of entries) {
    const name = canonicalName(entry.name);
    const id = idFor(name);
    const existing =
      byId.get(id) ??
      {
        id,
        name,
        aliases: [],
        country: entry.country,
        city: entry.city,
        ranks: {},
        sourceUrls: {},
        profileUrls: {},
      };

    if (entry.name !== name && !existing.aliases.includes(entry.name)) {
      existing.aliases.push(entry.name);
    }
    if (!existing.country && entry.country) existing.country = entry.country;
    if (!existing.city && entry.city) existing.city = entry.city;
    existing.ranks[entry.source] = entry.rank;
    existing.sourceUrls[entry.source] = entry.sourceUrl;
    if (entry.url) existing.profileUrls[entry.source] = entry.url;
    byId.set(id, existing);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aBest = Math.min(...Object.values(a.ranks).map(rankValue));
    const bBest = Math.min(...Object.values(b.ranks).map(rankValue));
    return aBest - bBest || a.name.localeCompare(b.name);
  });
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const [qs, the, arwu] = await Promise.all([fetchQs(), fetchThe(), fetchArwu()]);
  const usNews = getUsNewsNational();
  const universities = mergeRecords([...qs, ...the, ...arwu, ...usNews]);

  const payload = {
    metadata: {
      fetchedAt,
      sources: {
        QS: {
          edition: "QS World University Rankings 2026",
          sourceUrl: QS_SOURCE_URL,
          status: "top_100_official_endpoint",
          records: qs.length,
        },
        THE: {
          edition: "Times Higher Education World University Rankings 2026",
          sourceUrl: THE_SOURCE_URL,
          status: "top_100_official_json",
          records: the.length,
        },
        ARWU: {
          edition: "Academic Ranking of World Universities 2025",
          sourceUrl: ARWU_SOURCE_URL,
          status: "top_100_official_nuxt_payload",
          records: arwu.length,
        },
        US_NEWS: {
          edition: "U.S. News Best Colleges National Universities 2026",
          sourceUrl: US_NEWS_NATIONAL_SOURCE_URL,
          status: "top_100_user_provided_export_with_ties",
          records: usNews.length,
        },
      },
      unionRecords: universities.length,
    },
    universities,
  };

  await mkdir("src/data", { recursive: true });
  await writeFile(
    "src/data/universities.json",
    `${JSON.stringify(payload, null, 2)}\n`,
  );

  console.log(
    `Wrote ${universities.length} universities from QS=${qs.length}, THE=${the.length}, ARWU=${arwu.length}, US_NEWS=${usNews.length}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
