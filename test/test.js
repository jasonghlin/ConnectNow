import http from "k6/http";
import { check, sleep } from "k6";

// 定義負載測試的選項
export const options = {
  vus: 3000, // 模擬 10 個虛擬使用者
  duration: "5m", // 持續 30 秒
};

// 測試邏輯
export default function () {
  // 進行 API 請求
  const res = http.get("https://www.connectnow.website");

  // 驗證返回狀態碼是否為 200
  check(res, {
    "status was 200": (r) => r.status === 200,
  });

  // 等待 1 秒再執行下一個請求
  sleep(1);
}
