Fantrax Vercel/GitHub package - v15

Includes:
- Removed broken Matchup History tabs from both pools.
- Added API Checker tab to both pools.
- Added Team Compare tab to both pools.
- Added SportsCenter-style LIVE WIRE ticker below each pool header image.
- Ticker is designed for future news items: draft order, live matchups, commissioner notes, awards, and other updates.
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
