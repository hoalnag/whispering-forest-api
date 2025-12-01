const neocities = require("neocities");

// 把这两个值先手动写死，别用 env 变量
const USER = "whispering-forest";
const KEY  = "qpwoeiruty"; // Account 页面最底下的那串

const api = new neocities(USER, KEY);

api.info((resp) => {
  console.log("Neocities info response:", resp);
});