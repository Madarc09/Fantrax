// Shared Pool Updates voting API.
// Requires Redis REST environment variables on Vercel.
// Supports either the newer Upstash names:
//   UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// or the older Vercel KV names:
//   KV_REST_API_URL and KV_REST_API_TOKEN

const DEFAULT_QUESTIONS = {
  bbl: [
    {
      id: 'seed_bbl_awards_ticker',
      question: 'Should we use NHL award winners on the ticker all offseason?',
      options: ['Yes', 'No', 'Only until draft day'],
      creatorTeamId: 'commissioner',
      creatorTeamName: 'Commissioner',
      createdAt: '2026-06-11T00:00:00.000Z',
      votes: {}
    }
  ],
  forever: [
    {
      id: 'seed_forever_awards_ticker',
      question: 'Should we use NHL award winners on the ticker all offseason?',
      options: ['Yes', 'No', 'Only until draft day'],
      creatorTeamId: 'commissioner',
      creatorTeamName: 'Commissioner',
      createdAt: '2026-06-11T00:00:00.000Z',
      votes: {}
    }
  ]
};

function cleanPool(value) {
  const v = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (['basement', 'basementbarleague', 'bbl'].includes(v)) return 'bbl';
  if (['forever', 'foreverpool', 'fp'].includes(v)) return 'forever';
  return v || 'bbl';
}

function redisKey(pool) {
  return `fantrax:pool-updates:${pool}:v1`;
}

function getRedisEnv() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const url = upstashUrl || kvUrl;
  const token = upstashToken || kvToken;
  return {
    url,
    token,
    urlSource: upstashUrl ? 'UPSTASH_REDIS_REST_URL' : (kvUrl ? 'KV_REST_API_URL' : null),
    tokenSource: upstashToken ? 'UPSTASH_REDIS_REST_TOKEN' : (kvToken ? 'KV_REST_API_TOKEN' : null),
    hasUpstashUrl: Boolean(upstashUrl),
    hasUpstashToken: Boolean(upstashToken),
    hasKvUrl: Boolean(kvUrl),
    hasKvToken: Boolean(kvToken)
  };
}


function publicRedisEnvCheck(env) {
  const source = env || getRedisEnv();
  return {
    urlSource: source.urlSource,
    tokenSource: source.tokenSource,
    hasUpstashUrl: Boolean(source.hasUpstashUrl),
    hasUpstashToken: Boolean(source.hasUpstashToken),
    hasKvUrl: Boolean(source.hasKvUrl),
    hasKvToken: Boolean(source.hasKvToken)
  };
}

function looksLikeRedisRestUrl(value) {
  return /^https:\/\/[^\s]+\.upstash\.io\/?$/i.test(String(value || '').trim()) || /^https:\/\/[^\s]+\.upstash\.io\//i.test(String(value || '').trim());
}

async function redisCommand(command) {
  const env = getRedisEnv();
  const url = env.url;
  const token = env.token;
  if (!url || !token) {
    const missing = [];
    if (!url) missing.push('REST URL');
    if (!token) missing.push('REST TOKEN');
    const err = new Error(`Shared voting storage is not configured. Missing ${missing.join(' and ')}. Add either UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN in Vercel, then redeploy.`);
    err.code = 'NO_STORAGE';
    err.details = env;
    throw err;
  }
  if (!looksLikeRedisRestUrl(url)) {
    const err = new Error(`Shared voting storage URL does not look like an Upstash Redis REST URL. Check the value saved in ${env.urlSource || 'the REST URL variable'}. It should start with https:// and include upstash.io.`);
    err.code = 'BAD_STORAGE_URL';
    err.details = env;
    throw err;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = { error: text }; }
  if (!response.ok || data.error) {
    throw new Error(data.error || `Redis command failed with HTTP ${response.status}`);
  }
  return data.result;
}

async function loadQuestions(pool) {
  const raw = await redisCommand(['GET', redisKey(pool)]);
  if (!raw) return DEFAULT_QUESTIONS[pool] || [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function saveQuestions(pool, questions) {
  await redisCommand(['SET', redisKey(pool), JSON.stringify(questions)]);
}

function safeText(value, max) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function safeOptions(options) {
  const arr = Array.isArray(options) ? options : String(options || '').split(',');
  return Array.from(new Set(arr.map(x => safeText(x, 60)).filter(Boolean))).slice(0, 8);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const pool = cleanPool((req.query && req.query.pool) || (req.body && req.body.pool));

  try {
    if (req.method === 'GET') {
      const questions = await loadQuestions(pool);
      return res.status(200).json({ ok: true, pool, shared: true, questions });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const body = req.body || {};
    const action = String(body.action || '').trim();
    const questions = await loadQuestions(pool);

    if (action === 'addQuestion') {
      const question = safeText(body.question, 240);
      const options = safeOptions(body.options);
      const creatorTeamId = safeText(body.creatorTeamId, 80);
      const creatorTeamName = safeText(body.creatorTeamName, 100);
      if (!question || options.length < 2 || !creatorTeamId) {
        return res.status(400).json({ ok: false, error: 'Add a question, at least two options, and select the team creating it.' });
      }
      const item = {
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        question,
        options,
        creatorTeamId,
        creatorTeamName: creatorTeamName || creatorTeamId,
        createdAt: new Date().toISOString(),
        votes: {}
      };
      questions.unshift(item);
      await saveQuestions(pool, questions);
      return res.status(200).json({ ok: true, pool, shared: true, questions, item });
    }

    if (action === 'vote') {
      const questionId = safeText(body.questionId, 80);
      const teamId = safeText(body.teamId, 80);
      const teamName = safeText(body.teamName, 100);
      const option = safeText(body.option, 60);
      const q = questions.find(x => String(x.id) === questionId);
      if (!q) return res.status(404).json({ ok: false, error: 'Question not found.' });
      if (!teamId || !option || !Array.isArray(q.options) || !q.options.includes(option)) {
        return res.status(400).json({ ok: false, error: 'Select a valid team and option.' });
      }
      q.votes = q.votes || {};
      q.votes[teamId] = { option, teamName: teamName || teamId, updatedAt: new Date().toISOString() };
      await saveQuestions(pool, questions);
      return res.status(200).json({ ok: true, pool, shared: true, questions });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    if (err && (err.code === 'NO_STORAGE' || err.code === 'BAD_STORAGE_URL')) {
      return res.status(503).json({
        ok: false,
        shared: false,
        pool,
        error: err.message,
        envCheck: publicRedisEnvCheck(err.details),
        questions: DEFAULT_QUESTIONS[pool] || []
      });
    }
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
};
