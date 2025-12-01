// neocities-db-a.js (module version with appendEntry & getEntries)
//
// 目标：
// 1. 提供函数 appendEntry(newEntry) —— 追加一条记录并上传到 Neocities
// 2. 提供函数 getEntries() —— 读取线上 JSON 中的所有记录
// 3. 如果直接用 `node neocities-db-a.js` 运行，会自动追加一条测试记录（方便你本地试）

const fs = require("fs");
const path = require("path");
const https = require("https");
const neocities = require("neocities");

// 从环境变量中读取 Neocities 凭据
const NC_USER = process.env.NC_USER;
const NC_PASS = process.env.NC_PASS;
const SITE_NAME = process.env.SITE_NAME || "whispering-forest";

// 本地临时 JSON 文件路径
const LOCAL_JSON_PATH = path.join(__dirname, "a_entries.json");

// 线上 JSON 文件 URL
const REMOTE_JSON_URL = `https://${SITE_NAME}.neocities.org/data/a_entries.json`;

// 初始化 Neocities API 客户端
const api = new neocities(NC_USER, NC_PASS);

// 从线上拉取当前 entries（如果失败就返回 []）
function fetchCurrentEntries() {
  return new Promise((resolve) => {
    https
      .get(REMOTE_JSON_URL, (res) => {
        if (res.statusCode !== 200) {
          console.log(
            `No existing a_entries.json found (status ${res.statusCode}), starting with [].`
          );
          resolve([]);
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
              console.log(`Fetched ${json.length} existing entries.`);
              resolve(json);
            } else {
              console.warn("Existing JSON is not an array, resetting to []");
              resolve([]);
            }
          } catch (e) {
            console.warn("Failed to parse existing JSON, resetting to []");
            resolve([]);
          }
        });
      })
      .on("error", (err) => {
        console.warn("Error fetching existing entries:", err.message);
        console.warn("Starting with empty [].");
        resolve([]);
      });
  });
}

// 把 entries 数组写到本地文件
function saveLocalEntries(entries) {
  fs.writeFileSync(
    LOCAL_JSON_PATH,
    JSON.stringify(entries, null, 2),
    "utf8"
  );
  console.log("Local a_entries.json written:", LOCAL_JSON_PATH);
}

// 用 Neocities API 上传 data/a_entries.json
function uploadEntriesFile() {
  return new Promise((resolve, reject) => {
    api.upload(
      [
        {
          name: "data/a_entries.json", // 站点里的路径
          path: LOCAL_JSON_PATH        // 本地文件路径
        }
      ],
      function (resp) {
        console.log("Upload response:", resp);
        if (resp.result === "success") {
          console.log(
            `✅ Done! Now open: https://${SITE_NAME}.neocities.org/data/a_entries.json`
          );
          resolve(resp);
        } else {
          console.error("❌ Upload failed, check error above.");
          reject(new Error("Upload failed"));
        }
      }
    );
  });
}

// ⭐ 对外暴露：读取所有 entries（以后 server 会用到）
async function getEntries() {
  const entries = await fetchCurrentEntries();
  return entries;
}

// ⭐ 对外暴露：追加一条 entry 并上传
async function appendEntry(newEntry) {
  const entries = await fetchCurrentEntries();

  const entry = {
    id: newEntry.id || "entry-" + Date.now(),
    createdAt: Date.now(),
    spot1: newEntry.spot1 || "",
    spot2: newEntry.spot2 || "",
    spot3: newEntry.spot3 || ""
  };

  console.log("Appending new entry:", entry);
  entries.push(entry);
  console.log(`Total entries after append: ${entries.length}`);

  saveLocalEntries(entries);
  await uploadEntriesFile();

  return entry;
}

// 如果直接 `node neocities-db-a.js` 运行，就跑一个小测试
if (require.main === module) {
  appendEntry({
    spot1: "my girlfriend and I (from CLI test)",
    spot2: "a double cheeseburger and fries",
    spot3: "rainy neon night"
  })
    .then((entry) => {
      console.log("CLI test entry appended:", entry);
    })
    .catch((err) => {
      console.error("Unexpected error in CLI test:", err);
    });
}

// 导出给其他文件用（下一步要在 server.js 里用到）
module.exports = {
  appendEntry,
  getEntries
};