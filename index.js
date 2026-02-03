import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const SOFA_BASE = "https://api.sofascore.com/api/v1";

app.get("/live", async (req, res) => {
  try {
    const r = await fetch(`${SOFA_BASE}/sport/football/events/live`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.sofascore.com/"
      }
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "SofaScore blocked" });
    }

    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "internal error" });
  }
});

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
