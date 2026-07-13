// 光貿 Amego 電子發票 API 共用模組（MIG 4.0）。
// 簽章規則：sign = md5(dataJSON + time + appKey)；POST form-urlencoded（禁 application/json）。
// 金額慣例：本模組一律收「含稅整數」；B2B 依官方「含稅商品金額計算邏輯」拆稅（DetailVat 採預設 1=含稅明細，
// 官方 f0401_custom 打統編範例即為 items 699 → Sales 666 / Tax 33 / Total 699，Sum(items)=Total 是正確格式）。
const crypto = require("crypto");
const API = "https://invoice-api.amego.tw";
const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");

// /json/time 校時（免簽章）；offset 快取 10 分鐘 — 防 Functions 冷啟動時鐘漂移超出 ±60 秒容差。
let _off = 0, _syncAt = 0;
async function serverTime() {
  if (Date.now() - _syncAt > 600000) {
    try {
      const j = await (await fetch(API + "/json/time")).json();
      _off = j.timestamp - Math.floor(Date.now() / 1000);
      _syncAt = Date.now();
    } catch (e) { /* 校時失敗用本機時間（±60 秒內通常仍可過） */ }
  }
  return Math.floor(Date.now() / 1000) + _off;
}

// 低階呼叫。creds = { ban, appKey }。code!==0 擲 Error("AMEGO:<code>:<msg>")，e.amego = 原始回應。
async function call(path, creds, payload) {
  const data = JSON.stringify(payload);
  const time = await serverTime();
  const sign = md5(data + time + creds.appKey);
  const body = new URLSearchParams({ invoice: creds.ban, data, time: String(time), sign });
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const json = await res.json();
  if (json.code !== 0) {
    const e = new Error("AMEGO:" + json.code + ":" + (json.msg || ""));
    e.amego = json; e.amegoCode = json.code;
    throw e;
  }
  return json;
}

// f0401 payload 組裝。items: [{desc, qty, unitPrice, amount}]（含稅）。buyer.ban 空/0000000000 = B2C。
function buildF0401({ orderId, buyer, items, mainRemark }) {
  const isB2B = !!(buyer.ban && buyer.ban !== "0000000000");
  let sales = 0;
  items.forEach(it => { sales += Math.round(Number(it.amount)); });
  let tax = 0;
  if (isB2B) { tax = sales - Math.round(sales / 1.05); sales -= tax; }
  return {
    OrderId: String(orderId).slice(0, 40),
    BuyerIdentifier: isB2B ? buyer.ban : "0000000000",
    BuyerName: String(buyer.name || "客人").slice(0, 60),
    BuyerAddress: "", BuyerTelephoneNumber: "",
    BuyerEmailAddress: buyer.email || "",
    MainRemark: String(mainRemark || "").slice(0, 200),
    CarrierType: buyer.carrierType || "",
    CarrierId1: buyer.carrierId || "",
    CarrierId2: buyer.carrierId || "",
    NPOBAN: buyer.npoban || "",
    ProductItem: items.map(it => ({
      Description: String(it.desc).slice(0, 256),
      Quantity: it.qty || 1,
      UnitPrice: Math.round(Number(it.unitPrice)),
      Amount: Math.round(Number(it.amount)),
      Remark: "",
      TaxType: 1
    })),
    SalesAmount: sales,
    FreeTaxSalesAmount: 0,
    ZeroTaxSalesAmount: 0,
    TaxType: 1,
    TaxRate: "0.05",
    TaxAmount: tax,
    TotalAmount: sales + tax
  };
}

// g0401 payload 組裝（賣方折讓 type 2；明細為未稅 + 稅金欄）。refundGross = 實退金額（含稅整數）。
function buildG0401({ allowanceNo, dateYmd, buyer, origInvoice, desc, refundGross }) {
  const isB2B = !!(buyer.ban && buyer.ban !== "0000000000");
  const gross = Math.round(Number(refundGross));
  const amount = isB2B ? Math.round(gross / 1.05) : gross;
  const tax = isB2B ? gross - amount : 0;
  return [{
    AllowanceNumber: String(allowanceNo).slice(0, 16),
    AllowanceDate: String(dateYmd),
    AllowanceType: "2",   // 114/1/1 起賣方折讓證明通知單，無需買方簽回
    BuyerIdentifier: isB2B ? buyer.ban : "0000000000",
    BuyerName: String(buyer.name || "客人").slice(0, 60),
    BuyerAddress: "", BuyerTelephoneNumber: "",
    BuyerEmailAddress: buyer.email || "",
    ProductItem: [{
      OriginalInvoiceNumber: origInvoice.number,
      OriginalInvoiceDate: Number(origInvoice.dateYmd),
      OriginalDescription: String(desc).slice(0, 256),
      Quantity: 1,
      UnitPrice: amount,
      Amount: amount,
      Tax: tax,
      TaxType: 1
    }],
    TaxAmount: tax,
    TotalAmount: amount
  }];
}

const issueInvoice   = (c, a)  => call("/json/f0401", c, buildF0401(a));
const voidInvoice    = (c, no) => call("/json/f0501", c, [{ CancelInvoiceNumber: no }]);
const createAllowance = (c, a) => call("/json/g0401", c, buildG0401(a));
const voidAllowance  = (c, no) => call("/json/g0501", c, [{ CancelAllowanceNumber: no }]);
const invoiceStatus  = (c, nos) => call("/json/invoice_status", c, nos.map(n => ({ InvoiceNumber: n })));
const queryByOrder   = (c, id) => call("/json/invoice_query", c, { type: "order", order_id: String(id).slice(0, 40) });
const queryByNumber  = (c, no) => call("/json/invoice_query", c, { type: "invoice", invoice_number: no });
const getPdfUrl      = (c, no, style) => call("/json/invoice_file", c, { type: "invoice", invoice_number: no, download_style: style || 0 });
const getAllowancePdfUrl = (c, no, style) => call("/json/allowance_file", c, { allowance_number: no, download_style: style || 0 });
const banQuery       = (c, bans) => call("/json/ban_query", c, bans.map(b => ({ ban: String(b) })));
const barcodeCheck   = (c, bc) => call("/json/barcode", c, { barCode: String(bc) });
const lotteryStatus  = (c, y, p) => call("/json/lottery_status", c, { Year: y, Period: p });

module.exports = {
  serverTime, call, buildF0401, buildG0401,
  issueInvoice, voidInvoice, createAllowance, voidAllowance,
  invoiceStatus, queryByOrder, queryByNumber, getPdfUrl, getAllowancePdfUrl,
  banQuery, barcodeCheck, lotteryStatus
};
