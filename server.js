import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = process.env.ADMIN_USER || "markai";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-6-astra";

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16) {
  console.error("Állíts be legalább 16 karakteres ADMIN_PASSWORD értéket a .env fájlban.");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "30kb" }));

// Single-owner Basic Auth gate: protect the dashboard and API.
// For a public multi-customer SaaS, replace this with proper per-user auth.
app.use((req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try { decoded = Buffer.from(encoded, "base64").toString("utf8"); } catch {}
    const splitAt = decoded.indexOf(":");
    const user = decoded.slice(0, splitAt);
    const pass = decoded.slice(splitAt + 1);
    if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="MARKAI Admin", charset="UTF-8"');
  return res.status(401).send("MARKAI login required");
});

app.use("/api/", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/status", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(OPENAI_API_KEY), model: OPENAI_MODEL });
});

app.post("/api/ai", async (req, res) => {
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
    res.json({ text: response.output_text || "Nem érkezett szöveges válasz." });
  } catch (error) {
    console.error("AI request failed:", error?.message || error);
    res.status(502).json({ error: "Az AI-szolgáltatás hibát jelzett. Ellenőrizd az API-kulcsot, a modell-hozzáférést és az API-egyenleget." });
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`MARKAI fut: http://localhost:${PORT}`));
