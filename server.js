// server.js
// whispering forest API server for a.html

const express = require("express");
const path = require("path");
const { loadEntries, saveEntries } = require("./neocities-db-a");

const app = express();
const PORT = process.env.PORT || 8080;

// 解析 JSON body
app.use(express.json());

// 简单 CORS（如果你以后从别的域名调这个 API）
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Health check
app.get("/", (req, res) => {
  res.type("text/plain").send("whispering forest a.html API is running.");
});

// GET /api/a-entries  -> 所有人共享的 memory 列表
app.get("/api/a-entries", async (req, res) => {
  try {
    const entries = await loadEntries();
    res.json(entries);
  } catch (err) {
    console.error("[API] Error in GET /api/a-entries:", err);
    res.status(500).json({ error: "Failed to load entries" });
  }
});

// POST /api/a-entry  -> 追加一条新 memory
app.post("/api/a-entry", async (req, res) => {
  try {
    const { spot1, spot2, spot3 } = req.body || {};

    if (
      typeof spot1 !== "string" ||
      typeof spot2 !== "string" ||
      typeof spot3 !== "string"
    ) {
      return res.status(400).json({
        error: "spot1, spot2, spot3 must be strings",
      });
    }

    const now = Date.now();
    const newEntry = {
      id: `entry-${now}`,
      createdAt: now,
      spot1,
      spot2,
      spot3,
    };

    const entries = await loadEntries();
    entries.push(newEntry);

    console.log("[API] Appending new entry:", newEntry);

    await saveEntries(entries);

    res.status(201).json({
      ok: true,
      entry: newEntry,
      total: entries.length,
    });
  } catch (err) {
    console.error("[API] Error in POST /api/a-entry:", err);
    // 如果是 Neocities 鉴权失败，这里也会返回 500，但信息更清楚
    res.status(500).json({ error: err.message || "Failed to save entry" });
  }
});

// 静态文件（可选：如果你把 a.html 放在 Railway 一起跑）
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`🚀 API server listening on http://0.0.0.0:${PORT}`);
});