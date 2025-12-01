// server.js
//
// 一个非常小的 HTTP API：
// GET  /api/a-entries  -> 读出所有 entries
// POST /api/a-entry    -> 从 body 接收 {spot1, spot2, spot3}，追加一条 entry 并上传到 Neocities

const express = require("express");
const cors = require("cors");

// 引入你刚才写好的“数据库模块”
const { appendEntry, getEntries } = require("./neocities-db-a");

const app = express();
const PORT = process.env.PORT || 3000;

// 允许任何来源访问（开发阶段先开着，之后你可以限制只允许你的域名）
app.use(cors());

// 让 Express 能解析 JSON body
app.use(express.json());

// 测试用
app.get("/", (req, res) => {
  res.send("whispering forest a.html API is running.");
});

// 1) 返回所有 entries
app.get("/api/a-entries", async (req, res) => {
  try {
    const entries = await getEntries();
    res.json(entries);
  } catch (err) {
    console.error("Error in GET /api/a-entries:", err);
    res.status(500).json({ error: "failed_to_get_entries" });
  }
});

// 2) 追加一条 entry
app.post("/api/a-entry", async (req, res) => {
  try {
    const { spot1, spot2, spot3 } = req.body || {};

    // 简单校验：至少得有一项有内容
    if (!spot1 && !spot2 && !spot3) {
      return res
        .status(400)
        .json({ error: "empty_entry", message: "spot1/2/3 all empty" });
    }

    const newEntry = await appendEntry({ spot1, spot2, spot3 });

    res.json({
      ok: true,
      entry: newEntry
    });
  } catch (err) {
    console.error("Error in POST /api/a-entry:", err);
    res.status(500).json({ error: "failed_to_append_entry" });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 API server listening on http://0.0.0.0:${PORT}`);
});