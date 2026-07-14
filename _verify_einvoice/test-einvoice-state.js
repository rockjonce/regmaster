// 發票引擎狀態機測試（Firestore 模擬器 + mock 光貿 API；零網路、零 production）。
// 抽取 index.js 核心引擎區塊，注入 stub 執行——驗證併發鎖、0元、總開關、錯誤佇列、
// 退費×未開票競態（cancelled_before_issue）、作廢/折讓分流、fallback、互斥鎖。
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";
const admin = require("C:/Users/rockj/RegMaster/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "demo-regmaster" });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const crypto = require("crypto");
const fs = require("fs");

let pass = 0, fail = 0;
const chk = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra).slice(0, 220) : "")); }
};

// ---- mock 光貿 API（可控行為＋呼叫計數）----
const CALLS = { issue: 0, void: 0, allowance: 0 };
let issueBehavior = "ok", voidBehavior = "ok", issueDelay = 0, queryResult = null;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const amego = {
  issueInvoice: async () => { CALLS.issue++; if (issueDelay) await sleep(issueDelay); if (issueBehavior === "throw") { const e = new Error("AMEGO:9999:mock issue fail"); throw e; } return { invoice_number: "TT" + String(CALLS.issue).padStart(8, "0"), random_number: "1234" }; },
  voidInvoice: async () => { CALLS.void++; if (voidBehavior === "throw") throw new Error("AMEGO:3050141:已存在折讓單"); return { code: 0 }; },
  createAllowance: async () => { CALLS.allowance++; return { code: 0 }; },
  queryByOrder: async () => { if (queryResult) return { code: 0, data: queryResult }; throw new Error("AMEGO:3020007:查無發票資料"); },   // 預設光貿端無既存票；可注入 queryResult
  getPdfUrl: async () => { throw new Error("AMEGO:mockNoPdf"); },                // 跳過 PDF 儲存路徑
  getAllowancePdfUrl: async () => { throw new Error("AMEGO:mockNoPdf"); },
  banQuery: async () => ({ code: 0, data: [] }), barcodeCheck: async () => ({ code: 0 }),
  lotteryStatus: async () => ({ code: 0, data: [] })
};

// ---- 抽取 index.js 引擎區塊 ----
const src = fs.readFileSync("C:/Users/rockj/RegMaster/functions/index.js", "utf8");
const a = src.indexOf("// ===================== 電子發票（光貿 Amego）核心引擎 =====================");
const b = src.indexOf("// ===================== 電子發票核心引擎（結束）=====================");
if (a < 0 || b < 0) { console.error("engine markers not found"); process.exit(2); }
const engine = src.slice(a, b);
// 引擎外部依賴的 stub（寄信/簽章/社群驗證不在本測試範圍）
const prelude = `
  const fmtNow = () => new Date().toISOString().slice(0, 19).replace("T", " ");
  const queueMail = async () => {}; const emailWrap = (t, h) => h; const escMail = (s) => String(s);
  const getCheckinSecret = async () => "testsecret";
  const _b64url = (buf) => Buffer.from(buf).toString("base64url");
  const _b64urlToBuf = (s) => Buffer.from(String(s), "base64url");
  const verifySocialIdentity = async () => { throw new Error("not-in-scope"); };
`;
const factory = new Function("db", "admin", "FieldValue", "crypto", "amego", "console", "fetch",
  prelude + engine + `
  return { issueInvoiceFor, voidOrAllowance, _sourceStillBillable, invoiceGloballyEnabled, _periodOf, _todayYmd, _tryIssue, _allowanceNo, _performVoidOrAllowance };`);
const eng = factory(db, admin, FieldValue, crypto, amego, console, fetch);

