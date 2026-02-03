import express from "express";
import cors from "cors";
import webpush from "web-push";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const SOFA_BASE = "https://api.sofascore.com/api/v1";
const SOFA_IMG = "https://api.sofascore.app/api/v1";

/* ======================================================
   🔔 PUSH CONFIG (VAPID)
====================================================== */
webpush.setVapidDetails(
  "mailto:admin@livematch.app",
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

const subscriptions = [];

/* ======================================================
   🔔 REGISTRAR PUSH (FRONT → BACKEND)
   POST /push/subscribe
====================================================== */
app.post("/push/subscribe", (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) {
    return res.status(400).json({ error: "Invalid subscription" });
  }

  subscriptions.push(sub);
  res.status(201).json({ success: true });
});

/* ======================================================
   🔔 ENVIAR PUSH REAL
   POST /push/send
====================================================== */
app.post("/push/send", async (req, res) => {
  const { title, body } = req.body;

  const payload = JSON.stringify({
    title: title || "LiveMatch ⚽",
    body: body || "Evento detectado",
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      console.error("Push error:", err);
    }
  }

  res.sendStatus(200);
});

/* ======================================================
   🔴 Jogos ao vivo
   GET /live
====================================================== */
app.get("/live", async (_req, res) => {
  try {
    const r = await fetch(`${SOFA_BASE}/sport/football/events/live`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        Referer: "https://www.sofascore.com/",
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "SofaScore blocked" });
    }

    res.json(await r.json());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

/* ======================================================
   👥 Escalações
   GET /lineups/:eventId
====================================================== */
app.get("/lineups/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    const r = await fetch(`${SOFA_BASE}/event/${eventId}/lineups`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        Referer: "https://www.sofascore.com/",
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "Lineups unavailable" });
    }

    res.json(await r.json());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

/* ======================================================
   📊 Estatísticas do jogador
   GET /player/:eventId/:playerName
====================================================== */
app.get("/player/:eventId/:playerName", async (req, res) => {
  try {
    const { eventId, playerName } = req.params;

    const r = await fetch(`${SOFA_BASE}/event/${eventId}/lineups`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        Referer: "https://www.sofascore.com/",
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "Stats unavailable" });
    }

    const data = await r.json();

    const normalize = (str = "") =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const findPlayer = (team) => {
      for (const row of team?.players || []) {
        const p = row.player || {};
        const s = row.statistics || {};

        const name = p.name || p.shortName || "";
        if (normalize(name).includes(normalize(playerName))) {
          return {
            displayName: name,
            playerId: p.id,
            tackles: s.totalTackle || 0,
            fouls: s.foulCommitted || 0,
            shotsOnTarget: s.onTargetScoringAttempt || 0,
            yellowCards: s.yellowCards || 0,
            rating: s.rating || 0,
          };
        }
      }
      return null;
    };

    const result = findPlayer(data.home) || findPlayer(data.away);
    if (!result) return res.status(404).json({ error: "Player not found" });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

/* ======================================================
   🖼️ Imagem do jogador (proxy)
   GET /player-image/:playerId
====================================================== */
app.get("/player-image/:playerId", async (req, res) => {
  try {
    const r = await fetch(
      `${SOFA_IMG}/player/${req.params.playerId}/image`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!r.ok) return res.status(404).end();

    const buffer = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

/* ======================================================
   ❤️ Health
====================================================== */
app.get("/", (_req, res) => {
  res.send("LiveMatch Backend OK");
});

/* ======================================================
   🚀 START
====================================================== */
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
