// 2026 NHL Awards endpoint for the pool ticker/page.
// This is the single place to replace later with a live NHL.com/API pull if a stable public awards endpoint is found.
const awards2026 = [
  {
    "award": "Hart Memorial Trophy",
    "winner": "Nikita Kucherov",
    "team": "Tampa Bay Lightning",
    "short": "Hart"
  },
  {
    "award": "Ted Lindsay Award",
    "winner": "Connor McDavid",
    "team": "Edmonton Oilers",
    "short": "Ted Lindsay"
  },
  {
    "award": "Art Ross Trophy",
    "winner": "Connor McDavid",
    "team": "Edmonton Oilers",
    "short": "Art Ross"
  },
  {
    "award": "Maurice \"Rocket\" Richard Trophy",
    "winner": "Nathan MacKinnon",
    "team": "Colorado Avalanche",
    "short": "Rocket Richard"
  },
  {
    "award": "Vezina Trophy",
    "winner": "Andrei Vasilevskiy",
    "team": "Tampa Bay Lightning",
    "short": "Vezina"
  },
  {
    "award": "James Norris Memorial Trophy",
    "winner": "Zach Werenski",
    "team": "Columbus Blue Jackets",
    "short": "Norris"
  },
  {
    "award": "Calder Memorial Trophy",
    "winner": "Matthew Schaefer",
    "team": "New York Islanders",
    "short": "Calder"
  },
  {
    "award": "Frank J. Selke Trophy",
    "winner": "Nick Suzuki",
    "team": "Montreal Canadiens",
    "short": "Selke"
  },
  {
    "award": "Lady Byng Memorial Trophy",
    "winner": "Cole Caufield",
    "team": "Montreal Canadiens",
    "short": "Lady Byng"
  },
  {
    "award": "Jack Adams Award",
    "winner": "Jon Cooper",
    "team": "Tampa Bay Lightning",
    "short": "Jack Adams"
  },
  {
    "award": "Bill Masterton Memorial Trophy",
    "winner": "Gabriel Landeskog",
    "team": "Colorado Avalanche",
    "short": "Masterton"
  },
  {
    "award": "Mark Messier NHL Leadership Award",
    "winner": "Gabriel Landeskog",
    "team": "Colorado Avalanche",
    "short": "Messier Leadership"
  },
  {
    "award": "King Clancy Memorial Trophy",
    "winner": "Marcus Foligno",
    "team": "Minnesota Wild",
    "short": "King Clancy"
  }
];

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({ season: '2025-26', announcedYear: 2026, sourceNote: 'Static verified fallback seeded from NHL.com award announcements.', data: awards2026 });
};
