/**
 * RegMaster Firestore Migration Script
 * 
 * Deletes old collections (users, logs) and imports CSV data 
 * into correct collections with proper field names.
 * 
 * Usage:
 *   1. Place your Firebase service account key as serviceAccountKey.json in this directory
 *   2. Place all CSV files in this directory
 *   3. Run: node migrate.js
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// ===== CSV Parser (handles quoted fields with commas) =====
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  let i = 1;
  while (i < lines.length) {
    let line = lines[i];
    // Handle multiline quoted fields
    while (line && (line.split('"').length - 1) % 2 !== 0 && i + 1 < lines.length) {
      i++;
      line += "\n" + lines[i];
    }
    if (line.trim()) {
      const vals = parseCSVLine(line);
      if (vals.length >= headers.length - 1) {
        const obj = {};
        headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] || "").trim(); });
        rows.push(obj);
      }
    }
    i++;
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ===== Delete entire collection =====
async function deleteCollection(name) {
  const snap = await db.collection(name).get();
  if (snap.empty) { console.log(`  [${name}] already empty`); return; }
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  [${name}] deleted ${snap.size} docs`);
}

// ===== Read CSV file =====
function readCSV(filename) {
  const files = [
    path.join(__dirname, filename),
    path.join(__dirname, "csv", filename)
  ];
  for (const f of files) {
    if (fs.existsSync(f)) return parseCSV(fs.readFileSync(f, "utf-8"));
  }
  console.log(`  WARNING: ${filename} not found, skipping`);
  return [];
}

// ===== Main Migration =====
async function migrate() {
  console.log("=== RegMaster Firestore Migration ===\n");

  // Step 1: Delete old collections
  console.log("Step 1: Deleting old collections...");
  for (const col of ["users", "logs", "accounts", "teams", "members", 
    "announcements", "emailTemplates", "payments", "notifications", 
    "auditLogs", "scores", "licenses", "competitions"]) {
    await deleteCollection(col);
  }

  // Step 2: Import accounts
  console.log("\nStep 2: Importing accounts...");
  const accounts = readCSV("線上報名系統_-_帳號管理.csv");
  for (const a of accounts) {
    await db.collection("accounts").add({
      username: a["帳號"] || "",
      passwordHash: a["密碼雜湊"] || "",
      role: a["角色"] || "",
      displayName: a["顯示名稱"] || "",
      createdAt: a["建立時間"] || "",
      loginFails: parseInt(a["登入失敗"]) || 0,
      lockedUntil: a["鎖定至"] || ""
    });
  }
  console.log(`  Imported ${accounts.length} accounts`);

  // Step 3: Import competition
  console.log("\nStep 3: Importing competitions...");
  const compId = "C202603261406373332";
  const configJSON = {
    competitionName: "2026全國學生遙控帆船STEAM創客大賽─創意魔方遙控帆船爭霸賽",
    groups: ["不分組"],
    requireTeamNameCN: true,
    requireTeamNameEN: false,
    memberCount: 2,
    studentFields: ["chineseName","idNumber","birthday","school","grade","email"],
    teacherCount: 1,
    teacherFields: ["chineseName","idNumber","school","address","phone","email"],
    paymentMethods: ["bankTransfer"],
    bankInfo: {
      bankBranch: "0170103蘭雅分行",
      bankHolder: "廣天國際有限公司",
      bankName: "兆豐銀行",
      bankAccount: "01009027250"
    },
    creditCardLink: "",
    description: '<div class="container"><h1>🌊 2026 全國學生遙控帆船 STEAM 創客大賽：創意魔方爭霸賽</h1><p>由海科館與廣天國際聯手打造，結合科學、技術、工程、藝術與數學（STEAM）的跨界冒險。誠邀全國 5-12 年級的創客們參加！</p><h2>📅 活動資訊</h2><ul><li>競賽日期：2026年6月27日 09:30</li><li>競賽地點：國立海洋科技博物館－教育中心</li><li>報名期限：即日起至2026年6月5日中午12:00止</li></ul><h2>📝 報名須知</h2><ul><li>對象：全國5-12年級在學生</li><li>組隊：每隊2名學生＋1名指導老師</li><li>費用：免報名費，需繳交押金NT$1,000（全程參與後退還）</li></ul></div>',
    posterUrl: "https://i.ibb.co/TqL8cDNJ/image.png",
    requireFileUpload: true,
    fileUploadDescription: "模塊借用下載檔案:https://drive.google.com/file/d/1fAejGUdTjp9hn623TmgtXp-5EkKM2Ykb/view?usp=sharing",
    openDate: "2026-03-31T10:00",
    competitionDate: "2026-06-27T09:30",
    allowWaitlist: true,
    groupAgeRules: { "不分組": { minAge: 10, maxAge: 18, type: "age" } }
  };
  await db.collection("competitions").doc(compId).set({
    name: "2026全國學生遙控帆船STEAM創客大賽─創意魔方遙控帆船爭霸賽",
    config: configJSON,
    createdAt: "2026/03/26 14:06:37",
    isOpen: true,
    deadline: "2026-06-05T12:00",
    maxTeams: 40,
    creator: "xenia",
    rulesPdfId: "1hM3AfudP2r7usxY_KMuu1y8nL4q5LF7g",
    rulesText: "2026 全國學生遙控帆船 STEAM 創客大賽─創意魔方遙控帆船爭霸賽...",
    themeColors: ""
  });
  console.log("  Imported 1 competition");

  // Step 4: Import teams
  console.log("\nStep 4: Importing teams...");
  const teams = readCSV("線上報名系統_-_報名隊伍.csv");
  for (const t of teams) {
    const tid = t["隊伍ID"];
    if (!tid) continue;
    await db.collection("teams").doc(tid).set({
      teamId: tid,
      compId: t["競賽ID"] || "",
      registrationTime: t["報名時間"] || "",
      group: t["組別"] || "",
      teamNameCN: t["中文隊名"] || "",
      teamNameEN: t["英文隊名"] || "",
      status: t["報名狀態"] || "",
      paymentStatus: t["付款狀態"] || "",
      paymentMethod: t["付款方式"] || "",
      remitterName: t["匯款人"] || "",
      remitterBank: t["匯款銀行"] || "",
      remitterAccount: t["匯款帳號後五碼"] || "",
      note: t["備註"] || "",
      password: t["密碼"] || "",
      waitlistNum: parseInt(t["備取序號"]) || 0,
      creditCardOrderNo: t["信用卡訂單號"] || "",
      fileUrl: t["上傳檔案連結"] || ""
    });
  }
  console.log(`  Imported ${teams.length} teams`);

  // Step 5: Import members
  console.log("\nStep 5: Importing members...");
  const members = readCSV("線上報名系統_-_隊員資料.csv");
  for (const m of members) {
    if (!m["隊伍ID"]) continue;
    await db.collection("members").add({
      teamId: m["隊伍ID"] || "",
      compId: m["競賽ID"] || "",
      role: m["角色"] || "",
      seq: parseInt(m["序號"]) || 0,
      chineseName: m["中文姓名"] || "",
      englishName: m["英文姓名"] || "",
      passport: m["護照號碼"] || "",
      nationality: m["國籍"] || "",
      idNumber: m["身分證字號"] || "",
      birthday: m["生日"] || "",
      school: m["學校"] || "",
      grade: m["年級職稱"] || "",
      jobTitle: m["年級職稱"] || "",
      address: m["聯絡地址"] || "",
      phone: m["手機號碼"] || "",
      email: m["Email"] || ""
    });
  }
  console.log(`  Imported ${members.length} members`);

  // Step 6: Import licenses
  console.log("\nStep 6: Importing licenses...");
  const licenses = readCSV("線上報名系統_-_授權碼.csv");
  for (const l of licenses) {
    const code = l["授權碼"];
    if (!code) continue;
    await db.collection("licenses").doc(code).set({
      code: code,
      type: l["類型"] || "",
      maxCount: parseInt(l["次數上限"]) || 0,
      usedCount: parseInt(l["已用次數"]) || 0,
      years: parseFloat(l["訂閱年數"]) || 0,
      activatedBy: l["啟用者"] || "",
      activatedAt: l["啟用日期"] || "",
      expiresAt: l["到期日期"] || "",
      status: l["狀態"] || "",
      createdAt: l["建立時間"] || ""
    });
  }
  console.log(`  Imported ${licenses.length} licenses`);

  // Step 7: Import audit logs
  console.log("\nStep 7: Importing audit logs...");
  const logs = readCSV("線上報名系統_-_操作日誌.csv");
  const logBatches = [];
  for (let i = 0; i < logs.length; i += 400) {
    logBatches.push(logs.slice(i, i + 400));
  }
  for (const batch of logBatches) {
    const wb = db.batch();
    for (const l of batch) {
      const ref = db.collection("auditLogs").doc();
      wb.set(ref, {
        time: l["時間"] || "",
        user: l["操作者"] || "",
        action: l["動作"] || "",
        target: l["目標"] || "",
        detail: l["詳細"] || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await wb.commit();
  }
  console.log(`  Imported ${logs.length} audit logs`);

  // Step 8: Import payments
  console.log("\nStep 8: Importing payments...");
  const payments = readCSV("線上報名系統_-_付款記錄.csv");
  for (const p of payments) {
    if (!p["隊伍ID"]) continue;
    await db.collection("payments").add({
      teamId: p["隊伍ID"] || "",
      compId: p["競賽ID"] || "",
      method: p["付款方式"] || "",
      remitterName: p["匯款人"] || "",
      remitterBank: p["匯款銀行"] || "",
      remitterAccount: p["匯款帳號後五碼"] || "",
      paymentTime: p["付款時間"] || "",
      status: p["確認狀態"] || "",
      confirmTime: p["確認時間"] || "",
      creditCardOrderNo: p["信用卡訂單號"] || ""
    });
  }
  console.log(`  Imported ${payments.length} payments`);

  // Step 9: Create Gemini config
  console.log("\nStep 9: Setting up config...");
  await db.collection("config").doc("gemini").set({ keys: [], keyIdx: 0 });
  console.log("  Config initialized");

  console.log("\n=== Migration Complete! ===");
  console.log("Collections created: accounts, competitions, teams, members,");
  console.log("  licenses, auditLogs, payments, config");
  console.log("Empty collections (created on first use): announcements,");
  console.log("  emailTemplates, notifications, scores");
  
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
