import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const SOFA_BASE = "https://api.sofascore.com/api/v1";

/**
 * 🔴 Jogos ao vivo
 * GET /live
 */
app.get("/live", async (_req, res) => {
  try {
    const r = await fetch(`${SOFA_BASE}/sport/football/events/live`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.sofascore.com/",
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "SofaScore blocked" });
    }

    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "internal error" });
  }
});

/**
 * 👥 Escalações
 * GET /lineups/:eventId
 */
app.get("/lineups/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    const r = await fetch(`${SOFA_BASE}/event/${eventId}/lineups`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.sofascore.com/",
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "Lineups unavailable" });
    }

    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "internal error" });
  }
});

/**
 * 📊 Estatísticas de um jogador
 * GET /player/:eventId/:playerName
 */
app.get("/player/:eventId/:playerName", async (req, res) => {
  try {
    const { eventId, playerName } = req.params;

    const r = await fetch(`${SOFA_BASE}/event/${eventId}/lineups`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.sofascore.com/",
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "Stats unavailable" });
    }

    const data = await r.json();

    // Procura jogador pelo nome
    const normalize = (str = "") =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const findPlayer = (team) => {
      for (const row of team?.players || []) {
        const player = row.player || {};
        const stats = row.statistics || {};
        const name = player.name || player.shortName || "";

        if (
          normalize(name).includes(normalize(playerName)) ||
          normalize(playerName).includes(normalize(name))
        ) {
          return {
            displayName: player.name || playerName,
            playerId: player.id,
            minutes: stats.minutesPlayed || 0,
            tackles: stats.totalTackle || stats.tackles || 0,
            fouls:
              stats.fouls ||
              stats.foulCommitted ||
              stats.totalFoul ||
              0,
            foulsDrawn:
              stats.wasFouled ||
              stats.foulDrawn ||
              stats.foulsWon ||
              0,
            shotsTotal:
              stats.totalShots ||
              stats.shotsTotal ||
              0,
            shotsOnTarget:
              stats.onTargetScoringAttempt ||
              stats.shotsOnTarget ||
              0,
            yellowCards:
              stats.yellowCards || stats.yellowCard || 0,
            redCards: stats.redCards || stats.redCard || 0,
            rating: stats.rating || 0,
          };
        }
      }
      return null;
    };

    const result =
      findPlayer(data.home) || findPlayer(data.away);

    if (!result) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "internal error" });
  }
});

/**
 * Health check
 */
app.get("/", (_req, res) => {
  res.send("Backend SofaScore OK");
});

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
