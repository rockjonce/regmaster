# PAYUNI API 規格 — 待補（Phase 6 動工前必填）

> **狀態**：⏳ 待您另行處理（v6 plan 拍板時保留位置）
> **影響 Phase**：Phase 6.9（退款）+ Phase 6.10（對帳）
> **動工前 blocker**：Phase 6 動工前需取得這兩個 API 的官方文件並填寫本檔

---

## 1. PAYUNI Refund API（退款 API）

**用途**：Phase 6.9 `processRefund` callable 內呼叫；退款核准後對 PAYUNI 發退款指令。

### 1.1 來源（待填）

- [ ] PAYUNI 商家後台 → 開發者文件位置：______________
- [ ] API 端點 URL（production）：______________
- [ ] API 端點 URL（sandbox）：______________
- [ ] 認證方式（HashKey/HashIV / API Token / Basic Auth）：______________

### 1.2 Request 參數（待填）

```
POST /api/?  (端點待補)
Content-Type: application/x-www-form-urlencoded  (or application/json?)

必填欄位：
  MerID:        商店代號
  TradeNo:      ?  (PAYUNI 原始 trade no，從 regOrders.payuniTradeNo 拿)
  MerTradeNo:   ?  (商家自訂 order ID，從 regOrders.orderId 拿)
  Amount:       退款金額（元，整數）
  Timestamp:    ?  (Unix timestamp)
  Version:      ?  (API 版本號，如 1.0)

加密欄位（同 createPayuniOrder 模式）：
  EncryptInfo:  payuniEncrypt(params, HashKey, HashIV) 加密後字串
  HashInfo:     payuniHash(EncryptInfo, HashKey, HashIV) 雜湊
```

### 1.3 Response 結構（待填）

```
成功（HTTP 200 + JSON）：
{
  "Status": "SUCCESS"  | "FAIL",
  "Message": "退款成功" | "錯誤訊息",
  "EncryptInfo": "..." (需用 payuniDecrypt 解開)
}

EncryptInfo 解密後（待 PAYUNI 文件確認）：
{
  "MerID": "...",
  "TradeNo": "...",
  "Status": "SUCCESS" | ...,
  "RefundNo": "...",       // 退款單號
  "RefundedAt": "..."      // 退款時間
}
```

### 1.4 錯誤碼對應表（待填）

| PAYUNI 錯誤碼 | 含義 | 應用層處理 |
|---|---|---|
| ? | 訂單不存在 | refund.status = 'failed' / reason = 'payuni_order_not_found' |
| ? | 已退款（重複）| refund.status = 'refunded' / 跳過 |
| ? | 金額超過原訂單 | requestRefund 階段擋下，到不了這 |
| ? | 訂單超過退款時限 | refund.status = 'failed' / reason = 'payuni_refund_window_expired' |

### 1.5 注意事項（待 PAYUNI 文件確認）

- [ ] 是否支援部分退款（partial refund）？單筆訂單可退款幾次？
- [ ] 退款後幾個工作日入帳信用卡？（要寫進 EULA / UI 給報名者看）
- [ ] 退款是否會收手續費（PAYUNI 端）？若有，誰負擔？
- [ ] 退款是否需要在原訂單付款後 N 天內？（180 天？）

### 1.6 實作位置（已預留）

```javascript
// functions/index.js 內預留
async function payuniRefundCall(orderId, amount) {
  // TODO Phase 6.9: 依 PAYUNI Refund API 文件實作
  // - 讀 config/salesConfig 拿 platform PAYUNI 商號
  // - 讀 regOrders/{orderId} 拿 payuniTradeNo
  // - 構造 request、加密、送出
  // - 解析 response、回傳 { success, refundNo, message }
  throw new Error("payuniRefundCall not yet implemented");
}
```

---

## 2. PAYUNI Query Order API（訂單查詢 API）

**用途**：Phase 6.10 `reconcilePendingOrders` cron 用；webhook 失敗時主動查 PAYUNi 訂單狀態補漏。

### 2.1 來源（待填）

- [ ] API 端點 URL（production）：______________
- [ ] API 端點 URL（sandbox）：______________
- [ ] 限頻（rate limit）：______________ requests/sec

### 2.2 Request 參數（待填）

```
POST /api/trade/query?  (端點待補)

必填：
  MerID:        商店代號
  MerTradeNo:   商家 order ID（regOrders.orderId）
  Timestamp:    ?
  Version:      ?

加密：
  EncryptInfo:  payuniEncrypt(params, HashKey, HashIV)
  HashInfo:     payuniHash(EncryptInfo, HashKey, HashIV)
```

### 2.3 Response 結構（待填）

```
{
  "Status": "SUCCESS" | "FAIL",
  "EncryptInfo": "..."  (解密後得 trade 狀態)
}

EncryptInfo 解密後：
{
  "MerTradeNo": "...",
  "TradeNo": "...",            // PAYUNi 內部 trade no
  "TradeStatus": "0" | "1" | "2" | ...,
                                // 0 = 未付款
                                // 1 = 已付款
                                // 2 = 已退款
                                // 3 = 失敗
                                // (確切對應碼需 PAYUNi 文件確認)
  "TradeAmount": 1000,
  "PaidAt": "2026-05-06 12:34:56"
}
```

### 2.4 限頻策略

PAYUNi 通常限 5 requests/sec。Phase 6.10 cron 內已加 200ms sleep（每秒 5 筆）：

```javascript
for (const doc of snap.docs) {
  await processOrder(doc);
  await new Promise(r => setTimeout(r, 200));
}
```

### 2.5 實作位置（已預留）

```javascript
// functions/index.js 內預留
async function queryPayuniOrder(orderId) {
  // TODO Phase 6.10: 依 PAYUNI Query Order API 文件實作
  // - 讀 config/salesConfig 拿 platform PAYUNI 商號
  // - 構造 query request、加密、送出
  // - 解析 response、回傳 {
  //     tradeStatus: "0" | "1" | "2" | "3",
  //     tradeAmount: number,
  //     paidAt: string | null
  //   }
  throw new Error("queryPayuniOrder not yet implemented");
}
```

---

## 3. 取得 API 規格的途徑

1. **PAYUNi 商家後台**（https://www.payuni.com.tw/）登入後：
   - 選單「開發人員 → API 文件」或「技術文件下載」
2. **聯繫 PAYUNi 客服**：02-7706-2099
3. **專屬業務窗口**：簽約時應提供完整 API 文件 PDF

## 4. 完成 checklist（取得規格後）

- [ ] 取得 PAYUNI Refund API 完整規格 PDF
- [ ] 取得 PAYUNI Query Order API 完整規格 PDF
- [ ] 填妥本檔 §1.1-1.5、§2.1-2.4
- [ ] 在 `functions/index.js` 實作 `payuniRefundCall` 與 `queryPayuniOrder`
- [ ] dev 環境用 sandbox 跑通 1 筆退款 + 1 筆對帳
- [ ] 記錄實際呼叫範例（request / response）回本檔附錄供日後維護
