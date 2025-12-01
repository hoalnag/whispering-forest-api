// server.js
// whispering forest API server for multi scenes (a ~ j)

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

// -------- 工具函数：按 scene 读取 / 写入 --------

// sceneId 只允许 a~j
function normalizeSceneId(raw) {
  const s = String(raw || "").toLowerCase();
  const allowed = "abcdefghij";
  if (!allowed.includes(s)) {
    throw new Error(`Invalid scene id: ${raw}`);
  }
  return s;
}

// 读取某个 scene 的 entries
async function getSceneEntries(sceneId) {
  const scene = normalizeSceneId(sceneId);
  const all = await loadEntries(); // 读整个 JSON（可能包含所有 scene）

  // 兼容旧数据：没有 scene 字段的都当作 scene "a"
  return all
    .filter((entry) => {
      const eScene = entry.scene || "a";
      return eScene === scene;
    })
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// 追加一条某个 scene 的 entry
async function appendSceneEntry(sceneId, { spot1, spot2, spot3 }) {
  const scene = normalizeSceneId(sceneId);
  const all = await loadEntries();

  const now = Date.now();
  const newEntry = {
    id: `entry-${scene}-${now}`,
    scene, // 关键：标记属于哪个 scene
    createdAt: now,
    spot1,
    spot2,
    spot3,
  };

  all.push(newEntry);
  console.log(`[API] Appending new entry for scene ${scene}:`, newEntry);

  await saveEntries(all);

  return {
    newEntry,
    total: all.length,
  };
}

// -------- Health check --------

app.get("/", (req, res) => {
  res
    .type("text/plain")
    .send("whispering forest API (scenes a~j) is running.");
});

// -------- 场景路由：a ~ j 共用一套逻辑 --------

const SCENES = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

SCENES.forEach((sceneId) => {
  // GET /api/x-entries  -> 某个 scene 的 memory 列表
  app.get(`/api/${sceneId}-entries`, async (req, res) => {
    try {
      const entries = await getSceneEntries(sceneId);
      res.json(entries);
    } catch (err) {
      console.error(
        `[API] Error in GET /api/${sceneId}-entries:`,
        err
      );
      res.status(500).json({ error: "Failed to load entries" });
    }
  });

  // POST /api/x-entry  -> 追加一条新 memory 到对应 scene
  app.post(`/api/${sceneId}-entry`, async (req, res) => {
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

      const result = await appendSceneEntry(sceneId, {
        spot1,
        spot2,
        spot3,
      });

      res.status(201).json({
        ok: true,
        entry: result.newEntry,
        total: result.total,
      });
    } catch (err) {
      console.error(
        `[API] Error in POST /api/${sceneId}-entry:`,
        err
      );
      res
        .status(500)
        .json({ error: err.message || "Failed to save entry" });
    }
  });
});

// -------- 静态文件（如果你把 a.html / b.html ... 放在 Railway） --------

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`🚀 API server listening on http://0.0.0.0:${PORT}`);
});