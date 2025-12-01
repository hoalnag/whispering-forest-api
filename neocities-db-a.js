// neocities-db-a.js
// 封装：从 Neocities 读 JSON & 把 JSON 上传回 Neocities

const fs = require("fs");
const path = require("path");
const https = require("https");
const neocities = require("neocities");

// ---- 1. 配置 ----
// 支持两种环境变量名，哪个有值就用哪个：
const NC_USER =
  process.env.NEOCITIES_USER ||
  process.env.NC_USER || // 兼容你之前的配置
  "";

const NC_PASS =
  process.env.NEOCITIES_PASS ||
  process.env.NC_PASS || // 兼容你之前的配置
  "";

// 站点名（就是 whispering-forest，那一部分，不含 .neocities.org）
const SITE_NAME = process.env.SITE_NAME || "whispering-forest";

// 远程 JSON 在 Neocities 里的路径
const REMOTE_JSON_PATH = "data/a_entries.json";

// Railway 容器本地临时 JSON 文件路径
const LOCAL_JSON_PATH = path.join(__dirname, "a_entries.json");

// 用来上传的 Neocities 客户端
let api = null;
if (NC_USER && NC_PASS) {
  api = new neocities(NC_USER, NC_PASS);
  console.log(
    "[Neocities] Init client with user =",
    NC_USER,
    ", hasKey =",
    !!NC_PASS
  );
} else {
  console.warn(
    "[Neocities] WARNING: Missing credentials. Set NEOCITIES_USER / NEOCITIES_PASS or NC_USER / NC_PASS."
  );
}

// ---- 2. 从 Neocities 读取 JSON（用 https GET） ----

function fetchRemoteJson() {
  const url = `https://${SITE_NAME}.neocities.org/${REMOTE_JSON_PATH}`;
  console.log("[Neocities] Fetching remote JSON:", url);

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;

        if (statusCode === 404) {
          console.warn("[Neocities] Remote JSON not found (404). Using [].");
          res.resume(); // 丢弃响应体
          return resolve([]);
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          return reject(
            new Error(
              `Unexpected status code ${statusCode} when fetching ${url}`
            )
          );
        }

        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            if (!raw.trim()) {
              console.warn("[Neocities] Remote JSON empty. Using [].");
              return resolve([]);
            }
            const data = JSON.parse(raw);
            console.log(
              "[Neocities] Remote JSON loaded. Entries:",
              Array.isArray(data) ? data.length : "not array"
            );
            resolve(Array.isArray(data) ? data : []);
          } catch (err) {
            reject(
              new Error("[Neocities] Failed to parse remote JSON: " + err)
            );
          }
        });
      })
      .on("error", (err) => {
        console.error("[Neocities] HTTPS error:", err.message);
        // 网络出错时，可以选择返回本地文件内容或 []
        resolve([]);
      });
  });
}

// ---- 3. 把 entries 写到本地文件，并上传到 Neocities ----

function uploadEntries(entries) {
  if (!api) {
    console.error(
      "[Neocities] Cannot upload: missing credentials (NEOCITIES_USER / NEOCITIES_PASS or NC_USER / NC_PASS)"
    );
    return Promise.reject(
      new Error("Missing Neocities credentials (invalid_auth)")
    );
  }

  // 写本地 JSON
  fs.writeFileSync(
    LOCAL_JSON_PATH,
    JSON.stringify(entries, null, 2),
    "utf8"
  );
  console.log(
    "[Neocities] Local a_entries.json written:",
    LOCAL_JSON_PATH,
    "entries:",
    entries.length
  );

  // 上传
  return new Promise((resolve, reject) => {
    api.upload(
      [
        {
          name: REMOTE_JSON_PATH, // 上传到 Neocities 的路径
          path: LOCAL_JSON_PATH, // 本地文件
        },
      ],
      (resp) => {
        console.log("[Neocities] Upload response:", resp);
        if (resp && resp.result === "success") {
          return resolve(resp);
        }
        const err =
          (resp && resp.message) ||
          "Upload failed (see Neocities response above)";
        reject(new Error(err));
      }
    );
  });
}

// ---- 4. 导出给 server.js 用 ----

async function loadEntries() {
  const entries = await fetchRemoteJson();
  return Array.isArray(entries) ? entries : [];
}

async function saveEntries(entries) {
  await uploadEntries(entries);
}

module.exports = {
  loadEntries,
  saveEntries,
  // 下面这两个给你调试时用（可选）
  _INTERNAL: {
    LOCAL_JSON_PATH,
    SITE_NAME,
  },
};

// 如果单独 node neocities-db-a.js，则只测试一下拉取
if (require.main === module) {
  (async () => {
    try {
      const entries = await loadEntries();
      console.log("[Neocities] CLI test, got entries:", entries.length);
    } catch (err) {
      console.error("[Neocities] CLI test error:", err);
    }
  })();
}