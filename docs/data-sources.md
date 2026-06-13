# Ranking Data Sources

Date: 2026-06-13

## Source Coverage

- QS World University Rankings 2026: full top 100 from the official `topuniversities.com/rankings/endpoint` payload for node `4061771`.
- Times Higher Education World University Rankings 2026: full top 100 from the official JSON ranking table endpoint.
- Academic Ranking of World Universities 2025: full top 100 from ShanghaiRanking's official Nuxt payload for the ARWU 2025 page.
- U.S. News Best Colleges National Universities 2026: user-provided top-100 export from U.S. News. The source includes ties, so 101 schools are retained through rank `#97` rather than dropping a tied entry.

## Generated Data

Run:

```bash
pnpm data:refresh
```

Generated output:

```text
src/data/universities.json
```

The generated file contains source metadata, source-specific rank chips, profile URLs when available, and a normalized union of university records.
