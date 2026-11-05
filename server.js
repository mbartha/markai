import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-6-astra";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// The anon/publishable key is intended for browser use. RLS protects user data.
// Never put a service_role/secret key in this application or expose it to the browser.
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:"]
    }
  }
}));
app.use(express.json({ limit: "30kb" }));

// Public, non-secret browser configuration. The Supabase publishable/anon key is designed
// to be public; database permissions must be enforced with Row Level Security (RLS).
app.get("/api/config", (_req, res) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: "A Supabase nincs teljesen beállítva a szerveren." });
  }
  return res.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });
});

app.get("/api/status", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(OPENAI_API_KEY), supabaseConfigured: Boolean(supabase), model: OPENAI_MODEL });
});

// Every protected API request must carry a valid Supabase access token.
async function requireAuth(req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: "A Supabase nincs beállítva a szerveren." });
  }

  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Bejelentkezés szükséges." });
  }

  try {
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data?.user) {
      return res.status(401).json({ error: "A munkamenet lejárt vagy érvénytelen. Jelentkezz be újra." });
    }
    req.user = data.user;
    return next();
  } catch (error) {
    console.error("Authentication check failed:", error?.message || error);
    return res.status(401).json({ error: "A bejelentkezés ellenőrzése nem sikerült." });
  }
}

app.use("/api/", rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

// Supabase configuration diagnostic. It intentionally does not bypass RLS or query
// private tables with elevated credentials. A real sign-up/sign-in is the connection test.
app.get("/api/supabase-status", (_req, res) => {
  res.json({
    configured: Boolean(supabase),
    message: supabase
      ? "Supabase-konfiguráció betöltve. A felhasználói hozzáférést a Supabase Auth és az RLS védi."
      : "Hiányzik a SUPABASE_URL vagy a SUPABASE_ANON_KEY."
  });
});

app.post("/api/ai", requireAuth, async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const language = req.body?.language === "en" ? "English" : "Hungarian";

  if (!prompt || prompt.length > 8000) {
    return res.status(400).json({ error: "A prompt nem lehet üres vagy 8000 karakternél hosszabb." });
  }
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: "Nincs beállítva OPENAI_API_KEY a szerveren." });
  }

  try {
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      instructions: [
        "You are MARKAI, a practical AI business assistant for a small Hungarian business.",
        `Reply in ${language}.`,
        "Help prepare digital product concepts, ethical marketing copy, service offers, and business plans.",
        "Never claim revenue is guaranteed. Distinguish revenue from profit and state assumptions.",
        "Do not publish content, spend money, contact customers, change prices, or initiate payments.",
        "Treat all external actions as drafts that require explicit owner approval.",
        "Avoid deceptive claims, spam, fake reviews, and unlawful marketing."
      ].join(" "),
      input: prompt,
      max_output_tokens: 1200
    });
    return res.json({ text: response.output_text || "Nem érkezett szöveges válasz." });
  } catch (error) {
    console.error("AI request failed:", error?.message || error);
    return res.status(502).json({ error: "Az AI-szolgáltatás hibát jelzett. Ellenőrizd az API-kulcsot, a modell-hozzáférést és az API-egyenleget." });
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`MARKAI fut a ${PORT} porton.`));
