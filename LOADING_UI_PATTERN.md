# 載入提示 / callable 按鈕規範（withLoadingUI + runFn）

> 凡是「按鈕點擊 → 呼叫後端 callable → 回應」的流程，一律走這個 pattern。
> 共用工具在 `public/shared/firebase-bridge.js`（`runFn`）與 `public/shared/ui-dialog.js`
> （`withLoadingUI`、`uiToast` sticky）。i18n busy 文案在 `public/shared/i18n.js` 的 `UI_BUSY` 區塊。

## 標準寫法

```javascript
// binding：把按鈕 b 傳進 handler（若 handler 需要 disable 該列按鈕）
els.forEach(function (b) { b.addEventListener('click', function () { doThing(b.dataset.id, b); }); });

function doThing(id, btn) {
  uiConfirm(window.L('...'), { title: window.L('...'), danger: true }).then(function (ok) {
    if (!ok) return;                                   // 取消 → early return，絕不誤觸 callable
    withLoadingUI(btn, function () { return runFn('someCallable', id, arg2); }, {
      busyText: window.L('uiBusyXxx'),                 // 按鈕忙碌文字
      toastMsg: window.L('uiBusyXxx'),                 // 右上 sticky toast（長任務用）
      toastId: 'thing-' + id,                          // 同一筆連點 → 原地更新不堆疊
      errorTitle: window.L('...')                      // 拋錯時 uiAlert 標題
    }).then(function (res) {
      if (res && res.success) { /* 成功 UI */ reload(); }
      else { uiAlert((res && res.message) || window.L('...')); }   // 業務失敗（res.success=false）
    }).catch(function () {});                            // 拋錯已由 withLoadingUI 顯示，吞掉 rethrow
  });
}
```

## 關鍵規則

1. **`runFn(name, ...args)` 與舊 `google.script.run.…name(...args)` 對後端等價** —— 同 proxy、同 `_argMap`、同位置參數。遷移時務必逐一保留參數順序/數量/值。
2. **業務失敗 vs 拋錯要分清**：`runFn` resolve 出 `{success:false}` 是**業務失敗**（不是 throw）。所以**不要用 `successMsg`**，要在 `.then` 裡依 `res.success` 判斷；真正 throw 的錯由 `withLoadingUI` 的 catch 顯示 uiAlert。否則會「成功 toast 與失敗 alert 同時出現」。
3. **`this` 不是按鈕**：巢狀 `.then(function(ok/typed/name){…})` 內的 `this` 已非按鈕。要在外層 handler 先 `var btn = this;` 再用 `btn`。
4. **延遲分級**：
   - **L1**（<1s 快速切換）：`toast: false`，只 disable 按鈕。
   - **L2**（1–5s）：disable + sticky toast。
   - **L3**（≥5s 或不可逆／金流）：再加 `blockUnload: true`（＋ `disableSelector` 鎖整組相關按鈕）。
5. **導航型成功**（如 `submitPayuni` 建 form 跳轉）放在 callsite 的 `.then` 裡，**不要放進 asyncFn** —— `withLoadingUI` 的 cleanup 會在 `.then` 之前同步還原 `onbeforeunload`，跳轉才不會誤觸自己掛的離開警告。
6. **`btn` 可為 `null`**：成功會整列 reload 的場景（如 deleteTeam）可傳 `null`，只顯示 sticky toast。
7. **不要重複套到既有「✅ Good」按鈕**（已自帶 disable + busy text + 失敗還原的那些）——會雙重 disable／文字互打。
8. **金流不可逆動作**加二次確認（`uiConfirm`）—— 例：退費核准。

## 後端冪等（金流）

前端 disable 只是止血；建立訂單／金流寫入的**根治在後端冪等**。參考
`functions/index.js` 的 `createPayuniOrder`（fail-open 去重：同 user＋同 total＋同 coupon＋
同 `_itemSig`＋`createdTs` 10 分鐘內 → 重用既有 pending order；任何例外 fallback 建新單，
永不擋購買）與 `dailyJobs` 的 `_runExpireStalePendingOrders`（pending＋`createdTs`>24h → expired）。
注意：時間判斷用**數值** `createdTs`，因為 `createdAt`=`fmtNow()` 的 zh-TW 字串無法被 `new Date()` parse。
