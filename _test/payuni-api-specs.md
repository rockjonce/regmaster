# PAYUNI API 規格（從官方 PHP SDK 推導）

> **狀態**：✅ **規格已就緒**（從 PAYUNi 官方 PHP SDK [PHP_SDK-main](https://github.com/payuni/PHP_SDK) 推導出 Node.js 實作）
> **影響 Phase**：Phase 6.9（退款）+ Phase 6.10（對帳）
> **更新**：2026-05-06

---

## 0. 共用基礎（PHP SDK 已提供）

### 0.1 端點 URL

```
Production: https://api.payuni.com.tw/api/{type}
Sandbox:    https://sandbox-api.payuni.com.tw/api/{type}
```

### 0.2 加密格式（AES-256-GCM）

PHP SDK [PayuniApi.php:293-308](../_dev/payuni_sdk/PHP_SDK-main/src/PayuniApi.php) 顯示：
- **加密**：`AES-256-GCM` with HashKey + HashIV
- **格式**：`bin2hex(encrypted + ':::' + base64(authTag))`
- **解密**：反向操作（split by `':::'`，base64 decode tag，AES decrypt）
- **Hash 驗證**：`SHA-256(HashKey + EncryptedHex + HashIV)` 大寫

### 0.3 既有實作（functions/index.js）

[`functions/index.js:2598-2620`](../functions/index.js:2598) 已有 `payuniEncrypt` / `payuniDecrypt` / `payuniHash` 三個 helper，**沿用即可**。

### 0.4 Common Request 格式

所有 callable 都包這一層：
```javascript
{
  MerID: <平台商號>,
  Version: "1.0",
  EncryptInfo: <hex string>,    // payuniEncrypt(params, key, iv)
  HashInfo: <SHA256 hex>        // payuniHash(EncryptInfo, key, iv)
}
```

POST 用 `application/x-www-form-urlencoded`（PHP SDK 確認）。

---

## 1. PAYUNI Refund API（退款）

### 1.1 用途
Phase 6.9 `processRefund` callable 內呼叫；信用卡退款用 `trade_close` 模式。

### 1.2 端點與模式

| 退款類型 | endpoint type | 用途 |
|---|---|---|
| **trade_close** | `trade/close` | **信用卡請退款**（最常用，本平台主要用這個）|
| trade_cancel | `trade/cancel` | 取消授權（未請款前才用，較少用） |
| trade_refund_icash | `trade/common/refund/icash` | iCash 退款 |
| trade_refund_aftee | `trade/common/refund/aftee` | AFTEE 後支付退款 |
| trade_refund_linepay | `trade/common/refund/linepay` | LINE Pay 退款 |

完整 URL：`https://api.payuni.com.tw/api/trade/close`

### 1.3 Request EncryptInfo（trade_close 退款）

PHP SDK [PayuniApi.php:111-117](../_dev/payuni_sdk/PHP_SDK-main/src/PayuniApi.php#L111) 顯示必填：

```javascript
{
  MerID: <平台商號>,
  TradeNo: <PAYUNi 原始交易序號>,    // 從 regOrders.payuniTradeNo 拿
  CloseType: 1,                       // 1 = 退款；2 = 取消（前未請款才用）
  Timestamp: Math.floor(Date.now() / 1000)
}
```

> ⚠️ **TradeAmt 不需要**：trade_close 退「整筆訂單」，金額由 PAYUNi 從 TradeNo 自動帶。
> 部分退款需用 `trade_close` 多次切割（每次退一部分），或用其他端點視 PAYUNi 文件確認。

### 1.4 Response 結構

從 PHP SDK [PayuniApi.php:174-211](../_dev/payuni_sdk/PHP_SDK-main/src/PayuniApi.php#L174) `ResultProcess()`：

```javascript
{
  Status: "SUCCESS" | "ERROR",
  EncryptInfo: <hex>,    // 解密後是物件
  HashInfo: <SHA256>     // 用同樣 key/iv 驗證
}
```

EncryptInfo 解密後（依 PAYUNi 慣例）：
```javascript
{
  MerID: "...",
  TradeNo: "...",          // 原始交易序號
  Status: "SUCCESS" | "FAIL",
  Message: "退款成功" | "錯誤訊息",
  // 可能有 RefundNo / RefundedAt（待 sandbox 跑通驗證）
}
```

### 1.5 Node.js 實作（直接抄 PHP SDK 邏輯）

```javascript
// functions/index.js
const crypto = require('crypto');
const fetch = require('node-fetch');

async function payuniRefundCall(orderId) {
  const sales = (await db.collection("config").doc("salesConfig").get()).data();
  if (!sales.payuniMerID || !sales.payuniHashKey) {
    return { success: false, message: "平台金流未設定" };
  }

  // 拿 TradeNo（原始 PAYUNi 序號）
  const orderDoc = await db.collection("regOrders").doc(orderId).get();
  if (!orderDoc.exists) {
    return { success: false, message: "訂單不存在" };
  }
  const tradeNo = orderDoc.data().payuniTradeNo;
  if (!tradeNo) {
    return { success: false, message: "缺少 PAYUNi 交易序號" };
  }

  const encryptInfo = {
    MerID: sales.payuniMerID,
    TradeNo: tradeNo,
    CloseType: 1,                                // 退款
    Timestamp: Math.floor(Date.now() / 1000)
  };

  const encStr = payuniEncrypt(encryptInfo, sales.payuniHashKey, sales.payuniHashIV);
  const hashStr = payuniHash(encStr, sales.payuniHashKey, sales.payuniHashIV);

  const params = new URLSearchParams();
  params.append("MerID", sales.payuniMerID);
  params.append("Version", "1.0");
  params.append("EncryptInfo", encStr);
  params.append("HashInfo", hashStr);

  try {
    const res = await fetch("https://api.payuni.com.tw/api/trade/close", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const json = await res.json();

    // 驗 HashInfo
    if (json.EncryptInfo && json.HashInfo) {
      const expected = payuniHash(json.EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
      if (expected !== json.HashInfo) {
        return { success: false, message: "PAYUNi 回應 hash 驗證失敗" };
      }
      const decrypted = payuniDecrypt(json.EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
      return {
        success: decrypted.Status === "SUCCESS",
        txId: decrypted.RefundNo || tradeNo,    // 退款交易 id
        message: decrypted.Message || ""
      };
    }
    return { success: false, message: json.Message || "PAYUNi 回應格式異常" };
  } catch (e) {
    return { success: false, message: "PAYUNi 連線失敗：" + e.message };
  }
}
```

---

## 2. PAYUNI Query Order API（對帳查詢）

### 2.1 用途
Phase 6.10 `reconcilePendingOrders` cron 用；webhook 失敗時主動查狀態。

### 2.2 端點

`https://api.payuni.com.tw/api/trade/query`（type = `trade_query`）

### 2.3 Request EncryptInfo

PHP SDK [Trade.php:31-39](../_dev/payuni_sdk/PHP_SDK-main/examples/trade/Trade.php#L31)：

```javascript
{
  MerID: <平台商號>,
  MerTradeNo: <我們的 orderId>,           // regOrders.orderId
  Timestamp: Math.floor(Date.now() / 1000)
}
```

### 2.4 Response

EncryptInfo 解密後：
```javascript
{
  MerID: "...",
  MerTradeNo: "...",
  TradeNo: "...",                // PAYUNi 內部序號
  TradeStatus: "0" | "1" | "2" | "3",
                                  // 通常 0=未付 / 1=已付 / 2=已退 / 3=失敗
                                  // 確切碼以 sandbox 跑出的回應為準
  TradeAmt: 1000,
  PaidAt: "2026-05-06 12:34:56"
}
```

### 2.5 Node.js 實作

```javascript
async function queryPayuniOrder(orderId) {
  const sales = (await db.collection("config").doc("salesConfig").get()).data();
  const encryptInfo = {
    MerID: sales.payuniMerID,
    MerTradeNo: orderId,
    Timestamp: Math.floor(Date.now() / 1000)
  };
  const encStr = payuniEncrypt(encryptInfo, sales.payuniHashKey, sales.payuniHashIV);
  const hashStr = payuniHash(encStr, sales.payuniHashKey, sales.payuniHashIV);

  const params = new URLSearchParams();
  params.append("MerID", sales.payuniMerID);
  params.append("Version", "1.0");
  params.append("EncryptInfo", encStr);
  params.append("HashInfo", hashStr);

  try {
    const res = await fetch("https://api.payuni.com.tw/api/trade/query", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const json = await res.json();

    if (json.EncryptInfo && json.HashInfo) {
      const expected = payuniHash(json.EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
      if (expected !== json.HashInfo) return null;
      const decrypted = payuniDecrypt(json.EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
      return {
        tradeStatus: decrypted.TradeStatus,
        tradeNo: decrypted.TradeNo,
        tradeAmt: parseInt(decrypted.TradeAmt),
        paidAt: decrypted.PaidAt
      };
    }
    return null;
  } catch (e) {
    console.error("queryPayuniOrder error:", e);
    return null;
  }
}
```

---

## 3. 動工前仍需確認（業務面，N5）

雖然 API 規格已從 SDK 取得，仍有 5 項業務細節需要與 PAYUNi 業務窗口確認：

- [ ] **單一商號代收多商家**：PAYUNi 商號是否容許「子商家」概念？商家描述是否支援動態變更（讓對帳單顯示活動名稱而非「廣天國際」）？
- [ ] **統一發票 B2C 開立規則**：平台收 1000 元，發票該對誰開（報名者 / 主辦方）？平台手續費（30 元）開給主辦方？其餘 970 元由主辦方自開？
- [ ] **月交易量上限**：平台統收後合併交易量是否超出既有商號等級？需升級嗎？
- [ ] **Refund 退款窗口**：trade_close 是否限訂單後 30/90/180 天？逾期需人工處理？
- [ ] **Webhook 重送機制**：PAYUNi 自己會重送幾次？間隔？影響 reconcile cron 設計（重送頻率高→ cron 可拉長間隔）

## 4. 動工 checklist（v7 更新）

- [x] PAYUNi PHP SDK 已取得（`/c/Users/rockj/Desktop/payuni_sdk/PHP_SDK-main/`）
- [x] Refund API endpoint + 參數規格已寫入本檔
- [x] Query Order API endpoint + 參數規格已寫入本檔
- [x] `payuniRefundCall` Node.js 實作草稿完成
- [x] `queryPayuniOrder` Node.js 實作草稿完成
- [ ] 取得 PAYUNi 平台 sandbox merchant ID + HashKey / HashIV
- [ ] 取得 PAYUNi production merchant ID（Kuang-Tien）
- [ ] 與 PAYUNi 業務確認 §3 的 5 項業務細節
- [ ] sandbox 跑通 1 筆完整退款（Phase 11.3 final checklist）
- [ ] sandbox 跑通 1 筆對帳查詢（同上）

## 5. 副本

PHP SDK 副本保存：[`/c/Users/rockj/Desktop/payuni_sdk/PHP_SDK-main/`](../../../../Desktop/payuni_sdk/PHP_SDK-main/)
- `src/PayuniApi.php` — 加解密 + curl 邏輯
- `examples/trade/Trade.php` — trade_query / trade_close / trade_cancel / trade_refund_* 範例
- `README.md` — 模式對照表