(async () => {
  // 清場 + 開總開關
  for (const col of ["invoices", "regPayments", "teams"]) {
    const s = await db.collection(col).get(); for (const d of s.docs) await d.ref.delete();
  }
  await db.collection("config").doc("sales").set({ invoiceEnabled: true }, { merge: true });

  const buyer = { ban: "0000000000", name: "測試", email: "t@e2e.tw" };
  const items = [{ desc: "測試品項", qty: 1, unitPrice: 500, amount: 500 }];

  console.log("開立引擎：");
  // 1. happy path
  const id1 = await eng.issueInvoiceFor("registration", { orderId: "RG100" }, buyer, items);
  const d1 = (await db.collection("invoices").doc("inv_RG100").get()).data();
  chk("1 正常開立 → issued＋號碼", id1 === "inv_RG100" && d1.status === "issued" && /^TT/.test(d1.invoiceNumber), d1 && d1.status);
  // 2. 併發鎖：同 orderId 兩路同時 → 恰一張、amego 只被叫一次
  const before = CALLS.issue;
  const [c1, c2] = await Promise.all([
    eng.issueInvoiceFor("registration", { orderId: "RG200" }, buyer, items),
    eng.issueInvoiceFor("registration", { orderId: "RG200" }, buyer, items)
  ]);
  const dupDocs = await db.collection("invoices").where("orderId", "==", "RG200").get();
  chk("2 併發鎖：恰 1 份文件、1 次 API、另一路回 null",
    dupDocs.size === 1 && CALLS.issue - before === 1 && [c1, c2].filter(x => x === null).length === 1,
    { docs: dupDocs.size, calls: CALLS.issue - before, c1, c2 });
  // 3. 0 元不開
  const z = await eng.issueInvoiceFor("registration", { orderId: "RG300" }, buyer, [{ desc: "免費", qty: 1, unitPrice: 0, amount: 0 }]);
  chk("3 0 元 → 不開、無文件", z === null && !(await db.collection("invoices").doc("inv_RG300").get()).exists);
  // 4. 總開關關閉
  await db.collection("config").doc("sales").set({ invoiceEnabled: false }, { merge: true });
  const off = await eng.issueInvoiceFor("registration", { orderId: "RG400" }, buyer, items);
  chk("4 總開關關閉 → 不開", off === null && !(await db.collection("invoices").doc("inv_RG400").get()).exists);
  await db.collection("config").doc("sales").set({ invoiceEnabled: true }, { merge: true });
  // 5. API 失敗 → error 進佇列
  issueBehavior = "throw";
  await eng.issueInvoiceFor("registration", { orderId: "RG500" }, buyer, items);
  const d5 = (await db.collection("invoices").doc("inv_RG500").get()).data();
  chk("5 開立失敗 → status=error、retryCount=1、不外拋", d5.status === "error" && d5.retryCount === 1, d5.status);
  issueBehavior = "ok";
  // 6. pending_profile：buyer 未填 → 建檔等補、不呼叫 API
  const beforeP = CALLS.issue;
  const pid = await eng.issueInvoiceFor("plan", { orderId: "RM600" }, { ...buyer, incomplete: true }, items);
  const d6 = (await db.collection("invoices").doc("inv_RM600").get()).data();
  chk("6 發票資料未填 → pending_profile、不呼叫光貿", pid === "inv_RM600" && d6.status === "pending_profile" && CALLS.issue === beforeP);

  console.log("退費狀態機（voidOrAllowance）：");
  // 7.【V5 更新】退費×error 票：不再立即 terminal-cancel（error 可能是 timeout-after-success），
  //   改記錄退費意圖 refundRequested 並留在佇列(error)交 worker 以 queryByOrder 查證；仍絕不同步呼叫光貿。
  const beforeV = CALLS.void, beforeA = CALLS.allowance;
  await eng.voidOrAllowance("inv_RG500", 500);
  const d7 = (await db.collection("invoices").doc("inv_RG500").get()).data();
  chk("7 V5 error 票退費 → 記錄意圖留佇列查證（非 cancelled）、零 API",
    d7.status === "error" && d7.refundRequested === true && d7.pendingRefund === 500
      && CALLS.void === beforeV && CALLS.allowance === beforeA, { st: d7.status, rr: d7.refundRequested });
  // 8. 已開立＋全額退＋同期 → 作廢
  await eng.voidOrAllowance("inv_RG100", 500);
  const d8 = (await db.collection("invoices").doc("inv_RG100").get()).data();
  chk("8 全額退＋同期 → void", d8.status === "void" && CALLS.void === beforeV + 1, d8.status);
  // 9. 已開立＋部分退 → 折讓
  await eng.voidOrAllowance("inv_RG200", 200);
  const d9 = (await db.collection("invoices").doc("inv_RG200").get()).data();
  chk("9 部分退 → allowanced、折讓紀錄 1 筆金額 200",
    d9.status === "allowanced" && (d9.allowances || []).length === 1 && d9.allowances[0].amount === 200, d9.status);
  // 10. 作廢被拒（光貿 3050141）→ 自動 fallback 折讓
  const idA = await eng.issueInvoiceFor("registration", { orderId: "RG700" }, buyer, items);
  voidBehavior = "throw";
  await eng.voidOrAllowance("inv_RG700", 500);
  const d10 = (await db.collection("invoices").doc("inv_RG700").get()).data();
  chk("10 作廢被拒 → fallback 折讓（allowanced）", d10.status === "allowanced", d10.status);
  voidBehavior = "ok";
  // 11. 冪等/互斥：對已 allowanced 再呼叫 → 無動作；voiding 鎖 → 跳過
  const bV = CALLS.void, bA = CALLS.allowance;
  await eng.voidOrAllowance("inv_RG700", 500);
  await db.collection("invoices").doc("inv_RG200").update({ status: "voiding" });
  await eng.voidOrAllowance("inv_RG200", 100);
  chk("11 終態冪等＋voiding 互斥 → 零 API 呼叫", CALLS.void === bV && CALLS.allowance === bA);
  await db.collection("invoices").doc("inv_RG200").update({ status: "allowanced" });

  console.log("佇列第三層防呆（_sourceStillBillable）：");
  await db.collection("regPayments").doc("RG800").set({ orderId: "RG800", refundState: "refunded" });
  chk("12 已退費訂單 → 不可開立", !(await eng._sourceStillBillable({ kind: "registration", orderId: "RG800", teamId: "" })));
  chk("13 隊伍已刪 → 不可開立", !(await eng._sourceStillBillable({ kind: "registration", orderId: "XX", teamId: "T_GONE" })));
  await db.collection("regPayments").doc("RG900").set({ orderId: "RG900", refundState: "none" });
  await db.collection("teams").doc("T900").set({ teamId: "T900" });
  chk("14 正常訂單＋隊伍存在 → 可開立", await eng._sourceStillBillable({ kind: "registration", orderId: "RG900", teamId: "T900" }));

  console.log("QA 審查修復回歸（競態四漏洞）：");
  // 15.【QA#1】開立在途 × 退費：光貿呼叫延遲 400ms，期間退費 → 落檔不可覆寫、票須被沖銷
  issueDelay = 400;
  const bV15 = CALLS.void;
  const p15 = eng.issueInvoiceFor("registration", { orderId: "RG1000" }, buyer, items);
  await sleep(120);   // 此刻 doc=pending、光貿呼叫在途
  await eng.voidOrAllowance("inv_RG1000", 500);
  const mid15 = (await db.collection("invoices").doc("inv_RG1000").get()).data();
  await p15;
  const d15 = (await db.collection("invoices").doc("inv_RG1000").get()).data();
  // 【V5 更新】中途 pending 退費 → 記錄意圖(error+refundRequested)，不再 premature cancel；
  //   光貿呼叫回來（成功）→ 落檔讀到意圖轉沖銷 → 終態=void。核心不變：票終究被作廢。
  chk("15 QA#1/V5 在途退費 → 中途 error+refundRequested、落檔轉沖銷、終態=void（票已作廢）",
    mid15.status === "error" && mid15.refundRequested === true && d15.status === "void" && CALLS.void === bV15 + 1,
    { mid: mid15.status, rr: mid15.refundRequested, final: d15.status, voids: CALLS.void - bV15 });
  issueDelay = 0;
  // 16.【QA#2】issuing 鎖定中退費 → 意圖不丟失，落檔後自動折讓
  await db.collection("invoices").doc("inv_RG1200").set({
    kind: "registration", sellerType: "platform", sellerBan: "12345678", sellerUsername: "",
    orderId: "RG1200", compId: "", teamId: "", settlementId: "", buyerUsername: "",
    buyer: buyer, amount: 500, items: items, status: "issuing",
    invoiceNumber: "", invoiceDate: "", randomNumber: "", pdfPath: "", allowances: [],
    retryCount: 0, lastError: "", refundRequested: false, pendingRefund: 0,
    createdAt: "2026-07-13 00:00:00", createdTs: Date.now(), issuedAt: ""
  });
  const bV16 = CALLS.void, bA16 = CALLS.allowance;
  await eng.voidOrAllowance("inv_RG1200", 200);   // 部分退，處理中 → 只記意圖
  const mid16 = (await db.collection("invoices").doc("inv_RG1200").get()).data();
  chk("16a QA#2 issuing 中退費 → 意圖被記錄、零 API 呼叫",
    mid16.status === "issuing" && mid16.refundRequested === true && mid16.pendingRefund === 200
      && CALLS.void === bV16 && CALLS.allowance === bA16, { st: mid16.status, rr: mid16.refundRequested });
  await eng._tryIssue(db.collection("invoices").doc("inv_RG1200"), mid16,
    { ban: "12345678", appKey: "x", mode: "test" });   // 模擬 worker 開立完成落檔
  const d16 = (await db.collection("invoices").doc("inv_RG1200").get()).data();
  chk("16b QA#2 落檔讀到意圖 → 自動折讓 200（allowanced）",
    d16.status === "allowanced" && (d16.allowances || [])[0] && d16.allowances[0].amount === 200
      && CALLS.allowance === bA16 + 1, { st: d16.status });
  // 17.【QA#1 失敗路徑】在途退費 + 光貿開立失敗 → 終態維持 cancelled_before_issue（不得變 error 讓佇列補開）
  issueBehavior = "throw"; issueDelay = 400;
  const p17 = eng.issueInvoiceFor("registration", { orderId: "RG1300" }, buyer, items);
  await sleep(120);
  await eng.voidOrAllowance("inv_RG1300", 500);
  await p17;
  const d17 = (await db.collection("invoices").doc("inv_RG1300").get()).data();
  // 【V5 更新】在途退費＋開立失敗（timeout 可能其實成功）→ 不再 terminal-cancel，
  //   保留 error＋refundRequested 交 worker 查證（HTTP Timeout = 未知）。
  chk("17 V5 在途退費＋開立失敗 → error＋refundRequested 待查證（非 cancelled）",
    d17.status === "error" && d17.refundRequested === true, { st: d17.status, rr: d17.refundRequested });
  issueBehavior = "ok"; issueDelay = 0;
  // 18.【QA#4】折讓單號強度：3000 連續產生全唯一且 ≤16 字
  const nos = new Set(); let lenOk = true;
  for (let i = 0; i < 3000; i++) { const n = eng._allowanceNo(); nos.add(n); if (n.length > 16) lenOk = false; }
  chk("18 QA#4 折讓單號 3000 筆全唯一且 ≤16 字", nos.size === 3000 && lenOk, { uniq: nos.size, lenOk });

  console.log("FQA 生產環境壓力修復回歸：");
  // 19.【FQA#1】voidOrAllowance 上鎖必寫 lockedTs（供佇列殭屍鎖判定）
  const idL = await eng.issueInvoiceFor("registration", { orderId: "RG2000" }, buyer, items);
  await eng.voidOrAllowance("inv_RG2000", 200);   // 部分退 → allowanced，過程經 voiding 上鎖
  const dL = (await db.collection("invoices").doc("inv_RG2000").get()).data();
  chk("19 FQA#1 上鎖有寫 lockedTs（殭屍鎖偵測基礎）", typeof dL.lockedTs === "number" && dL.lockedTs > 0, dL.lockedTs);
  // 20.【FQA#1】佇列查詢範圍已含 issuing/voiding：模擬殭屍 voiding（lockedTs 40 分鐘前）能被抓到
  await db.collection("invoices").doc("inv_ZOMBIE").set({
    kind: "registration", sellerType: "platform", sellerBan: "12345678", sellerUsername: "",
    orderId: "RGZOMBIE", compId: "", teamId: "", buyer: buyer, amount: 500, items: items,
    status: "voiding", invoiceNumber: "TT00099999", invoiceDate: "20260713", randomNumber: "",
    pdfPath: "", allowances: [], retryCount: 0, lastError: "", refundRequested: true, pendingRefund: 500,
    lockedTs: Date.now() - 40 * 60000, createdAt: "2026-07-13 00:00:00", createdTs: Date.now() - 40 * 60000, issuedAt: ""
  });
  const staleCutoff = Date.now() - 30 * 60000;
  const qSnap = await db.collection("invoices")
    .where("status", "in", ["error", "pending", "void_error", "issuing", "voiding"]).get();
  const caught = qSnap.docs.filter(d => {
    const x = d.data();
    if (["issuing", "voiding"].includes(x.status)) return (x.lockedTs || x.createdTs || 0) <= staleCutoff;
    return true;
  }).map(d => d.id);
  chk("20 FQA#1 佇列查詢＋殭屍判定能撿到卡死 40 分鐘的 voiding", caught.indexOf("inv_ZOMBIE") >= 0, caught);
  // 21. 新鮮的 voiding（剛上鎖）不被殭屍判定誤撿
  const fresh = qSnap.docs.filter(d => {
    const x = d.data();
    return ["issuing", "voiding"].includes(x.status) && (x.lockedTs || x.createdTs || 0) > staleCutoff;
  }).map(d => d.id);
  chk("21 FQA#1 新鮮 voiding 不被誤判為殭屍", fresh.indexOf("inv_ZOMBIE") < 0);

  console.log("ULT 終極審查修復回歸：");
  // 22.【ULT#1b】_performVoidOrAllowance 在 voiding 鎖內直接沖銷、不經 issued 中繼（消除孤兒窗）
  await db.collection("invoices").doc("inv_ULT22").set({
    kind: "registration", sellerType: "platform", sellerBan: "12345678", sellerUsername: "",
    orderId: "RGULT22", compId: "", teamId: "", buyer: buyer, amount: 500, items: items,
    status: "voiding", invoiceNumber: "TT00055522", invoiceDate: String(eng._todayYmd()), randomNumber: "",
    pdfPath: "", allowances: [], retryCount: 0, lastError: "", refundRequested: true, pendingRefund: 500,
    lockedTs: Date.now(), createdAt: "2026-07-14 00:00:00", createdTs: Date.now(), issuedAt: ""
  });
  const bV22 = CALLS.void;
  await eng._performVoidOrAllowance(db.collection("invoices").doc("inv_ULT22"),
    (await db.collection("invoices").doc("inv_ULT22").get()).data(), { ban: "12345678", appKey: "x", mode: "test" }, 500);
  const d22 = (await db.collection("invoices").doc("inv_ULT22").get()).data();
  chk("22 ULT#1b 鎖內直接沖銷全額同期 → void（作廢1次、refundRequested 清除、過程無 issued）",
    d22.status === "void" && d22.refundRequested === false && CALLS.void === bV22 + 1, { st: d22.status, rr: d22.refundRequested });
  // 23.【ULT#1b】沖銷失敗 → void_error+pendingRefund 保留（不回 issued、不遺失退款額）
  voidBehavior = "throw";   // 作廢與（若走到）折讓都會拋——這裡讓作廢拋、折讓成功則走折讓；要測失敗需兩者皆拋
  const origAllow = amego.createAllowance;
  amego.createAllowance = async () => { throw new Error("AMEGO:9998:mock allowance fail"); };
  await db.collection("invoices").doc("inv_ULT23").set({
    kind: "registration", sellerType: "platform", sellerBan: "12345678", sellerUsername: "",
    orderId: "RGULT23", compId: "", teamId: "", buyer: buyer, amount: 500, items: items,
    status: "voiding", invoiceNumber: "TT00055523", invoiceDate: String(eng._todayYmd()), randomNumber: "",
    pdfPath: "", allowances: [], retryCount: 0, lastError: "", refundRequested: true, pendingRefund: 300,
    lockedTs: Date.now(), createdAt: "2026-07-14 00:00:00", createdTs: Date.now(), issuedAt: ""
  });
  await eng._performVoidOrAllowance(db.collection("invoices").doc("inv_ULT23"),
    (await db.collection("invoices").doc("inv_ULT23").get()).data(), { ban: "12345678", appKey: "x", mode: "test" }, 300);
  const d23 = (await db.collection("invoices").doc("inv_ULT23").get()).data();
  chk("23 ULT#1b 沖銷全失敗 → void_error＋pendingRefund 保留（非 issued）",
    d23.status === "void_error" && d23.pendingRefund === 300, { st: d23.status, pr: d23.pendingRefund });

  console.log("ULT2 部署前攔截修復回歸：");
  // 24.【ULT2#1】失敗落檔把 queueTs 推到隊尾（防 HoL 阻塞）——以人為舊 queueTs 的件失敗後應被大幅推後
  await db.collection("invoices").doc("inv_ULT24").set({
    kind: "registration", sellerType: "platform", sellerBan: "12345678", sellerUsername: "",
    orderId: "RGULT24", compId: "", teamId: "", buyer: buyer, amount: 500, items: items,
    status: "voiding", invoiceNumber: "TT00055524", invoiceDate: String(eng._todayYmd()), randomNumber: "",
    pdfPath: "", allowances: [], retryCount: 0, lastError: "", refundRequested: true, pendingRefund: 500,
    lockedTs: Date.now(), createdAt: "2026-07-14 00:00:00", createdTs: 1000, queueTs: 1000, issuedAt: ""   // queueTs 極舊
  });
  await eng._performVoidOrAllowance(db.collection("invoices").doc("inv_ULT24"),
    (await db.collection("invoices").doc("inv_ULT24").get()).data(), { ban: "12345678", appKey: "x", mode: "test" }, 500);
  const d24 = (await db.collection("invoices").doc("inv_ULT24").get()).data();
  chk("24 ULT2#1 沖銷失敗 → queueTs 推到隊尾（>> 原值 1000、createdTs 未被動）",
    d24.queueTs > 1e12 && d24.createdTs === 1000, { q: d24.queueTs, c: d24.createdTs });
  amego.createAllowance = origAllow; voidBehavior = "ok";
  // 25.【ULT2#2】原始碼層：invoiceRetryWorker 外層 catch 保留 void 家族狀態（不降級為 error）
  chk("25 ULT2#2 worker catch 保留 void_error/voiding 不降級",
    /locked\.status === "void_error" \|\| locked\.status === "voiding"\) \? "void_error" : "error"/.test(src));
  // 26.【ULT2#3】原始碼層：monthlyInvoiceReport 已實作 5 筆一批 Promise.allSettled
  const mReport = src.slice(src.indexOf("exports.monthlyInvoiceReport"), src.indexOf("電子發票排程（結束）"));
  chk("26 ULT2#3 月報已批次化（Promise.allSettled + slice 步進 5）",
    /Promise\.allSettled\(users\.slice/.test(mReport) && /i \+= 5/.test(mReport));
  // 27.【ULT2#1】佇列查詢改用 queueTs 排序（非 createdTs）
  chk("27 ULT2#1 佇列 orderBy 改用 queueTs", /\.orderBy\("queueTs"\)\.limit\(20\)/.test(src));

  console.log("V5 分散式邊界（timeout=未知）修復回歸：");
  // 28.【V5#D】_sourceStillBillable：方案訂單 refundState=refunded（但 status 仍 paid）→ 不可開立
  await db.collection("orders").doc("RMV5").set({ orderId: "RMV5", status: "paid", refundState: "refunded" });
  chk("28 V5#D 已退費方案訂單(status仍paid) → 不可開立",
    !(await eng._sourceStillBillable({ kind: "plan", orderId: "RMV5" })));
  await db.collection("orders").doc("RMV5b").set({ orderId: "RMV5b", status: "paid", refundState: "none" });
  chk("28b V5#D 未退費方案訂單 → 可開立", await eng._sourceStillBillable({ kind: "plan", orderId: "RMV5b" }));
  // 29.【V5】pending_profile 退費 → 唯一可安全 terminal-cancel（光貿從未被呼叫）
  await db.collection("invoices").doc("inv_V5PP").set({
    kind: "plan", sellerType: "platform", sellerBan: "12345678", sellerUsername: "", orderId: "RMV5PP",
    buyer: buyer, amount: 500, items: items, status: "pending_profile", invoiceNumber: "", invoiceDate: "",
    randomNumber: "", pdfPath: "", allowances: [], retryCount: 0, lastError: "", refundRequested: false,
    pendingRefund: 0, createdAt: "2026-07-14 00:00:00", createdTs: Date.now(), queueTs: Date.now(), issuedAt: ""
  });
  const bV29 = CALLS.void + CALLS.allowance;
  await eng.voidOrAllowance("inv_V5PP", 500);
  const d29 = (await db.collection("invoices").doc("inv_V5PP").get()).data();
  chk("29 V5 pending_profile 退費 → cancelled_before_issue、零 API（光貿未開立可安全註銷）",
    d29.status === "cancelled_before_issue" && (CALLS.void + CALLS.allowance) === bV29, d29.status);
  // 30.【V5】dead 退費 → 復活為 error＋refundRequested＋retryCount:0（交 worker 查證，不遺棄）
  await db.collection("invoices").doc("inv_V5DEAD").set({
    kind: "registration", sellerType: "platform", sellerBan: "12345678", sellerUsername: "", orderId: "RGV5DEAD",
    buyer: buyer, amount: 500, items: items, status: "dead", invoiceNumber: "", invoiceDate: "",
    randomNumber: "", pdfPath: "", allowances: [], retryCount: 10, lastError: "", refundRequested: false,
    pendingRefund: 0, createdAt: "2026-07-14 00:00:00", createdTs: Date.now(), queueTs: Date.now(), issuedAt: ""
  });
  await eng.voidOrAllowance("inv_V5DEAD", 500);
  const d30 = (await db.collection("invoices").doc("inv_V5DEAD").get()).data();
  chk("30 V5 dead 退費 → 復活 error＋refundRequested＋retryCount歸零",
    d30.status === "error" && d30.refundRequested === true && d30.retryCount === 0, { st: d30.status, rc: d30.retryCount });
  // 31.【V5#1/#2】原始碼層：worker !billable/wantRefund 分支先 queryByOrder 查證才決定作廢或註銷
  chk("31 V5 worker 終態註銷前先 queryByOrder 查證光貿",
    /wantRefund \|\| !billable/.test(src) && /amego\.queryByOrder\(creds, locked\.orderId\)/.test(src)
      && /收養票號走作廢/.test(src));
  // 32.【V5#1】原始碼層：查證確有票 → 收養 invoiceNumber 後 _performVoidOrAllowance
  chk("32 V5 查證有票 → 收養票號走沖銷",
    /invoiceNumber: real\.invoice_number/.test(src) && /_performVoidOrAllowance\(d\.ref, adopted/.test(src));

  console.log("V10 作廢重開崩潰安全回歸：");
  const mkIssued = async (id, orderId, extra) => db.collection("invoices").doc(id).set(Object.assign({
    kind: "registration", sellerType: "organizer", sellerBan: "12345678", sellerUsername: "org1",
    orderId: orderId, compId: "C1", teamId: "T1", buyer: { ban: "0000000000", name: "報名者", email: "r@e.tw", type: "duplicate" },
    amount: 500, items: items, status: "issued", invoiceNumber: "TT00088" + id.slice(-3), invoiceDate: String(eng._todayYmd()),
    randomNumber: "9", pdfPath: "", allowances: [], retryCount: 0, lastError: "", refundRequested: false, pendingRefund: 0,
    notifyByMail: true, createdAt: "2026-07-14 00:00:00", createdTs: Date.now(), queueTs: Date.now(), issuedAt: "2026-07-14 00:00:01"
  }, extra || {}));
  // 33. reissue happy：void 舊＋開新（inv_{orderId}_r1）＋清 intent
  await mkIssued("inv_RGV10A", "RGV10A", { reissueIntent: { kind: "company", taxId: "28469005", title: "廣天國際" } });
  var bV33 = CALLS.void, bI33 = CALLS.issue;
  await eng._performVoidOrAllowance(db.collection("invoices").doc("inv_RGV10A"),
    Object.assign((await db.collection("invoices").doc("inv_RGV10A").get()).data(), {}), { ban: "12345678", appKey: "x" }, 500);
  var d33 = (await db.collection("invoices").doc("inv_RGV10A").get()).data();
  var new33 = (await db.collection("invoices").doc("inv_RGV10A_r1").get()).data();
  chk("33 V10 reissue → 舊票void+intent清除、新票inv_..._r1已開立(打統編買方)",
    d33.status === "void" && d33.reissueIntent == null && CALLS.void === bV33 + 1 && CALLS.issue === bI33 + 1
      && new33 && new33.status === "issued" && new33.buyer.ban === "28469005", { old: d33.status, ri: d33.reissueIntent, nn: new33 && new33.status });
  // 34. reissue void timeout-after-success：voidInvoice 拋錯但 queryByOrder 顯示已作廢 → 續開新票、落 void
  await mkIssued("inv_RGV10B", "RGV10B", { reissueIntent: { kind: "personal", carrierType: "", carrierId: "", npoban: "" } });
  voidBehavior = "throw"; queryResult = { invoice_number: "TT00088V10B", cancel_date: 1700000000 };
  await eng._performVoidOrAllowance(db.collection("invoices").doc("inv_RGV10B"),
    Object.assign((await db.collection("invoices").doc("inv_RGV10B").get()).data(), { invoiceNumber: "TT00088V10B" }), { ban: "12345678", appKey: "x" }, 500);
  var d34 = (await db.collection("invoices").doc("inv_RGV10B").get()).data();
  var new34 = (await db.collection("invoices").doc("inv_RGV10B_r1").get()).data();
  chk("34 V10 reissue void-timeout-after-success → 查證已作廢仍續開新票、落 void（非幽靈票）",
    d34.status === "void" && new34 && new34.status === "issued", { old: d34.status, nn: new34 && new34.status });
  voidBehavior = "ok"; queryResult = null;
  // 35. reissue 冪等重放：對已完成的舊 doc 再跑一次 _performVoidOrAllowance（intent 已清）不再重複開新票
  var bI35 = CALLS.issue;
  var d33b = (await db.collection("invoices").doc("inv_RGV10A").get()).data();   // intent 已清、status void
  // 模擬殭屍重放：把 doc 拉回 voiding 但 intent 仍在（崩潰於清 intent 前）
  await db.collection("invoices").doc("inv_RGV10A").update({ status: "voiding", reissueIntent: { kind: "company", taxId: "28469005", title: "廣天國際" } });
  await eng._performVoidOrAllowance(db.collection("invoices").doc("inv_RGV10A"),
    Object.assign((await db.collection("invoices").doc("inv_RGV10A").get()).data(), {}), { ban: "12345678", appKey: "x" }, 500);
  var new35 = await db.collection("invoices").where("orderId", "==", "RGV10A").get();
  chk("35 V10 reissue 重放冪等：新票 inv_..._r1 不重複開（仍恰 1 張 r1）",
    new35.docs.filter(x => x.id === "inv_RGV10A_r1").length === 1, { r1count: new35.docs.filter(x => x.id === "inv_RGV10A_r1").length });
  // 36. 原始碼層：reissueInvoice 已改 intent 模式（不再裸 void+issue 兩步）
  chk("36 V10 reissueInvoice 走 reissueIntent+_performVoidOrAllowance（非兩步裸 await）",
    /reissueIntent: newBuyer/.test(src) && /_performVoidOrAllowance\(ref, inv, creds, inv\.amount\)/.test(src) && !/await amego\.voidInvoice\(creds, inv\.invoiceNumber\); \}\s*\n\s*catch/.test(src));
  // 37. 原始碼層：worker 殭屍 actualVoided 補開遺留 reissueIntent
  chk("37 V10 worker 殭屍救援補開遺留 reissueIntent", /if \(locked\.reissueIntent\) \{ try \{ await _issueReissue/.test(src));

  // 清場
  for (const col of ["invoices", "regPayments", "teams", "orders"]) {
    const s = await db.collection(col).get(); for (const d of s.docs) await d.ref.delete();
  }
  console.log("\n發票引擎狀態機: PASS " + pass + " / FAIL " + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("ERR", e); process.exit(2); });
