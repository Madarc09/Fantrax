Fantrax Vercel/GitHub package - v15

Includes:
- Removed broken Matchup History tabs from both pools.
- Added API Checker tab to both pools.
- Added Team Compare tab to both pools.
- V66 removed the LIVE WIRE/ticker strip from both pool pages. The restoration notes are archived below.
- Best Seasons roster wording now clearly says Current Fantrax Roster only; historic season rosters are not exposed by the public API yet.

Upload the CONTENTS of this extracted folder to GitHub, not the ZIP and not the outer folder.
Top level should show: index.html, Basement Bar League/, Forever Pool/, api/, README_VERCEL_UPLOAD.txt


V20 update:
- Restored desktop ticker to a readable speed.
- Removed hover/touch pause behavior.
- Reworked mobile ticker to use a continuous four-copy loop so it should not go blank after a second.

V59 SHARED POOL UPDATES STORAGE
-------------------------------
Pool Updates no longer uses browser localStorage for questions/votes. The pages now call:
  /api/pool-updates?pool=bbl
  /api/pool-updates?pool=forever

For questions/votes to appear for everyone after refresh, configure shared storage in Vercel:
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN

Fast setup:
1. In Vercel, open your project.
2. Go to Storage and create/connect an Upstash Redis database, or create one at Upstash and copy the REST URL/token.
3. Add those two environment variables in Vercel Project Settings -> Environment Variables.
4. Redeploy.

Without those variables, the API will warn that shared storage is not configured and will not save league-wide questions/votes.

V60 STORAGE ENV FALLBACK UPDATE
-------------------------------
The Pool Updates API now accepts either variable naming style:

Option A, Upstash names:
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN

Option B, Vercel KV names:
  KV_REST_API_URL
  KV_REST_API_TOKEN

You do NOT need all five variables from the older Vercel KV integration for this feature. The read-only token is not used because Pool Updates must write new questions and votes.

If Vercel auto-populates a value while you are adding the variable, make sure the saved value is the actual Redis REST URL/token, not just an auto-suggested variable name or placeholder. The REST URL should start with https:// and include upstash.io.

After adding or editing variables, redeploy the project again. Old deployments do not receive newly added environment variables.


V63: Award/trophy labels now use the season-ending award year. Current 2025/26 awards display as 2026, previous 2024/25 awards display as 2025, etc.

V66 PAGE CLEANUP
----------------
Requested cuts completed:
- Removed the Salary Cap tab/page from both pool pages and deleted its helper routes (`api/capspace.js`, `api/dailyfaceoff.js`).
- Removed the duplicate NHL Awards tab/page from both pool pages and deleted its helper route (`api/nhl-awards.js`). The normal Awards page remains.
- Removed the LIVE WIRE/ticker strip from both pool pages.
- Added a second fixed top-left link under the pool-switch link: "Leave Bar" -> ../index.html.

Ticker reference / restore notes:
- The final visible ticker before removal was the V27 "LIVEWIRE hard reset" implementation.
- V27 created a sticky board with id `v27LivewireBoard` immediately after `.header .final-header-art`.
- It hid the older `.sports-crawl` strip and used `.v27-livewire`, `.v27-brand`, `.v27-card`, `.v27-type`, and `.v27-text` for the flip-board styling.
- Each pool set a title and league key: Basement Bar League used `V27_POOL_NAME='Basement Bar League'` and `V27_LEAGUE='bbl'`; Forever Pool used `V27_POOL_NAME='Forever Pool'` and `V27_LEAGUE='forever'`.
- The board built items from `/api/fantrax?league=<bbl|forever>&endpoint=standings`, local draft-order data (`LOCAL_DRAFT_TICKER`, `buildDraftTickerItemsV18()`, or `DRAFT_ORDER`), and static news items for champion/prizes/meeting/rules/draft date.
- It advanced automatically about every 4.2 seconds, allowed click/Enter/Space to advance manually, and refreshed the standings/item list about every 180 seconds.
- Older ticker versions used `#sportsCrawl`, `#sportsCrawlTrack`, and scrolling `sportsCrawlV20/V21/V22/V23` animations. V27 superseded those.
- In V66, the visible V27 block was removed, the original `ensureTabs()` no longer inserts `#sportsCrawl`, and a final cleanup guard removes any old ticker nodes if delayed scripts try to recreate them.



V67 entrance/team-selection update:
- The main landing page no longer enters a pool immediately when a door is clicked.
- Clicking Basement Bar League or Forever Pool opens a team selector first.
- After a team is selected, the browser stores that choice for the visit and enters the selected bar.
- The selected team is also written into the Pool Updates team-selection keys, so Pool Updates opens as that team.
- The bar Rankings page auto-opens the selected team's trophy case.
- Clicking Leave Bar clears the remembered team choice so the next visit starts fresh.

V67B / V68 POOL UPDATES TEAM ENTRY NOTE
- Pool Updates no longer shows its own team selector.
- The team picked on the main front-door page is saved in browser localStorage for that pool visit.
- Pool Updates reads that selected team and uses it for votes and for new suggestions/polls.
- Suggestions use default vote options if no custom options are entered: Support it, Not for me, Needs discussion.
- Polls still use comma-separated options typed by the submitting team.
- The old fallback ticker sample poll was removed from api/pool-updates.js so removed ticker content does not reappear.

V69 Pool Updates Auto-Refresh
-----------------------------
- Removed the visible "Refresh Questions" button from Pool Updates.
- Pool Updates now auto-checks the shared Redis/API data about every 8 seconds while someone is viewing that room.
- The auto-refresh is quiet: it only redraws the room when questions/votes actually changed, and it avoids wiping the post form while someone is actively typing a new suggestion/poll.

V70 - Pool Updates style lab and mobile cleanup
- Added a Pool Updates "Question Display Style" picker with 10 different card designs:
  1. Neon Chalkboard
  2. Trophy Plaque
  3. Dog Tag Wall
  4. Hockey Card
  5. Jumbotron
  6. Beer Coaster
  7. Locker Room
  8. Draft Folder
  9. Graffiti Brick
  10. Ticket Stub
- Each style uses a different CSS watermark/backdrop treatment behind poll questions.
- The selected style is saved in localStorage per pool/browser, so the page remembers the design choice during normal browsing.
- Mobile layout was tightened: smaller page margins, single-column poll options, smaller dog tags, compressed style picker, and more forgiving wrapping for long option text.
- Auto-refresh behavior from V69 remains unchanged.


V71 Pool Updates dog-tag wall + vote removal
- Added assets/pool-updates-dogtag-wall.png as the fixed watermark/backdrop for each Pool Updates question card.
- Removed the visible V70 style-picker from the page flow so all polls use the dog-tag wall look consistently.
- The question/options are still real HTML text over the image, not baked into the image, so new API poll text fits dynamically.
- Vote behavior now toggles: clicking a different option changes your vote; clicking your already-selected option removes your dog tag/vote.
- API action removeVote was added to /api/pool-updates.js.
