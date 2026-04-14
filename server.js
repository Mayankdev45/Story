const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── POST /api/story ─────────────────────────
app.post("/api/story", async (req, res) => {
  const { genre, setting, hero, trait, numScenes } = req.body;

  if (!genre || !setting || !hero || !trait || !numScenes) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const API_KEY = process.env.OPENROUTER_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not set." });
  }

  const systemPrompt = `
You are a master storyteller.

Respond ONLY with a valid JSON object.
Do NOT include markdown, code blocks, or explanations.

Format:
{
  "title": "Story title",
  "byline": "One evocative sentence",
  "scenes": [
    {
      "scene_number": 1,
      "scene_title": "Scene title",
      "paragraphs": ["Paragraph 1", "Paragraph 2"]
    }
  ]
}

Rules:
- EXACTLY ${numScenes} scenes
- Each scene has EXACTLY 2 paragraphs
- Output MUST be valid JSON
`;

  const userPrompt = `
Write a ${genre} story set in ${setting}.
Hero: ${hero}, who is ${trait}.
Create exactly ${numScenes} scenes with cinematic detail.
`;

  try {
    // ── PRIMARY MODEL (70B) ──
    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Mythos Story App"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        max_tokens: 1500,
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    let data = await response.json();

    // ── FALLBACK MODEL (8B) ──
    if (!data.choices) {
      console.log("⚠️ Falling back to 8B model...");

      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          max_tokens: 1200,
          temperature: 0.8,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      data = await response.json();
    }

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "Empty response from OpenRouter." });
    }

    let raw = data.choices[0].message.content || "";
    raw = raw.replace(/```json|```/g, "").trim();

    let story;
    try {
      story = JSON.parse(raw);
    } catch (err) {
      console.error("Invalid JSON:\n", raw);
      return res.status(500).json({ error: "AI returned invalid JSON. Try again." });
    }

    res.json(story);

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to generate story. " + err.message });
  }
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`\n🌟 Server running at http://localhost:${PORT}`);
});