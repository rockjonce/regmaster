/**
 * RegMaster v5.1 — Firebase Cloud Functions (Gen2)
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
// V3 Phase 3: explicit modular FieldValue import.
// Node 24 has a regression where `admin.firestore.FieldValue` becomes undefined
// after admin.firestore() is called. Modular import is the documented modern
// approach and is identical to the legacy namespace on every supported Node.
const { FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");

/* Speed up cold start: set region + concurrency globally */
setGlobalOptions({ region: "us-central1", concurrency: 80, maxInstances: 40 });

// ===== Helpers =====
function fmtNow() {
  return new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}
// Normalise a stored timestamp to a "YYYY-MM-DD" key for daily aggregation.
// fmtNow() yields zh-TW format like "2026/6/1 下午12:00:00" (slashes, non-padded),
// so a naive substring(0,10) breaks chart bucketing — handle both that and ISO.
function toDayKey(s) {
  s = String(s || "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return m[1] + "-" + String(m[2]).padStart(2, "0") + "-" + String(m[3]).padStart(2, "0");
  return "";
}
function hashPwd(p) {
  return crypto.createHash("sha256").update(p).digest("hex");
}
// C-1: password hashing upgraded to bcrypt (salted, cost 12). Legacy salt-less SHA-256
// hashes (`passwordHash`) are still accepted on login and lazily re-hashed to bcrypt
// (`passwordBcrypt`) on the next successful sign-in, so no account is locked out.
const bcrypt = require("bcryptjs");
function hashPwdBcrypt(p) { return bcrypt.hashSync(String(p == null ? "" : p), 12); }
// Verify `plain` against an account doc. Prefers bcrypt; falls back to legacy sha256 and
// flags `upgrade:true` so the caller can migrate that account on the spot.
function verifyPwd(plain, acct) {
  if (acct && acct.passwordBcrypt) return { ok: bcrypt.compareSync(String(plain == null ? "" : plain), acct.passwordBcrypt), upgrade: false };
  if (acct && acct.passwordHash)   return { ok: acct.passwordHash === hashPwd(plain), upgrade: true };
  return { ok: false, upgrade: false };
}
// P1-6: registrant TEAM passwords — bcrypt with lazy upgrade from legacy plaintext.
function verifyTeamPwd(teamData, plain) {
  if (teamData && teamData.passwordBcrypt) return bcrypt.compareSync(String(plain == null ? "" : plain), teamData.passwordBcrypt);
  return !!(teamData && teamData.password != null && teamData.password === plain);  // legacy plaintext
}
async function upgradeTeamPwd(ref, teamData, plain) {
  if (teamData && !teamData.passwordBcrypt && ref) { try { await ref.update({ passwordBcrypt: hashPwdBcrypt(plain), password: FieldValue.delete() }); } catch (e) {} }
}
function generateId(prefix) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += c[crypto.randomInt(c.length)];
  return (prefix || "X") + r;
}
function generatePassword() {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let r = "";
  for (let i = 0; i < 8; i++) r += c[crypto.randomInt(c.length)];
  return r;
}
// Legal-document versions for click-wrap e-signing (EULA / Terms acceptance audit trail).
const EULA_VERSION = "2026-01-01";
const TERMS_VERSION = "2026-06-01";
// Best-effort client IP from a callable's underlying request (behind the Firebase proxy,
// the real client is the first entry of X-Forwarded-For).
function clientIp(request) {
  try {
    const r = request && request.rawRequest;
    if (!r) return "";
    const xff = (r.headers && (r.headers["x-forwarded-for"] || r.headers["X-Forwarded-For"])) || "";
    if (xff) return String(xff).split(",")[0].trim();
    return r.ip || "";
  } catch (e) { return ""; }
}
async function auditLog(user, action, target, detail) {
  try {
    await db.collection("auditLogs").add({
      time: fmtNow(), user: user || "system", action, target: target || "", detail: detail || "", createdAt: FieldValue.serverTimestamp()
    });
  } catch (e) { /* silent */ }
}

// Project-derived host: in the Cloud Functions runtime GCLOUD_PROJECT is always
// set, so deploying to regmaster-v3 yields v3 URLs and deploying to regmaster-pro
// yields prod URLs — same source file, no per-project edits. (Fallback chain
// covers the emulator / unusual runtimes.)
const PROJECT_ID = process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT
  || (admin.app().options && admin.app().options.projectId)
  || "regmaster-pro";
const PROJECT_HOST = "https://" + PROJECT_ID + ".web.app";
const FUNCTIONS_BASE = "https://us-central1-" + PROJECT_ID + ".cloudfunctions.net";

const EMAIL_HOST = PROJECT_HOST;
const EMAIL_LOGO_URL = EMAIL_HOST + "/Emaillogo.png";
const SYSTEM_ADMIN_EMAIL = "ceo@calculator.com.tw";

function emailWrap(title, bodyHtml, footerExtra) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0f4f8">
<tr><td align="center" style="padding:20px 10px">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border:1px solid #d1d9e0">

<!-- LOGO BANNER -->
<tr><td style="background-color:#0A437A;padding:16px 24px">
  <table cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;width:44px">
      <div style="width:40px;height:40px;background:#ffffff;border-radius:9px;text-align:center;line-height:40px">
        <a href="${EMAIL_HOST}" target="_blank" style="text-decoration:none"><img src="${EMAIL_HOST}/favicon.png" alt="RegMaster" width="30" height="30" style="display:inline-block;border:0;vertical-align:middle" /></a>
      </div>
    </td>
    <td style="vertical-align:middle;padding-left:12px">
      <span style="font-family:'Segoe UI',Arial,sans-serif;font-size:19px;font-weight:800;color:#ffffff;letter-spacing:.4px">RegMaster</span>
      <span style="display:block;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,.65);margin-top:1px">線上活動報名平台</span>
    </td>
  </tr></table>
</td></tr>

<!-- TITLE BAR -->
<tr><td style="background-color:#0D5BA8;padding:18px 24px;text-align:center">
  <h2 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;font-family:'Segoe UI',Roboto,Arial,sans-serif">${title}</h2>
</td></tr>

<!-- BODY -->
<tr><td style="padding:28px 24px;background-color:#ffffff;color:#333333;font-size:15px;line-height:1.7">
  ${bodyHtml}
</td></tr>

<!-- FOOTER -->
<tr><td style="background-color:#f1f5f9;padding:16px 24px;text-align:center;font-size:12px;color:#64748b">
  ${footerExtra ? '<div style="margin-bottom:8px">' + footerExtra + '</div>' : ''}
  <div>Copyright &copy; <a href="${EMAIL_HOST}" style="color:#0A437A;text-decoration:none;font-weight:600">RegMaster Pro</a></div>
  <div style="margin-top:4px;color:#94a3b8">此為系統自動發送之信件，請勿直接回覆。</div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// ===== Wrap all as callable functions (Gen2 + CORS) =====
function callable(handler) {
  return onCall({ cors: true }, async (request) => {
    try { return await handler(request.data || {}, request); }
    catch (e) {
      if (e instanceof HttpsError) throw e;       // intentional, user-facing errors pass through
      console.error(e);                            // C-3: log full detail server-side only
      throw new HttpsError("internal", "系統發生錯誤，請稍後再試");
    }
  });
}

// ===== Authorization: session-token based auth for sensitive operations =====
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * authCallable(roles, handler)
 * - roles: array of allowed roles, e.g. ["system"], ["system","competition"]
 * - Validates _auth.username + _auth.token from the request
 * - Injects `authUser` (the full account doc data) into handler's second arg
 */
function authCallable(roles, handler) {
  return onCall({ cors: true }, async (request) => {
    try {
      const data = request.data || {};
      const auth = data._auth;
      if (!auth || !auth.username || !auth.token) {
        throw new HttpsError("unauthenticated", "請先登入 / Authentication required");
      }
      const snap = await db.collection("accounts").where("username", "==", auth.username).limit(1).get();
      if (snap.empty) {
        throw new HttpsError("unauthenticated", "帳號不存在");
      }
      const acct = snap.docs[0].data();
      if (acct.sessionToken !== auth.token) {
        throw new HttpsError("unauthenticated", "登入已失效，請重新登入 / Session expired");
      }
      if (!roles.includes(acct.role)) {
        throw new HttpsError("permission-denied", "權限不足 / Permission denied");
      }
      // Strip _auth from data before passing to handler
      const cleanData = { ...data };
      delete cleanData._auth;
      return await handler(cleanData, { ...request, authUser: acct });
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error(e);                            // C-3: log full detail server-side only
      throw new HttpsError("internal", "系統發生錯誤，請稍後再試");
    }
  });
}

// ===== Org RBAC (#3): sub-account roles & capabilities =====
// Owner (competition.creator) & system always have full access (handled below).
// 'danger' (e.g. delete whole event) is owner-only — granted to no member role.
const ROLE_CAPS = {
  manager: ["view", "checkin", "scoring", "manage"],
  staff:   ["view", "checkin"],
  judge:   ["view", "scoring"]
};
// Is `username` an active member of `orgOwner`'s org holding `capability` for `compId`?
// Queries by memberUsername only (single-field, auto-indexed — no composite index needed)
// and filters the rest in memory. Returns false when there are no membership records,
// so behaviour is identical to the previous owner-only check until members are invited.
async function memberHasCapability(username, orgOwner, compId, capability) {
  try {
    const snap = await db.collection("orgMembers").where("memberUsername", "==", username).get();
    for (const d of snap.docs) {
      const m = d.data();
      if (m.orgOwner !== orgOwner || m.status !== "active") continue;
      if (Array.isArray(m.scope) && m.scope.indexOf(compId) < 0) continue; // event-scoped membership
      if ((ROLE_CAPS[m.role] || []).indexOf(capability) >= 0) return true;
    }
    return false;
  } catch (e) { return false; }
}
// Returns the member's role for an org/comp ("manager"|"staff"|"judge") or null.
async function memberRoleFor(username, orgOwner, compId) {
  try {
    const snap = await db.collection("orgMembers").where("memberUsername", "==", username).get();
    for (const d of snap.docs) {
      const m = d.data();
      if (m.orgOwner !== orgOwner || m.status !== "active") continue;
      if (Array.isArray(m.scope) && m.scope.indexOf(compId) < 0) continue;
      return m.role || null;
    }
    return null;
  } catch (e) { return null; }
}

// ===== Competition-level auth: verifies activity ownership + member capability =====
// Usage:  compAuthCallable(handler)              → capability defaults to "manage"
//         compAuthCallable("checkin", handler)   → require a specific capability
// Backward-compatible: with no orgMembers records, this is identical to the prior
// owner-only check (owner/system pass; everyone else denied).
function compAuthCallable(capabilityOrHandler, maybeHandler) {
  const capability = (typeof capabilityOrHandler === "function") ? "manage" : (capabilityOrHandler || "manage");
  const handler = (typeof capabilityOrHandler === "function") ? capabilityOrHandler : maybeHandler;
  return authCallable(["system","competition"], async (data, request) => {
    request.memberRoleName = "system"; // default; refined below for competition role
    if (request.authUser.role === "competition") {
      request.memberRoleName = "owner";
      let compId = data.compId;
      if (!compId && data.teamId) {
        const tDoc = await db.collection("teams").doc(data.teamId).get();
        if (tDoc.exists) compId = tDoc.data().compId;
      }
      if (compId) {
        const compDoc = await db.collection("competitions").doc(compId).get();
        if (!compDoc.exists) throw new HttpsError("not-found", "活動不存在");
        const comp = compDoc.data();
        request.compOwner = comp.creator;   // feature entitlement follows the owner's plan (members inherit)
        if (comp.creator !== request.authUser.username) {
          const role = await memberRoleFor(request.authUser.username, comp.creator, compId);
          if ((ROLE_CAPS[role] || []).indexOf(capability) < 0) throw new HttpsError("permission-denied", "權限不足：只能操作自己的活動");
          request.memberRole = true; // handler hint: caller is a member, not the owner
          request.memberRoleName = role; // "manager" | "staff" | "judge"
        }
      }
    }
    return await handler(data, request);
  });
}

// 帳務重構：解析活動「擁有者」username。owner/manager 由 request.compOwner 取得；
// 系統管理員(system role)的 request.compOwner 未設 → 由活動文件的 creator 補上（god-mode 檢視）。
async function _resolveCreator(request, compId) {
  if (request && request.compOwner) return request.compOwner;
  if (!compId) return null;
  const c = await db.collection("competitions").doc(compId).get();
  return c.exists ? (c.data().creator || null) : null;
}

// ===== Account Management =====
// ===== TOTP (RFC 6238) two-factor auth — implemented with crypto (no deps) =====
const _B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf) {
  let bits = 0, val = 0, out = "";
  for (let i = 0; i < buf.length; i++) { val = (val << 8) | buf[i]; bits += 8; while (bits >= 5) { out += _B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += _B32[(val << (5 - bits)) & 31];
  return out;
}
function base32Decode(str) {
  str = String(str || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, val = 0; const out = [];
  for (const ch of str) { const idx = _B32.indexOf(ch); if (idx < 0) continue; val = (val << 5) | idx; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; } }
  return Buffer.from(out);
}
function totpAt(secretBase32, step) {
  const keyBuf = base32Decode(secretBase32);
  const counter = Buffer.alloc(8);
  let t = step;
  for (let i = 7; i >= 0; i--) { counter[i] = t & 0xff; t = Math.floor(t / 256); }
  const h = crypto.createHmac("sha1", keyBuf).update(counter).digest();
  const off = h[h.length - 1] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16) | ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff);
  return String(bin % 1000000).padStart(6, "0");
}
function totpVerify(secret, token) {
  if (!secret || !token) return false;
  token = String(token).replace(/\D/g, "");
  if (token.length !== 6) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -1; w <= 1; w++) { if (totpAt(secret, step + w) === token) return true; }  // ±30s drift
  return false;
}
function genTotpSecret() { return base32Encode(crypto.randomBytes(20)); }

exports.loginAccount = callable(async (data, request) => {
  // N-6: per-IP throttle on top of the per-account lockout below (defends distributed
  // spraying across many usernames, which the account-level lock alone doesn't catch).
  const _rl = await checkRateLimit("login_ip_" + clientIp(request), 30, 600000);  // 30 / 10 min / IP
  if (!_rl.ok) return { success: false, message: "嘗試過於頻繁，請稍後再試" };
  const { username, password } = data;
  const key = (username || "").trim();
  // Allow logging in with either the username OR the account email.
  let snap = await db.collection("accounts").where("username", "==", key).limit(1).get();
  if (snap.empty) {
    snap = await db.collection("accounts").where("email", "==", key.toLowerCase()).limit(1).get();
  }
  if (snap.empty) return { success: false, message: "帳號或密碼錯誤" };
  const doc = snap.docs[0];
  const acct = doc.data();
  // Check lock
  if (acct.lockedUntil && new Date() < new Date(acct.lockedUntil))
    return { success: false, message: "帳號鎖定中，請稍後再試" };
  const _v = verifyPwd(password, acct);
  if (_v.ok) {
    if (_v.upgrade) { try { await doc.ref.update({ passwordBcrypt: hashPwdBcrypt(password), passwordHash: "" }); } catch (e) {} }
    if (acct.totpEnabled && acct.totpSecret) {
      // Password correct but 2FA is on — do NOT issue a session yet.
      await doc.ref.update({ loginFails: 0, lockedUntil: "" });
      return { success: false, requiresTotp: true, username: acct.username };
    }
    const sessionToken = generateSessionToken();
    await doc.ref.update({ loginFails: 0, lockedUntil: "", sessionToken });
    await auditLog(username, "登入", "", "");
    return { success: true, username: acct.username, role: acct.role, displayName: acct.displayName, sessionToken };
  }
  const fails = (acct.loginFails || 0) + 1;
  const updates = { loginFails: fails };
  if (fails >= 5) updates.lockedUntil = new Date(Date.now() + 900000).toISOString();
  await doc.ref.update(updates);
  // Notify system admin on failed admin login attempts
  if (username === "admin" || acct.role === "system") {
    const clientInfo = data._clientInfo || {};
    const alertHtml = emailWrap('🚨 系統管理員登入失敗警報', `
      <p style="font-size:15px;color:#991b1b;font-weight:700">偵測到針對管理員帳號 <b>${username}</b> 的登入失敗嘗試</p>
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px;margin:12px 0;font-size:14px;line-height:1.8">
        <b>失敗次數：</b>${fails} / 5<br>
        <b>IP 位址：</b>${clientInfo.ip || '未知'}<br>
        <b>國家/地區：</b>${clientInfo.country || '未知'} ${clientInfo.city || ''}<br>
        <b>裝置：</b>${clientInfo.device || '未知'}<br>
        <b>瀏覽器：</b>${clientInfo.browser || '未知'}<br>
        <b>時間：</b>${fmtNow()}
      </div>
      ${fails >= 5 ? '<p style="color:#991b1b;font-weight:700">⚠️ 帳號已被鎖定 15 分鐘</p>' : ''}
    `);
    await db.collection("mail").add({
      to: [SYSTEM_ADMIN_EMAIL],
      message: { subject: "🚨 [RegMaster] 管理員登入失敗警報 — " + username + " (第" + fails + "次)", html: alertHtml, text: "管理員 " + username + " 登入失敗第" + fails + "次" }
    });
  }
  if (fails >= 5) return { success: false, message: "連續錯誤" + fails + "次，鎖定15分鐘" };
  return { success: false, message: "帳號或密碼錯誤（剩" + (5 - fails) + "次）" };
});

// V3.1: Google Sign-In — exchange a Firebase ID token (from a Google popup) for
// an app session. Resolution order:
//   1) account previously linked by googleSub  → log in
//   2) account whose email matches              → auto-link this Google identity + log in
//   3) no account                               → auto-create a new 主辦方 (competition) account
exports.loginWithGoogle = callable(async (data) => {
  const { idToken } = data;
  if (!idToken) return { success: false, message: "缺少 Google 登入憑證" };
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    return { success: false, message: "Google 登入驗證失敗，請重試" };
  }
  if (decoded.email_verified === false) return { success: false, message: "此 Google 帳號的 Email 尚未驗證" };
  const email = (decoded.email || "").toLowerCase().trim();
  const googleSub = decoded.uid;   // stable Firebase uid for this Google identity
  const displayName = decoded.name || (email ? email.split("@")[0] : "使用者");

  // 1) Previously linked by googleSub
  let snap = await db.collection("accounts").where("googleSub", "==", googleSub).limit(1).get();
  // 2) Else match by email and auto-link
  let linkedByEmail = false;
  if (snap.empty && email) {
    snap = await db.collection("accounts").where("email", "==", email).limit(1).get();
    if (snap.empty) snap = await db.collection("accounts").where("username", "==", email).limit(1).get();
    if (!snap.empty) linkedByEmail = true;
  }
  if (!snap.empty) {
    const doc = snap.docs[0];
    const acct = doc.data();
    if (acct.lockedUntil && new Date() < new Date(acct.lockedUntil)) {
      return { success: false, message: "帳號鎖定中，請稍後再試" };
    }
    const sessionToken = generateSessionToken();
    const upd = { loginFails: 0, lockedUntil: "", sessionToken };
    if (!acct.googleSub) { upd.googleSub = googleSub; upd.googleEmail = email; }
    await doc.ref.update(upd);
    await auditLog(acct.username, linkedByEmail ? "Google 登入(自動綁定)" : "Google 登入", "", email);
    return { success: true, username: acct.username, role: acct.role, displayName: acct.displayName || acct.username, sessionToken };
  }

  // 3) No matching account — auto-create a 主辦方 (Free) account from the Google identity.
  if (!email) return { success: false, message: "無法取得 Google 帳號 Email" };
  const username = email;   // email is unique → use it as the login id
  const sessionToken = generateSessionToken();
  await db.collection("accounts").add({
    username, passwordHash: "", role: "competition", displayName,
    email, emailVerified: true, googleSub, googleEmail: email,
    createdAt: fmtNow(), loginFails: 0, lockedUntil: "", sessionToken
  });
  await auditLog(username, "Google 註冊", "", email);
  return { success: true, username, role: "competition", displayName, sessionToken, isNew: true };
});

// ===== Social account linking (settings → 安全與登入) =====
// Bind a Google identity to the CURRENTLY LOGGED-IN account.
exports.linkGoogleAccount = authCallable(["system", "competition"], async (data, request) => {
  const { idToken } = data;
  if (!idToken) return { success: false, message: "缺少 Google 憑證" };
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(idToken); }
  catch (e) { return { success: false, message: "Google 驗證失敗，請重試" }; }
  const email = (decoded.email || "").toLowerCase().trim();
  const googleSub = decoded.uid;
  // Reject if this Google identity is already linked to a different account.
  const exist = await db.collection("accounts").where("googleSub", "==", googleSub).limit(1).get();
  if (!exist.empty && exist.docs[0].data().username !== request.authUser.username) {
    return { success: false, message: "此 Google 帳號已綁定到其他帳號" };
  }
  const snap = await db.collection("accounts").where("username", "==", request.authUser.username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  await snap.docs[0].ref.update({ googleSub, googleEmail: email });
  await auditLog(request.authUser.username, "綁定 Google", "", email);
  return { success: true, googleEmail: email };
});

// Return which login methods are linked to the current account.
exports.getLinkedProviders = authCallable(["system", "competition"], async (data, request) => {
  const a = request.authUser;
  return {
    hasPassword: !!(a.passwordHash || a.passwordBcrypt),
    google: { linked: !!a.googleSub, email: a.googleEmail || "" },
    line: { linked: !!a.lineUserId, name: a.lineDisplayName || "" }
  };
});

// Unlink a social provider. Guard: never remove the account's ONLY login method.
exports.unlinkProvider = authCallable(["system", "competition"], async (data, request) => {
  const provider = data.provider;
  const snap = await db.collection("accounts").where("username", "==", request.authUser.username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  const acct = snap.docs[0].data();
  const hasPassword = !!(acct.passwordHash || acct.passwordBcrypt);
  const hasGoogle = !!acct.googleSub, hasLine = !!acct.lineUserId;
  const remaining = (hasPassword ? 1 : 0) +
    (provider !== "google" && hasGoogle ? 1 : 0) +
    (provider !== "line" && hasLine ? 1 : 0);
  if (remaining < 1) return { success: false, message: "這是您唯一的登入方式，請先設定密碼再解除綁定" };
  const upd = {};
  if (provider === "google") { upd.googleSub = FieldValue.delete(); upd.googleEmail = FieldValue.delete(); }
  else if (provider === "line") { upd.lineUserId = FieldValue.delete(); upd.lineDisplayName = FieldValue.delete(); }
  else return { success: false, message: "未知的登入方式" };
  await snap.docs[0].ref.update(upd);
  await auditLog(request.authUser.username, "解除綁定 " + provider, "", "");
  return { success: true };
});

// ===== LINE Login (OAuth2 + OIDC) =====
// Channel ID is public; the secret lives in config/line (never in the repo/frontend).
const LINE_CHANNEL_ID = "2010261408";
const LINE_REDIRECT = "https://regmaster-v3.web.app/line-callback.html";
async function lineExchangeAndVerify(code, redirectUri) {
  const cfgDoc = await db.collection("config").doc("line").get();
  const secret = cfgDoc.exists ? (cfgDoc.data().channelSecret || "") : "";
  if (!secret) throw new Error("LINE 尚未設定");
  // V-17: only honour known redirect URIs (defense-in-depth; LINE also validates server-side).
  const ALLOWED_REDIRECTS = [LINE_REDIRECT, "https://regmaster-pro.web.app/line-callback.html"];
  const redir = (redirectUri && ALLOWED_REDIRECTS.indexOf(redirectUri) >= 0) ? redirectUri : LINE_REDIRECT;
  // 1) Exchange the authorization code for tokens
  const tokRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: redir,
      client_id: LINE_CHANNEL_ID, client_secret: secret
    }).toString()
  });
  const tok = await tokRes.json();
  if (!tok.id_token) throw new Error(tok.error_description || tok.error || "code 交換失敗");
  // 2) Verify the id_token (LINE validates signature/issuer/audience and returns the payload)
  const vRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: tok.id_token, client_id: LINE_CHANNEL_ID }).toString()
  });
  const v = await vRes.json();
  if (!v.sub) throw new Error(v.error_description || v.error || "id_token 驗證失敗");
  return { lineUserId: v.sub, name: v.name || "", email: (v.email || "").toLowerCase().trim() };
}

// Public: LINE login → match by lineUserId → email(auto-link) → auto-create 主辦方.
exports.lineLoginCallback = callable(async (data) => {
  try {
    const id = await lineExchangeAndVerify(data.code, data.redirectUri);
    let snap = await db.collection("accounts").where("lineUserId", "==", id.lineUserId).limit(1).get();
    let linkedByEmail = false;
    if (snap.empty && id.email) {
      snap = await db.collection("accounts").where("email", "==", id.email).limit(1).get();
      if (snap.empty) snap = await db.collection("accounts").where("username", "==", id.email).limit(1).get();
      if (!snap.empty) linkedByEmail = true;
    }
    if (!snap.empty) {
      const doc = snap.docs[0], acct = doc.data();
      if (acct.lockedUntil && new Date() < new Date(acct.lockedUntil)) return { success: false, message: "帳號鎖定中，請稍後再試" };
      const sessionToken = generateSessionToken();
      const upd = { loginFails: 0, lockedUntil: "", sessionToken };
      if (!acct.lineUserId) { upd.lineUserId = id.lineUserId; upd.lineDisplayName = id.name; }
      await doc.ref.update(upd);
      await auditLog(acct.username, linkedByEmail ? "LINE 登入(自動綁定)" : "LINE 登入", "", id.email || id.lineUserId);
      return { success: true, username: acct.username, role: acct.role, displayName: acct.displayName || acct.username, sessionToken };
    }
    // Auto-create
    const username = id.email || ("line_" + id.lineUserId.slice(-12));
    const sessionToken = generateSessionToken();
    await db.collection("accounts").add({
      username, passwordHash: "", role: "competition", displayName: id.name || "LINE 使用者",
      email: id.email || "", emailVerified: !!id.email, lineUserId: id.lineUserId, lineDisplayName: id.name || "",
      createdAt: fmtNow(), loginFails: 0, lockedUntil: "", sessionToken
    });
    await auditLog(username, "LINE 註冊", "", id.email || id.lineUserId);
    return { success: true, username, role: "competition", displayName: id.name || "LINE 使用者", sessionToken, isNew: true };
  } catch (e) {
    return { success: false, message: "LINE 登入失敗：" + e.message };
  }
});

// Bind a LINE identity to the CURRENTLY LOGGED-IN account.
exports.linkLineAccount = authCallable(["system", "competition"], async (data, request) => {
  try {
    const id = await lineExchangeAndVerify(data.code, data.redirectUri);
    const exist = await db.collection("accounts").where("lineUserId", "==", id.lineUserId).limit(1).get();
    if (!exist.empty && exist.docs[0].data().username !== request.authUser.username) {
      return { success: false, message: "此 LINE 帳號已綁定到其他帳號" };
    }
    const snap = await db.collection("accounts").where("username", "==", request.authUser.username).limit(1).get();
    if (snap.empty) return { success: false, message: "帳號不存在" };
    await snap.docs[0].ref.update({ lineUserId: id.lineUserId, lineDisplayName: id.name || "" });
    await auditLog(request.authUser.username, "綁定 LINE", "", id.email || id.lineUserId);
    return { success: true, lineDisplayName: id.name || "" };
  } catch (e) {
    return { success: false, message: "LINE 綁定失敗：" + e.message };
  }
});

// ===== TOTP 2FA — login step 2 + enrollment management =====
// Step 2 of password login when 2FA is on: re-check password + the 6-digit code.
exports.loginVerifyTotp = callable(async (data) => {
  const { username, password, code } = data;
  const key = (username || "").trim();
  let snap = await db.collection("accounts").where("username", "==", key).limit(1).get();
  if (snap.empty) snap = await db.collection("accounts").where("email", "==", key.toLowerCase()).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號或密碼錯誤" };
  const doc = snap.docs[0];
  const acct = doc.data();
  if (acct.lockedUntil && new Date() < new Date(acct.lockedUntil)) return { success: false, message: "帳號鎖定中，請稍後再試" };
  const _v = verifyPwd(password, acct);
  if (!_v.ok) return { success: false, message: "密碼錯誤" };
  if (_v.upgrade) { try { await doc.ref.update({ passwordBcrypt: hashPwdBcrypt(password), passwordHash: "" }); } catch (e) {} }
  if (!acct.totpEnabled || !acct.totpSecret) {
    // 2FA not actually on — issue session normally.
    const st0 = generateSessionToken();
    await doc.ref.update({ loginFails: 0, lockedUntil: "", sessionToken: st0 });
    return { success: true, username: acct.username, role: acct.role, displayName: acct.displayName, sessionToken: st0 };
  }
  if (!totpVerify(acct.totpSecret, code)) {
    // Count failed 2FA attempts toward the same 5-strike / 15-min lockout as password failures,
    // so the second factor can't be brute-forced after a correct password.
    const fails = (acct.loginFails || 0) + 1;
    const upd = { loginFails: fails };
    if (fails >= 5) upd.lockedUntil = new Date(Date.now() + 900000).toISOString();
    await doc.ref.update(upd);
    return { success: false, message: "驗證碼錯誤或已過期" };
  }
  const sessionToken = generateSessionToken();
  await doc.ref.update({ loginFails: 0, lockedUntil: "", sessionToken });
  await auditLog(acct.username, "登入(2FA)", "", "");
  return { success: true, username: acct.username, role: acct.role, displayName: acct.displayName, sessionToken };
});

// Is 2FA on for the current account?
exports.getTotpStatus = authCallable(["system", "competition"], async (data, request) => {
  return { enabled: !!request.authUser.totpEnabled };
});

// Start enrollment: generate a (pending) secret + otpauth URI for the QR.
exports.generateTotpSecret = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const snap = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  const secret = genTotpSecret();
  await snap.docs[0].ref.update({ totpPending: secret });
  const label = encodeURIComponent("RegMaster:" + username);
  const otpauth = "otpauth://totp/" + label + "?secret=" + secret + "&issuer=RegMaster&algorithm=SHA1&digits=6&period=30";
  return { success: true, secret, otpauth };
});

// Confirm enrollment: verify a code against the pending secret, then activate.
exports.enableTotp = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const snap = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  const acct = snap.docs[0].data();
  if (!acct.totpPending) return { success: false, message: "請先產生密鑰" };
  if (!totpVerify(acct.totpPending, data.code)) return { success: false, message: "驗證碼錯誤，請確認 App 時間同步後重試" };
  await snap.docs[0].ref.update({ totpSecret: acct.totpPending, totpEnabled: true, totpPending: FieldValue.delete() });
  await auditLog(username, "啟用兩步驟驗證", username, "");
  return { success: true };
});

// Turn 2FA off (requires a current code).
exports.disableTotp = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const snap = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  const acct = snap.docs[0].data();
  if (!acct.totpEnabled) return { success: true };
  if (!totpVerify(acct.totpSecret, data.code)) return { success: false, message: "驗證碼錯誤" };
  await snap.docs[0].ref.update({ totpEnabled: false, totpSecret: FieldValue.delete(), totpPending: FieldValue.delete() });
  await auditLog(username, "停用兩步驟驗證", username, "");
  return { success: true };
});

exports.listAccounts = authCallable(["system"], async (data) => {
  const snap = await db.collection("accounts").get();
  const list = [];
  snap.docs.forEach(doc => {
    const a = doc.data();
    list.push({
      username: a.username,
      role: a.role,
      displayName: a.displayName || "",
      lastLogin: a.lastLogin || "",
      lockedUntil: a.lockedUntil || "",
      email: a.email || "",                     // 【新增】：確保回傳 Email
      phone: a.phone || "",                     // 【新增】：確保回傳 電話
      emailVerified: a.emailVerified || false,  // 【新增】：確保回傳 驗證狀態
      // 登入方式綁定狀態
      hasPassword: !!(a.passwordHash || a.passwordBcrypt),
      hasGoogle: !!a.googleSub,
      googleEmail: a.googleEmail || "",
      hasLine: !!a.lineUserId,
      lineDisplayName: a.lineDisplayName || ""
    });
  });
  // #4: annotate each organizer account with its org permission — whether it owns its own org
  // (擁有者) and/or is an active sub-member (manager/staff/judge) of another owner's org.
  const [compSnap, memSnap] = await Promise.all([
    db.collection("competitions").get(),
    db.collection("orgMembers").get()
  ]);
  const owners = new Set();
  compSnap.docs.forEach(d => { const c = d.data().creator; if (c) owners.add(c); });
  const memMap = {};
  memSnap.docs.forEach(d => {
    const m = d.data();
    if (m.status !== "active") return;
    (memMap[m.memberUsername] = memMap[m.memberUsername] || []).push({ orgOwner: m.orgOwner || "", role: m.role || "" });
  });
  list.forEach(a => {
    a.ownsEvents = owners.has(a.username);
    a.memberships = memMap[a.username] || [];
  });
  return list;
});

exports.createAccount = authCallable(["system"], async (data) => {
  const { username, password, role, displayName, email } = data;
  if (!username || !password) return { success: false, message: "必填" };
  if (role !== "system" && role !== "competition") return { success: false, message: "角色無效" };
  const exist = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (!exist.empty) return { success: false, message: "已存在" };
  const cleanEmail = (email || "").trim().toLowerCase();
  // Admin-created accounts are trusted, so mark the email verified (also lets
  // Google Sign-In match this account by email).
  await db.collection("accounts").add({
    username, passwordBcrypt: hashPwdBcrypt(password), passwordHash: "", role, displayName: displayName || username,
    email: cleanEmail, emailVerified: !!cleanEmail,
    createdAt: fmtNow(), loginFails: 0, lockedUntil: ""
  });
  await auditLog("system", "建帳號", username, role + (cleanEmail ? " / " + cleanEmail : ""));
  return { success: true };
});

exports.deleteAccount = authCallable(["system"], async (data) => {
  if (data.username === "admin") return { success: false, message: "無法刪除" };
  const snap = await db.collection("accounts").where("username", "==", data.username).limit(1).get();
  if (snap.empty) return { success: false };
  await snap.docs[0].ref.delete();
  return { success: true };
});

// BUG-02 FIX: changePassword requires authenticated session
exports.changePassword = authCallable(["system","competition"], async (data, request) => {
  const { username, oldPassword, newPassword } = data;
  // Verify the authenticated user is changing their own password
  if (request.authUser.username !== username && request.authUser.role !== "system") {
    return { success: false, message: "只能修改自己的密碼" };
  }
  const snap = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  const doc = snap.docs[0];
  if (!verifyPwd(oldPassword, doc.data()).ok) return { success: false, message: "舊密碼錯誤" };
  // M-13: enforce new-password rules server-side (clients may bypass front-end checks).
  if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 30) return { success: false, message: "新密碼長度須為 6–30 字元" };
  if (/\s/.test(newPassword)) return { success: false, message: "新密碼不可包含空白字元" };
  const newToken = generateSessionToken();
  await doc.ref.update({ passwordBcrypt: hashPwdBcrypt(newPassword), passwordHash: "", sessionToken: newToken });
  await auditLog(request.authUser.username, "修改密碼", username, "");
  return { success: true, sessionToken: newToken };
});

// V3 Phase 9: read the caller's own profile (for the 個人資料 settings tab).
exports.getMyProfile = authCallable(["system", "competition"], async (data, request) => {
  const a = request.authUser;
  return {
    username: a.username, role: a.role,
    displayName: a.displayName || "", organizationName: a.organizationName || "",
    email: a.email || "", phone: a.phone || "",
    emailVerified: a.emailVerified || false,
    // EULA click-wrap acceptance record (#1) — shown read-only in settings.
    eulaAcceptedAt: a.eulaAcceptedAt || "", eulaVersion: a.eulaVersion || "", eulaIp: a.eulaIp || "",
    // 收款帳戶 (payout): where the platform wires this organiser's PayUNI net to.
    payoutBankCode: a.payoutBankCode || "", payoutBankName: a.payoutBankName || "",
    payoutBranchCode: a.payoutBranchCode || "", payoutBranchName: a.payoutBranchName || "",
    payoutAccount: a.payoutAccount || "", payoutName: a.payoutName || ""
  };
});

// 收款帳戶 — distinct from the per-activity ATM collection account. This is where the
// platform admin wires the organiser's PayUNI net (after fees) for 平台代收轉付 payouts.
exports.savePayoutAccount = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const snap = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  await snap.docs[0].ref.update({
    payoutBankCode:   String(data.bankCode   || "").slice(0, 8),
    payoutBankName:   String(data.bankName   || "").slice(0, 60),
    payoutBranchCode: String(data.branchCode || "").slice(0, 12),
    payoutBranchName: String(data.branchName || "").slice(0, 60),
    payoutAccount:    String(data.accountNumber || "").slice(0, 40),
    payoutName:       String(data.accountName   || "").slice(0, 60)
  });
  await auditLog(username, "更新收款帳戶", username, "");
  return { success: true };
});

// V3 Phase 9: update the caller's OWN profile (displayName / email / phone).
exports.updateProfile = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const snap = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  const update = {};
  if (data.displayName !== undefined) update.displayName = String(data.displayName || "").slice(0, 80);
  if (data.phone !== undefined) update.phone = String(data.phone || "").slice(0, 40);
  if (data.organizationName !== undefined) update.organizationName = String(data.organizationName || "").slice(0, 120);
  if (data.email !== undefined) {
    const e = String(data.email || "").trim().toLowerCase();
    if (e) {
      // Reject if the email is already used by a DIFFERENT account.
      const dup = await db.collection("accounts").where("email", "==", e).limit(1).get();
      if (!dup.empty && dup.docs[0].data().username !== username) {
        return { success: false, message: "此 Email 已被其他帳號使用" };
      }
    }
    update.email = e;
    update.emailVerified = !!e;
  }
  await snap.docs[0].ref.update(update);
  await auditLog(username, "更新個人資料", username, "");
  return { success: true, displayName: update.displayName, email: update.email, phone: update.phone, organizationName: update.organizationName };
});

// V3 Phase 9: let a user delete their OWN account (with lockout safeguards).
exports.deleteOwnAccount = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  if (username === "admin") return { success: false, message: "預設管理員帳號無法刪除" };
  if (request.authUser.role === "system") {
    const sysSnap = await db.collection("accounts").where("role", "==", "system").get();
    if (sysSnap.size <= 1) return { success: false, message: "無法刪除：這是系統上唯一的管理員帳號" };
  }
  const snap = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (snap.empty) return { success: false, message: "帳號不存在" };
  await snap.docs[0].ref.delete();
  await auditLog(username, "刪除自己的帳戶", username, "");
  return { success: true };
});

// ===== Gemini Keys =====
exports.getGeminiKeys = authCallable(["system"], async () => {
  const doc = await db.collection("config").doc("gemini").get();
  return doc.exists ? (doc.data().keys || []) : [];
});

exports.saveGeminiKeys = authCallable(["system"], async (data) => {
  await db.collection("config").doc("gemini").set({ keys: data.keys || [], keyIdx: 0 }, { merge: true });
  return { success: true };
});

async function getNextGeminiKey() {
  const doc = await db.collection("config").doc("gemini").get();
  if (!doc.exists) return null;
  const d = doc.data();
  const keys = d.keys || [];
  if (!keys.length) return null;
  let idx = d.keyIdx || 0;
  if (idx >= keys.length) idx = 0;
  return { key: keys[idx], idx };
}

async function rotateGeminiKey() {
  const doc = await db.collection("config").doc("gemini").get();
  if (!doc.exists) return;
  const d = doc.data();
  const keys = d.keys || [];
  let idx = (d.keyIdx || 0) + 1;
  if (idx >= keys.length) idx = 0;
  await doc.ref.update({ keyIdx: idx });
}

// ===== Notifications =====
async function getNotificationsInternal(role, username) {
  let compSnap;
  if (role === "system") compSnap = await db.collection("competitions").get();
  else compSnap = await db.collection("competitions").where("creator", "==", username).get();
  const compMap = {};
  compSnap.docs.forEach(d => { compMap[d.id] = d.data().name || ""; });
  const nSnap = await db.collection("notifications").limit(200).get();
  const results = nSnap.docs.filter(d => compMap[d.data().compId]).map(d => {
    const n = d.data();
    return { id: d.id, compId: n.compId, compName: compMap[n.compId] || "", question: n.question || "", time: n.time || "", read: n.read === true };
  });
  results.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
  return results.slice(0, 50);
}

// BUG-04 FIX: addNotification validates compId exists
exports.addNotification = callable(async (data) => {
  if (!data.compId) return { success: false, message: "missing compId" };
  const compDoc = await db.collection("competitions").doc(data.compId).get();
  if (!compDoc.exists) return { success: false, message: "活動不存在" };
  await db.collection("notifications").add({
    notifId: generateId("N"), compId: data.compId, question: (data.question || "").substring(0, 500), time: fmtNow(), read: false
  });
  return { success: true };
});

// BUG-03 FIX: getNotifications requires authenticated session, uses auth user identity
exports.getNotifications = authCallable(["system","competition"], async (data, request) => {
  return await getNotificationsInternal(request.authUser.role, request.authUser.username);
});

// BUG-03 FIX: markNotificationRead requires authenticated session.
// SECURITY (IDOR): an organizer (competition role) may only mark notifications
// that belong to one of their OWN competitions. System role may mark any.
exports.markNotificationRead = authCallable(["system","competition"], async (data, request) => {
  if (!data.nid) return { success: false };
  let ref = null;
  const snap = await db.collection("notifications").where("notifId", "==", data.nid).limit(1).get();
  if (!snap.empty) {
    ref = snap.docs[0].ref;
  } else {
    // Try by doc ID
    const byId = await db.collection("notifications").doc(data.nid).get();
    if (byId.exists) ref = byId.ref;
  }
  if (!ref) return { success: false };
  // Ownership check for organizers
  if (request.authUser.role === "competition") {
    const nDoc = await ref.get();
    const compId = nDoc.exists ? nDoc.data().compId : null;
    if (!compId) return { success: false };
    const compDoc = await db.collection("competitions").doc(compId).get();
    if (!compDoc.exists || compDoc.data().creator !== request.authUser.username) {
      throw new HttpsError("permission-denied", "權限不足：只能操作自己的活動通知");
    }
  }
  await ref.update({ read: true });
  return { success: true };
});

// BUG-03 FIX: markAllNotificationsRead requires authenticated session, uses auth user identity
exports.markAllNotificationsRead = authCallable(["system","competition"], async (data, request) => {
  const notifs = await getNotificationsInternal(request.authUser.role, request.authUser.username);
  const unread = (notifs || []).filter(n => !n.read);
  /* Safe batching: max 400 per batch to stay under Firestore 500 limit */
  for (let i = 0; i < unread.length; i += 400) {
    const batch = db.batch();
    unread.slice(i, i + 400).forEach(n => {
      try { batch.update(db.collection("notifications").doc(n.id), { read: true }); } catch(e){}
    });
    await batch.commit();
  }
  return { success: true };
});

// ===== Audit Logs =====
/* Feature 3: 前端錯誤自動記錄到操作日誌 (標記 Alarm) */
exports.logClientError = callable(async (data, request) => {
  // L-1: cap log volume per IP (best-effort — silently drop excess so we don't reveal limiting).
  const _rl = await checkRateLimit("cerr_ip_" + clientIp(request), 40, 60000);
  if (!_rl.ok) return { success: true };
  const action = (data.action || data.arg0 || "frontend_error");
  const detail = (data.detail || data.arg1 || "").substring(0, 500);
  await auditLog("⚠️ Alarm", action, "client", detail);
  return { success: true };
});

// SECURITY: system-only — audit logs are platform-wide and unfiltered, so they
// must never be exposed to organizer (competition) accounts. The 操作日誌 page is
// only present in the sidebar for the system role.
exports.getAuditLogs = authCallable(["system"], async (data) => {
  const limit = data.limit || 100;
  const snap = await db.collection("auditLogs").orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map(d => {
    const l = d.data();
    return { time: l.time || "", user: l.user || "", action: l.action || "", target: l.target || "", detail: (l.detail || "").substring(0, 120) };
  });
});

// Organiser-facing read-only audit log — returns the caller's OWN operation history.
// (System admins see everything via getAuditLogs.)
exports.getMyAuditLogs = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const limit = Math.min(parseInt(data.limit, 10) || 200, 500);
  // No orderBy (avoids a composite index); fetch this user's entries then sort in JS.
  const snap = await db.collection("auditLogs").where("user", "==", username).get();
  let rows = snap.docs.map(d => {
    const l = d.data();
    // operator: the account that performed the action (future multi-operator events).
    return { time: l.time || "", user: l.user || "", operator: l.user || "", action: l.action || "", target: l.target || "", detail: (l.detail || "").substring(0, 160), compName: "" };
  });
  rows.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  rows = rows.slice(0, limit);

  // Enrich each row with the human-readable ACTIVITY NAME. The audit `target` holds
  // either a compId, a teamId, or some other id (code/email/username). Build:
  //   1) compId -> name  (load the caller's own competitions)
  //   2) teamId -> compId (batched getAll on the leftover targets)
  try {
    const compMap = {};
    const compSnap = await db.collection("competitions").where("creator", "==", username).get();
    compSnap.docs.forEach(d => {
      const c = d.data(); const cfg = c.config || {};
      compMap[d.id] = cfg.competitionName || c.name || d.id;
    });
    // Targets that are NOT a known compId might be teamIds — resolve them in one batch.
    const leftover = [...new Set(rows.map(r => r.target).filter(t => t && !compMap[t]))];
    const teamComp = {}; // teamId -> { compId, teamName }
    if (leftover.length) {
      const refs = leftover.slice(0, 500).map(id => db.collection("teams").doc(id));
      const docs = await db.getAll(...refs);
      docs.forEach(d => {
        if (d.exists) { const t = d.data(); teamComp[d.id] = { compId: t.compId || "", teamName: t.teamNameCN || t.teamName || "" }; }
      });
    }
    rows.forEach(r => {
      if (compMap[r.target]) { r.compName = compMap[r.target]; }
      else if (teamComp[r.target]) {
        const tc = teamComp[r.target];
        r.compName = (compMap[tc.compId] || "") + (tc.teamName ? "／" + tc.teamName : "");
      }
    });
  } catch (e) { /* enrichment is best-effort; raw target still shown */ }

  return rows;
});

// ===== Competition CRUD =====
async function getCompStats(compId) {
  const snap = await db.collection("teams").where("compId", "==", compId).get();
  let total = 0, accepted = 0, waitlist = 0;
  const sessionAccepted = {};
  const sessionWaitlist = {};
  snap.docs.forEach(d => {
    const t = d.data();
    const st = t.status || "";
    if (st === "已取消") return;
    total++;
    const isAcc = st === "正取";
    const isWL = st.startsWith("備取");
    if (isAcc) accepted++;
    if (isWL) waitlist++;
    // Per-session counts
    (t.selectedSessions || [t.selectedSession || 0]).forEach(idx => {
      if (isAcc) sessionAccepted[idx] = (sessionAccepted[idx] || 0) + 1;
      if (isWL) sessionWaitlist[idx] = (sessionWaitlist[idx] || 0) + 1;
    });
  });
  return { total, accepted, waitlist, sessionAccepted, sessionWaitlist };
}

/** Check if per-session quota mode is active */
function isPerSessionQuota(cfg) {
  return cfg.sessionSelectMode === "multi" && Array.isArray(cfg.sessions) && cfg.sessions.length >= 2;
}

exports.listCompetitionsPublic = callable(async () => {
  const compSnap = await db.collection("competitions").get();
  const results = [];
  for (const doc of compSnap.docs) {
    const r = doc.data();
    if (r.isVisible === false) continue;
    const cfg = r.config || {};
    results.push({
      compId: doc.id, name: r.name || "", category: r.category || cfg.category || "", isOpen: r.isOpen === true,
      deadline: r.deadline || "", maxTeams: r.maxTeams || 0, teamCount: r.teamCount || 0,
      themeColors: r.themeColors || "", posterUrl: cfg.posterUrl || "",
      openDate: cfg.openDate || "", competitionDate: cfg.competitionDate || "", sessions: cfg.sessions || []
    });
  }
  return results;
});

exports.listCompetitions = authCallable(["system","competition"], async (data, request) => {
  const role = request.authUser.role;
  const username = request.authUser.username;
  // Map compId -> { data, memberRole }. memberRole=null means the caller owns it.
  const found = {};
  if (role === "competition") {
    // (a) Events this account owns.
    const owned = await db.collection("competitions").where("creator", "==", username).get();
    owned.forEach(d => { found[d.id] = { r: d.data(), memberRole: null }; });
    // (b) #3 RBAC: events of orgs this account is an active member of (single-field query,
    //     no composite index; filter status/scope in memory). No memberships → no-op.
    const orgScopes = {}; // orgOwner -> { role, scope }
    const mem = await db.collection("orgMembers").where("memberUsername", "==", username).get();
    mem.forEach(m => { const x = m.data(); if (x.status === "active") orgScopes[x.orgOwner] = { role: x.role, scope: x.scope }; });
    for (const orgOwner of Object.keys(orgScopes)) {
      const { role: mrole, scope } = orgScopes[orgOwner];
      const evs = await db.collection("competitions").where("creator", "==", orgOwner).get();
      evs.forEach(d => {
        if (Array.isArray(scope) && scope.indexOf(d.id) < 0) return; // event-scoped membership
        if (!found[d.id]) found[d.id] = { r: d.data(), memberRole: mrole };
      });
    }
  } else {
    const all = await db.collection("competitions").get();
    all.forEach(d => { found[d.id] = { r: d.data(), memberRole: null }; });
  }
  return Object.keys(found).map(id => {
    const { r, memberRole } = found[id];
    return {
      compId: id, name: r.name || "", createdAt: r.createdAt || "", isOpen: r.isOpen === true,
      deadline: r.deadline || "", maxTeams: r.maxTeams || 0, creator: r.creator || "",
      teamCount: r.teamCount || 0, viewCount: r.viewCount || 0, hasRules: !!r.rulesPdfId, themeColors: r.themeColors || "",
      maxCapacityLimit: r.maxCapacityLimit !== undefined ? r.maxCapacityLimit : 300,
      capacityLimitUnlocked: r.capacityLimitUnlocked === true,
      memberRole: memberRole   // #3: null = owner; otherwise 'manager'|'staff'|'judge'
    };
  });
});

// Strict rule: 1 區塊 = 1 人. Any section with repeat > 1 from older data gets split
// into N sections of repeat=1 with disambiguating titles, so frontends can count
// sections directly without ever looking at `repeat`.
function _normaliseSchemaSections(schema) {
  if (!schema || !Array.isArray(schema.sections)) return schema;
  const out = [];
  let stuIdx = 0, tchIdx = 0;
  for (const sec of schema.sections) {
    const rep = parseInt(sec.repeat, 10) || 1;
    if (rep <= 1 || sec.role === 'custom') {
      const copy = Object.assign({}, sec, { repeat: 1 });
      out.push(copy);
      if (sec.role === 'student') stuIdx++;
      if (sec.role === 'teacher') tchIdx++;
      continue;
    }
    // Split repeat=N into N sections
    for (let i = 0; i < rep; i++) {
      const titleSuffix = ' ' + (i + 1);
      out.push({
        id: (sec.id || 'sec') + '_' + i,
        title: (sec.title || (sec.role === 'student' ? '學員' : '指導者')) + titleSuffix,
        desc: sec.desc || '',
        role: sec.role,
        repeat: 1,
        // Each split section gets its own copy of the fields (with disambiguated ids)
        fields: (sec.fields || []).map((f, fi) => Object.assign({}, f, { id: (f.id || 'f') + '_s' + i + '_' + fi }))
      });
      if (sec.role === 'student') stuIdx++;
      if (sec.role === 'teacher') tchIdx++;
    }
  }
  return { version: schema.version || 'v3', sections: out };
}

// Build an initial formSchema for a new activity, driven entirely by eventType.
// One section per person — so register.html (which counts cards from section count)
// renders the right number of students/teachers without any other config.
function _buildInitialSchemaForEventType(eventType) {
  let stuCount = 1, tchCount = 0;
  if (eventType === 'single_coach') { stuCount = 1; tchCount = 1; }
  else if (eventType === 'single_no_coach') { stuCount = 1; tchCount = 0; }
  else if (eventType === 'team_coach') { stuCount = 2; tchCount = 1; }
  else if (eventType === 'team_no_coach') { stuCount = 2; tchCount = 0; }
  const _stuField = (i) => ({
    id: 'stu' + i + '_name', type: 'text', label: '中文姓名',
    legacyKey: 'chineseName', req: true, opts: [], help: '', size: 'half'
  });
  const _tchField = (i) => ({
    id: 'tch' + i + '_name', type: 'text', label: '中文姓名',
    legacyKey: 'chineseName', req: true, opts: [], help: '', size: 'half'
  });
  const sections = [];
  for (let i = 0; i < stuCount; i++) {
    sections.push({
      id: 'sec_stu_' + i,
      title: stuCount > 1 ? ('學員 ' + (i + 1)) : '學員資料',
      desc: '',
      role: 'student',
      repeat: 1,
      fields: [_stuField(i)]
    });
  }
  for (let i = 0; i < tchCount; i++) {
    sections.push({
      id: 'sec_tch_' + i,
      title: tchCount > 1 ? ('指導者 ' + (i + 1)) : '指導者',
      desc: '',
      role: 'teacher',
      repeat: 1,
      fields: [_tchField(i)]
    });
  }
  return { version: 'v3', sections };
}

exports.createCompetition = authCallable(["system","competition"], async (data, request) => {
  const { name, category, eventType } = data;
  const creator = request.authUser.username;
  const compId = generateId("C");

  // Tier gate: cap the number of events; seed the capacity limit from the plan.
  const tier = request.authUser.role === "system" ? "team" : await getEffectiveTier(creator);
  const lim = request.authUser.role === "system" ? { maxActiveEvents: Infinity, maxCapacity: Infinity } : await planLimits(tier);
  if (lim.maxActiveEvents !== Infinity) {
    const existing = await db.collection("competitions").where("creator", "==", creator).get();
    if (existing.size >= lim.maxActiveEvents) {
      throw new HttpsError("permission-denied",
        "您的方案（" + tierLabel(tier) + "）最多可擁有 " + lim.maxActiveEvents + " 個活動（含報名中／未開始／已截止／已結束等所有狀態），目前已有 " + existing.size + " 個。請刪除舊活動或升級方案。");
    }
  }

  const effectiveEventType = eventType || 'single_no_coach';
  const initialSchema = _buildInitialSchemaForEventType(effectiveEventType);
  // memberCount / teacherCount are kept in sync from the schema so exports + legacy
  // consumers (excel import/export) see the right counts.
  const stuTotal = initialSchema.sections.filter(s => s.role === 'student').reduce((n, s) => n + (parseInt(s.repeat, 10) || 1), 0);
  const tchTotal = initialSchema.sections.filter(s => s.role === 'teacher').reduce((n, s) => n + (parseInt(s.repeat, 10) || 1), 0);

  const cfg = {
    competitionName: name, category: category || '研討會', eventType: effectiveEventType,
    isVisible: false,
    groups: [], requireTeamNameCN: false, requireTeamNameEN: false,
    memberCount: stuTotal, studentFields: ["chineseName"], teacherCount: tchTotal, teacherFields: ["chineseName"],
    formSchema: initialSchema,                 // ← single source of truth for member counts
    // 【新增】：預設的附加選項與自訂問題空陣列
    dietaryOptions: ["豬肉", "牛肉", "雞肉", "海鮮", "全素"],
    tshirtOptions: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    customQuestions: [],
    paymentMethods: [], bankInfo: {}, creditCardLink: "", description: "", posterUrl: "",
    requireFileUpload: false, fileUploadLevel: "required", fileUploadDescription: "", sessionSelectMode: "single", openDate: "", competitionDate: ""
  };
  
  await db.collection("competitions").doc(compId).set({
    name, category: category || '研討會', config: cfg, createdAt: fmtNow(), 
    isOpen: false, isVisible: false, deadline: "", maxTeams: 0,
    creator: creator || "", rulesPdfId: "", rulesText: "", themeColors: "",
    teamCount: 0,
    maxCapacityLimit: lim.maxCapacity === Infinity ? 0 : lim.maxCapacity,
    capacityLimitUnlocked: lim.maxCapacity === Infinity
  });
  
  await auditLog(creator, "建立活動", compId, name);
  return { success: true, compId };
});

/* In-memory cache for config (5 min TTL) */
const _cache = {};
/* Cache disabled — Cloud Functions run on multiple instances, 
   cDel on instance A doesn't clear instance B's cache, causing stale reads */
function cGet(k) { return null; }
function cSet(k, d) { }
function cDel(k) { }

exports.getCompetitionConfig = compAuthCallable(async (data) => {
  const cached = cGet("cfg_" + data.compId);
  if (cached) return cached;
  const doc = await db.collection("competitions").doc(data.compId).get();
  if (!doc.exists) return null;
  const r = doc.data();
  const cfg = r.config || {};
  cfg.compId = doc.id;
  cfg.competitionName = cfg.competitionName || r.name || "";
  cfg.isOpen = r.isOpen === true;
  cfg.isVisible = cfg.isVisible !== undefined ? !!cfg.isVisible : (r.isVisible !== false);
  cfg.deadline = r.deadline || "";
  cfg.maxTeams = r.maxTeams || 0;
  cfg.creator = r.creator || "";
  cfg.rulesPdfId = r.rulesPdfId || "";
  cfg.pdfDocId = r.pdfDocId || "";
  cfg.rulesText = r.rulesText || "";
  cfg.themeColors = r.themeColors || "";
  cfg.maxCapacityLimit = r.maxCapacityLimit !== undefined ? r.maxCapacityLimit : 300;
  cfg.capacityLimitUnlocked = r.capacityLimitUnlocked === true;
  cSet("cfg_" + data.compId, cfg);
  return cfg;
});

exports.saveCompetitionConfig = compAuthCallable(async (data, request) => {
  const { compId, config } = data;
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "找不到" };
  
  // ===== Capacity limit validation =====
  const compData = doc.data();
  // Capacity cap follows the OWNER's current plan, so upgrades take effect
  // immediately; a system admin may still manually unlock via setCapacityLimit.
  const ownerTier = await getEffectiveTier(compData.creator);
  const tierCap = (await planLimits(ownerTier)).maxCapacity;
  const capUnlocked = compData.capacityLimitUnlocked === true || tierCap === Infinity;
  const capLimit = tierCap === Infinity ? 0 : tierCap;

  // Tier gate: enabling paid registration requires the `payment` feature (STARTER+).
  const wantsPayment = (Array.isArray(config.paymentMethods) && config.paymentMethods.length > 0)
    || config.payuniEnabled === true
    || (parseInt(config.registrationFee) || 0) > 0;
  if (wantsPayment) await requireCompFeature(request, "payment");
  // 允許候補 is a STARTER+ feature — reject enabling it on a plan that lacks it.
  if (config.allowWaitlist === true) await requireCompFeature(request, "waitlist");

  if (!capUnlocked && capLimit > 0) {
    const sessMode = config.sessionSelectMode || "single";
    const sessions = config.sessions || [];
    const sessCount = sessions.length;
    
    if (sessMode === "multi" && sessCount >= 2) {
      // Multi-select + multiple sessions: sum all session maxTeams
      let totalMax = 0;
      sessions.forEach(s => { totalMax += parseInt(s.maxTeams) || 0; });
      if (totalMax > capLimit) {
        return { success: false, message: "所有梯次報名組數加總 (" + totalMax + ") 超過上限 " + capLimit + " 組。如需大型活動報名，請與 廣天國際有限公司 聯繫洽談。" };
      }
    } else {
      // Single-select or single session: check global maxTeams or per-session max
      if (sessCount >= 2) {
        // Single-select with multiple sessions: check each session max
        for (let i = 0; i < sessions.length; i++) {
          const sMax = parseInt(sessions[i].maxTeams) || 0;
          if (sMax > capLimit) {
            return { success: false, message: "梯次 " + (i + 1) + " 的最大報名數 (" + sMax + ") 超過上限 " + capLimit + " 組。如需大型活動報名，請與 廣天國際有限公司 聯繫洽談。" };
          }
        }
      }
      const globalMax = parseInt(config.maxTeams) || 0;
      if (globalMax > capLimit) {
        return { success: false, message: "最大報名數 (" + globalMax + ") 超過上限 " + capLimit + " 組。如需大型活動報名，請與 廣天國際有限公司 聯繫洽談。" };
      }
    }
  }
  
  const jk = ["competitionName", "category", "eventType", "isVisible", "groups", "requireTeamNameCN", "requireTeamNameEN", "memberCount",
    "studentFields", "teacherCount", "teacherFields", "dietaryOptions", "dietaryRestrictionOptions", "tshirtOptions", "customQuestions", "studentCustomQuestions", "teacherCustomQuestions", "paymentMethods", "bankInfo", "creditCardLink",
    "description", "descriptionSummary", "posterUrl", "requireFileUpload", "fileUploadLevel", "fileUploadDescription", "openDate",
    "competitionDate", "competitionStartTime", "competitionEndTime", "openImmediate",
    "sessions", "sessionSelectMode", "allowWaitlist", "groupAgeRules", "autoEmailNotification", "enableAI", "paymentNote",
    "payuniEnabled", "payuniMerID", "payuniHashKey", "payuniHashIV", "payuniMode", "registrationFee", "registrationFeeLabel",
    "feeItems", "bankTransferEnabled", "dateMode", "discountCodes", "groupDiscounts", "refundPolicy"];

  // DATA-LOSS FIX: `ref.update({config: jc})` REPLACES the whole config object, so jc must
  // be SEEDED from the existing config — otherwise every Settings-page save wipes fields that
  // aren't in the whitelist below (formSchema, scoringRubric, scoringPanels, judgeSee*,
  // descriptionSummaryDraft, themeColors, …) which are owned by other endpoints (form-builder,
  // scoring, poster AI). Whitelisted keys are still overwritten by the incoming payload as before.
  const jc = Object.assign({}, compData.config || {});
  /* Filter undefined values — Firestore rejects undefined */
  jk.forEach(k => { if (config[k] !== undefined && config[k] !== null) jc[k] = config[k]; });

  // Refund policy: enforce legal floors (organiser may be more generous, never below).
  if (jc.refundPolicy && typeof jc.refundPolicy === "object") {
    const rp = jc.refundPolicy;
    const tmpl = REFUND_TEMPLATES[rp.template] ? rp.template : "general";
    const tiers = Array.isArray(rp.tiers) ? rp.tiers : [];
    for (const t of tiers) {
      const dB = parseInt(t.daysBefore, 10) || 0;
      const pct = Number(t.pct);
      const floor = refundFloorPct(tmpl, dB);
      if (!(pct >= floor)) {
        throw new HttpsError("failed-precondition", "退費比例違反法定下限：距活動 " + dB + " 天的退費不得低於 " + floor + "%（您設定了 " + pct + "%）");
      }
    }
    jc.refundPolicy = {
      template: tmpl,
      tiers: tiers.map(t => ({ daysBefore: parseInt(t.daysBefore, 10) || 0, pct: Number(t.pct) || 0 })).sort((a, b) => b.daysBefore - a.daysBefore),
      note: String(rp.note || "").slice(0, 500)
    };
  }

  // U1: 即日起 — overwrite openDate with the server-side save time so the timestamp
  // is exactly when the save happened (not when the checkbox was first ticked), and
  // force isOpen=true so registration opens immediately.
  let openImmediateRequested = false;
  if (jc.openImmediate === true) {
    openImmediateRequested = true;
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    jc.openDate = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
      + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  // B.1: AI summary for the public-page hero. Regenerate when description changed
  // since the last save, OR when no summary exists yet (one-time backfill per activity).
  // This keeps Gemini usage minimal — the AI runs at most once per description-change.
  const prevCfg = compData.config || {};
  const prevDesc = prevCfg.description || "";
  const newDesc = jc.description || "";
  const descChanged = String(prevDesc).trim() !== String(newDesc).trim();
  const plainNewDesc = String(newDesc).replace(/<[^>]*>/g, '').trim();
  const hasNoSummary = !prevCfg.descriptionSummary;
  const needsAI = (descChanged || hasNoSummary) && plainNewDesc.length >= 20;
  // UX-001: the AI summary is a DRAFT and NEVER goes public on its own — it lands in
  // descriptionSummaryDraft and only becomes the public descriptionSummary after the
  // organiser approves it (approveDescriptionSummary). Existing public summaries are
  // grandfathered: we always carry the current approved summary forward unchanged here.
  if (prevCfg.descriptionSummary !== undefined) jc.descriptionSummary = prevCfg.descriptionSummary;
  if (!newDesc) jc.descriptionSummary = "";                 // description removed → drop public summary too
  let summaryUpdated = false;                               // true when a NEW DRAFT was produced
  let summaryReason = "";
  if (needsAI && newDesc) {
    try {
      const summary = await generateDescriptionSummary(newDesc);
      if (summary) {
        jc.descriptionSummaryDraft = summary;               // pending the organiser's approval
        summaryUpdated = true;
        summaryReason = descChanged ? "changed" : "backfill";
      } else {
        summaryReason = "empty";
        jc.descriptionSummaryDraft = prevCfg.descriptionSummaryDraft || "";
      }
    } catch (e) {
      summaryReason = "error"; // detail intentionally not surfaced to the UI
      jc.descriptionSummaryDraft = prevCfg.descriptionSummaryDraft || "";
    }
  } else {
    if (prevCfg.descriptionSummaryDraft !== undefined) jc.descriptionSummaryDraft = prevCfg.descriptionSummaryDraft;
    if (!newDesc) jc.descriptionSummaryDraft = "";
    summaryReason = !newDesc ? "removed" : "unchanged";
  }

  // UX-004: payment is TWO-WAY EXCLUSIVE with a ONE-WAY lock to online (PayUni).
  // Enabling online collection closes bank transfer and can never be switched back —
  // the platform then handles collection + payout + auto-reconciliation (feePct% / order).
  {
    const lockedToOnline = !!prevCfg.paymentLocked || prevCfg.payuniEnabled === true;
    const payuni = jc.payuniEnabled === true || lockedToOnline;   // online wins / stays locked
    const bank = (jc.bankTransferEnabled === true) && !payuni;
    jc.payuniEnabled = payuni;
    jc.bankTransferEnabled = bank;
    jc.paymentLocked = payuni;                                    // once online, locked forever
    if (payuni) jc.bankInfo = {};                                 // bank account unused in online mode
    jc.paymentMethods = [
      payuni ? 'payuni' : null,
      (bank && jc.bankInfo && jc.bankInfo.accountNumber) ? 'atm' : null
    ].filter(Boolean);
  }

  // UX-006: block opening registration if the form collects no required email.
  const willOpen = openImmediateRequested ? true : (config.isOpen === true);
  if (willOpen && !formHasRequiredEmail(prevCfg)) {
    return { success: false, code: 'NO_EMAIL',
      message: "開放報名前，請先到「表單設計」新增至少一個必填 Email 欄位（學員或指導者皆可），否則無法寄送確認信與通知。" };
  }

  await ref.update({
    name: config.competitionName || "", category: config.category || "", config: jc,
    // U1: 即日起 forces isOpen=true regardless of the explicit toggle, so registration
    // really does open the moment the organiser hits 儲存.
    isOpen: willOpen,
    isVisible: !!config.isVisible,
    deadline: config.deadline || "", maxTeams: config.maxTeams || 0
  });

  await auditLog(request.authUser.username, "儲存設定", compId, "");
  cDel("cfg_" + compId);
  return { success: true, message: "儲存成功！", summaryUpdated, summaryReason,
    summaryLength: (jc.descriptionSummary || "").length,
    summaryDraft: !!jc.descriptionSummaryDraft, summaryDraftLength: (jc.descriptionSummaryDraft || "").length,
    summaryDraftText: jc.descriptionSummaryDraft || "" };
});

// UX-001: organiser approves (or discards) the pending AI summary draft. Only on approval
// does the draft become the public descriptionSummary.
exports.approveDescriptionSummary = compAuthCallable("manage", async (data, request) => {
  const compId = String(data.compId || "");
  const approve = data.approve !== false;
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "找不到活動" };
  const cfg = doc.data().config || {};
  const draft = cfg.descriptionSummaryDraft || "";
  if (!draft) return { success: false, message: "沒有待審核的 AI 摘要草稿" };
  if (approve) cfg.descriptionSummary = draft;
  cfg.descriptionSummaryDraft = "";
  await ref.update({ config: cfg });
  await auditLog(request.authUser.username, approve ? "批准AI摘要" : "捨棄AI摘要", compId, "");
  cDel("cfg_" + compId);
  return { success: true, approved: approve, descriptionSummary: cfg.descriptionSummary || "" };
});

// B.1 helper: ask Gemini for a 100–150 字 Chinese summary of an activity description.
async function generateDescriptionSummary(rawDesc) {
  const text = String(rawDesc || "").replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return "";
  const keyInfo = await getNextGeminiKey();
  if (!keyInfo) return "";
  try {
    const prompt = "請將下列活動描述濃縮成 100 到 150 字的中文摘要。" +
      "只能使用活動描述中明確出現的資訊；嚴禁推測、補充或杜撰任何未提供的內容，" +
      "尤其是地點、日期、時間、金額、人數、主辦單位或聯絡方式——若原文沒寫就一律略過、不要提及。" +
      "若原文有提到時間、地點、對象、特色等，才保留這些關鍵資訊。" +
      "不要使用 markdown、標題、條列、表情符號，直接輸出純文字段落。摘要長度必須介於 100 到 150 個中文字。\n\n" +
      "活動描述：\n" + text.slice(0, 4000) + "\n\n摘要：";
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + keyInfo.key, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          // Gemini 2.5 Flash counts thinking tokens against maxOutputTokens. 150 字 ≈ 250 tokens
          // of output, but the model can burn 600+ on internal thinking → empty response. Disable
          // thinking entirely so the whole budget goes to actual output.
          maxOutputTokens: 800,
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });
    const json = await res.json();
    let out = "";
    try {
      const parts = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts;
      if (Array.isArray(parts)) parts.forEach(p => { if (p && p.text) out += p.text; });
    } catch (e) { out = ""; }
    out = (out || "").replace(/\s+/g, ' ').trim();
    // Light tidy: drop leading "摘要：" / "以下是" prefixes the model sometimes emits despite the prompt.
    out = out.replace(/^(摘要[:：]|以下是.{0,20}摘要[:：]?|這是.{0,10}摘要[:：]?)\s*/, '').trim();
    return out.slice(0, 220);
  } catch (e) {
    await rotateGeminiKey();
    return "";
  }
}

// UX-006: does the event's form collect at least one REQUIRED email? Legacy/no-schema
// forms have none, so opening registration on them is blocked until the organiser adds one.
function formHasRequiredEmail(cfg) {
  const fs = cfg && cfg.formSchema;
  if (fs && Array.isArray(fs.sections)) {
    return fs.sections.some(s => (s.fields || []).some(f => f.type === 'email' && f.req === true));
  }
  return false;
}

exports.setRegistrationOpen = compAuthCallable(async (data) => {
  // UX-006: refuse to OPEN registration unless the form has a required email field.
  if (data.isOpen === true) {
    const doc = await db.collection("competitions").doc(data.compId).get();
    const cfg = (doc.exists && doc.data().config) || {};
    if (!formHasRequiredEmail(cfg)) {
      return { success: false, code: 'NO_EMAIL',
        message: "開放報名前，請先到「表單設計」新增至少一個必填 Email 欄位（學員或指導者皆可），否則無法寄送確認信與通知。" };
    }
  }
  await db.collection("competitions").doc(data.compId).update({ isOpen: data.isOpen });
  return { success: true, isOpen: data.isOpen };
});

// ===== System Admin: Set capacity limit per competition =====
exports.setCapacityLimit = authCallable(["system"], async (data) => {
  const { compId, maxCapacityLimit, capacityLimitUnlocked } = data;
  if (!compId) return { success: false, message: "缺少 compId" };
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "活動不存在" };
  
  const updates = {};
  if (maxCapacityLimit !== undefined) {
    const val = parseInt(maxCapacityLimit);
    if (isNaN(val) || val < 1) return { success: false, message: "最大人數必須為正整數" };
    updates.maxCapacityLimit = val;
  }
  if (capacityLimitUnlocked !== undefined) {
    updates.capacityLimitUnlocked = !!capacityLimitUnlocked;
  }
  
  await ref.update(updates);
  return { success: true };
});

exports.deleteCompetition = compAuthCallable("danger", async (data) => {
  const compId = data.compId;
  
  /* Clean up teamFiles chunks first (they reference parentId=teamId, not compId) */
  const tfSnap = await db.collection("teamFiles").where("compId", "==", compId).get();
  for (const tfDoc of tfSnap.docs) {
    const chunks = await db.collection("teamFiles").where("parentId", "==", tfDoc.id).get();
    if (!chunks.empty) {
      const cb = db.batch();
      chunks.docs.forEach(d => cb.delete(d.ref));
      await cb.commit();
    }
  }
  
  const collections = [
    { col: "teams", field: "compId" }, { col: "members", field: "compId" },
    { col: "announcements", field: "compId" }, { col: "emailTemplates", field: "compId" },
    { col: "payments", field: "compId" }, { col: "notifications", field: "compId" },
    { col: "scores", field: "compId" }, { col: "emailLogs", field: "compId" },
    { col: "pdfFiles", field: "compId" }, { col: "posterFiles", field: "compId" },
    { col: "teamFiles", field: "compId" }, { col: "regPayments", field: "compId" }
  ];
  for (const c of collections) {
    const snap = await db.collection(c.col).where(c.field, "==", compId).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await db.collection("competitions").doc(compId).delete();
  await auditLog("system", "刪除競賽", compId, "");
  return { success: true };
});

exports.getRegistrationBundle = callable(async (data) => {
  const doc = await db.collection("competitions").doc(data.compId).get();
  if (!doc.exists) return { error: "找不到此競賽" };
  const r = doc.data();
  const cfg = r.config || {};
  cfg.compId = doc.id;
  cfg.competitionName = cfg.competitionName || r.name || "";
  cfg.isOpen = r.isOpen === true;
  cfg.deadline = r.deadline || "";
  cfg.maxTeams = r.maxTeams || 0;
  cfg.rulesPdfId = r.rulesPdfId || "";
  cfg.themeColors = r.themeColors || "";
  // Backward compat: legacy activities (created before formSchema existed) get a
  // derived schema so register.html can count sections without falling back to
  // memberCount/teacherCount. Newer activities already have cfg.formSchema set.
  if (!cfg.formSchema || !Array.isArray(cfg.formSchema.sections) || cfg.formSchema.sections.length === 0) {
    cfg.formSchema = buildFormSchemaFromLegacy(cfg);
  }
  // Strict rule: 1 區塊 = 1 人. Normalise any historical repeat>1 sections into
  // N individual sections so frontends count sections directly.
  cfg.formSchema = _normaliseSchemaSections(cfg.formSchema);
  // Strip sensitive keys before returning to public client
  ['payuniMerID','payuniHashKey','payuniHashIV','payuniMode'].forEach(k => delete cfg[k]);
  const stats = await getCompStats(data.compId);
  const annSnap = await db.collection("announcements").where("compId", "==", data.compId).get();
  const announcements = annSnap.docs.map(d => {
    const a = d.data();
    return { date: a.date || "", title: a.title || "", content: a.content || "" };
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  // B.2: best-effort host display (organizationName preferred, fall back to displayName / username)
  let hostName = "";
  const createdBy = r.createdBy || "";
  if (createdBy) {
    try {
      const accSnap = await db.collection("accounts").where("username", "==", createdBy).limit(1).get();
      if (!accSnap.empty) {
        const acc = accSnap.docs[0].data();
        hostName = acc.organizationName || acc.displayName || acc.username || "";
      }
    } catch (e) { /* swallow — public bundle should not fail because of host lookup */ }
  }
  // 活動 AI 助理 availability = owner's plan (STARTER+) AND the organiser's per-activity
  // toggle (cfg.enableAI, default on).
  let eventAiEnabled = false;
  let ownerTier = "free";   // QW-4: drives the "Powered by RegMaster" badge on Free-tier event pages
  const ownerUser = r.creator || createdBy || "";
  if (ownerUser) {
    try {
      ownerTier = await getEffectiveTier(ownerUser);
      if (cfg.enableAI !== false) {
        const plans = await getPlans();
        eventAiEnabled = !!(plans[ownerTier] && plans[ownerTier].features && plans[ownerTier].features.eventAi);
      }
    } catch (e) { /* swallow — default to free / AI disabled */ }
  }
  // S2-2/S2-5: single source of truth for "is registration open RIGHT NOW", mirroring
  // submitRegistration's gate exactly (isOpen → openDate → deadline). Frontend uses regStatus
  // so it can't drift from the backend gate (no more clickable-but-dead pay button).
  const _now = Date.now();
  let regStatus = "open";
  if (cfg.isOpen !== true) regStatus = "closed";
  else if (cfg.openDate && _now < new Date(cfg.openDate).getTime()) regStatus = "not_yet_open";
  else if (cfg.deadline && _now >= new Date(cfg.deadline).getTime()) regStatus = "deadline_passed";

  return {
    ownerTier, regStatus, openDate: cfg.openDate || "",
    config: cfg, announcements, isOpen: cfg.isOpen, currentAccepted: stats.accepted,
    sessionAccepted: stats.sessionAccepted || {},
    sessionWaitlist: stats.sessionWaitlist || {},
    rulesPdfUrl: cfg.rulesPdfId || "",
    pdfDocId: r.pdfDocId || "",
    themeColors: cfg.themeColors || "",
    hostName: hostName,
    createdBy: createdBy,
    eventAiEnabled: eventAiEnabled,
    teamCount: r.teamCount || 0
  };
});

exports.getShareLink = callable(async (data) => {
  return PROJECT_HOST + "/?comp=" + data.compId;
});

// ===== Announcements =====
async function getAnnouncementsInternal(compId) {
  const snap = await db.collection("announcements").where("compId", "==", compId).get();
  return snap.docs.map(d => {
    const a = d.data();
    return { date: a.date || "", title: a.title || "", content: a.content || "", docId: d.id };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

exports.addAnnouncement = compAuthCallable(async (data) => {
  await db.collection("announcements").add({ compId: data.compId, date: data.date, title: data.title, content: data.content || "" });
  return { success: true };
});

exports.getAnnouncements = callable(async (data) => {
  return await getAnnouncementsInternal(data.compId);
});

exports.deleteAnnouncement = compAuthCallable(async (data) => {
  const { compId, docId } = data;
  if (!docId) return { success: false, message: "missing docId" };
  // Verify the announcement belongs to this competition
  const annDoc = await db.collection("announcements").doc(docId).get();
  if (!annDoc.exists || annDoc.data().compId !== compId) return { success: false, message: "公告不存在" };
  await db.collection("announcements").doc(docId).delete();
  return { success: true };
});

// ===== Registration =====
exports.submitRegistration = callable(async (data, request) => {
  const { compId, fd } = data;
  const compDoc = await db.collection("competitions").doc(compId).get();
  if (!compDoc.exists) return { success: false, message: "找不到競賽" };
  const comp = compDoc.data();
  const cfg = comp.config || {};
  if (!comp.isOpen) return { success: false, message: "報名未開放" };
  // Item 1: enforce the organizer-set open time — registration is not allowed before it.
  if (cfg.openDate && new Date() < new Date(cfg.openDate)) {
    return { success: false, message: "報名尚未開始，開放時間：" + String(cfg.openDate).replace('T', ' ') };
  }
  if (comp.deadline && new Date() >= new Date(comp.deadline)) return { success: false, message: "已截止" };

  // U4: team-name uniqueness — within this competition, no two teams may share a CN or EN name.
  // Skip empty names. Trim + case-fold the EN name for fairness.
  {
    const cnNew = String(fd.teamNameCN || "").trim();
    const enNew = String(fd.teamNameEN || "").trim().toLowerCase();
    if (cnNew || enNew) {
      const teamsSnap = await db.collection("teams").where("compId", "==", compId).get();
      for (const t of teamsSnap.docs) {
        const td = t.data();
        if (td.status === "已取消") continue;             // freed up by cancellation
        const cnEx = String(td.teamNameCN || "").trim();
        const enEx = String(td.teamNameEN || "").trim().toLowerCase();
        if (cnNew && cnEx && cnEx === cnNew) {
          return { success: false, message: "中文隊名「" + cnNew + "」已被其他隊伍使用，請換一個。" };
        }
        if (enNew && enEx && enEx === enNew) {
          return { success: false, message: "英文隊名「" + (fd.teamNameEN || "").trim() + "」已被其他隊伍使用，請換一個。" };
        }
      }
    }
  }

  // Item 4: uniqueness checks — within this competition, no two students may share
  // the same 身分證號碼 (idNumber), and no two may share the same 護照號碼 + 國籍 pair.
  {
    const newStudents = fd.students || [];
    const newIds = [], newPP = [];
    for (const sObj of newStudents) {
      const idn = String(sObj.idNumber || "").trim();
      const pp = String(sObj.passport || "").trim();
      const nat = String(sObj.nationality || "").trim();
      if (idn) {
        if (newIds.indexOf(idn) >= 0) return { success: false, message: "同一筆報名中有重複的身分證號碼：" + idn };
        newIds.push(idn);
      }
      if (pp) {
        const key = pp + "|" + nat;
        if (newPP.indexOf(key) >= 0) return { success: false, message: "同一筆報名中有重複的護照號碼：" + pp };
        newPP.push(key);
      }
    }
    if (newIds.length || newPP.length) {
      const exSnap = await db.collection("members").where("compId", "==", compId).get();
      const exIds = new Set(), exPP = new Set();
      exSnap.docs.forEach(d => {
        const m = d.data();
        if (m.idNumber) exIds.add(String(m.idNumber).trim());
        if (m.passport) exPP.add(String(m.passport).trim() + "|" + String(m.nationality || "").trim());
      });
      for (const idn of newIds) if (exIds.has(idn)) return { success: false, message: "身分證號碼「" + idn + "」已被報名，不可重複報名。" };
      for (const key of newPP) if (exPP.has(key)) return { success: false, message: "此護照號碼（與國籍）已被其他人報名，不可重複報名。" };
    }
  }

  // 報名編號 = 活動ID-隨機碼（嵌入活動ID，便於辨識；teamId 仍為文件 ID 與所有引用鍵）
  const teamId = compId + "-" + generateId("T");
  const pwd = generatePassword();
  const perSession = isPerSessionQuota(cfg);

  // === BUG-01 FIX: Use Firestore Transaction to prevent race condition ===
  // Atomically read all teams, check quota, and write new team inside one transaction
  let status, wn;
  try {
    const result = await db.runTransaction(async (tx) => {
      // CRITICAL: Read competition doc INSIDE transaction to include it in the read set.
      // Without this, two concurrent transactions both increment teamCount without conflict,
      // because tx.update() is write-only and doesn't trigger retry on contention.
      const compRef = db.collection("competitions").doc(compId);
      const compSnapInTx = await tx.get(compRef);
      const compInTx = compSnapInTx.data() || comp;
      const cfgInTx = compInTx.config || cfg;

      // Read all teams for this competition within the transaction
      const tSnap = await tx.get(db.collection("teams").where("compId", "==", compId));
      let accepted = 0, waitlist = 0;
      const sessionAccepted = {}, sessionWaitlist = {};
      tSnap.docs.forEach(d => {
        const t = d.data();
        const st = t.status || "";
        if (st === "已取消") return;
        const isAcc = st === "正取";
        const isWL = st.startsWith("備取");
        if (isAcc) accepted++;
        if (isWL) waitlist++;
        (t.selectedSessions || [t.selectedSession || 0]).forEach(idx => {
          if (isAcc) sessionAccepted[idx] = (sessionAccepted[idx] || 0) + 1;
          if (isWL) sessionWaitlist[idx] = (sessionWaitlist[idx] || 0) + 1;
        });
      });

      let txStatus = "正取", txWn = 0;
      if (perSession) {
        const selectedSessions = fd.selectedSessions || [fd.selectedSession || 0];
        const sessions = cfgInTx.sessions || [];
        for (const sIdx of selectedSessions) {
          const s = sessions[sIdx];
          if (!s) continue;
          const sMax = parseInt(s.maxTeams) || 0;
          if (sMax <= 0) continue;
          const sAcc = sessionAccepted[sIdx] || 0;
          if (sAcc >= sMax) {
            if (s.allowWaitlist === false) throw new Error("QUOTA:梯次 " + (sIdx + 1) + " 名額已滿，不接受新報名");
            const sWait = sessionWaitlist[sIdx] || 0;
            txWn = sWait + 1;
            txStatus = "備取" + txWn;
          }
        }
      } else {
        const maxT = compInTx.maxTeams || 0;
        if (maxT > 0 && accepted >= maxT) {
          if (cfgInTx.allowWaitlist === false) throw new Error("QUOTA:報名已額滿，不接受新報名");
          txWn = waitlist + 1;
          txStatus = "備取" + txWn;
        }
      }

      // Write team doc inside transaction
      const teamRef = db.collection("teams").doc(teamId);
      tx.set(teamRef, {
        teamId, compId, registrationTime: fmtNow(), group: fd.group || "",
        teamNameCN: fd.teamNameCN || "", teamNameEN: fd.teamNameEN || "",
        status: txStatus, paymentStatus: "待確認", paymentMethod: fd.paymentMethod || "",
        remitterName: fd.remitterName || "", remitterBank: fd.remitterBank || "",
        remitterAccount: fd.remitterAccount || "", note: "", passwordBcrypt: hashPwdBcrypt(pwd),
        waitlistNum: txWn, creditCardOrderNo: fd.creditCardOrderNo || "", fileUrl: "",
        selectedSessions: fd.selectedSessions || [fd.selectedSession || 0],
        customAnswers: fd.customAnswers || {},
        // Registrant terms e-signature audit trail (#1): submitting = click-wrap acceptance.
        consentSignature: { agreed: true, signedAt: fmtNow(), ip: clientIp(request), version: TERMS_VERSION }
      });

      // Increment teamCount atomically (reuse compRef already in transaction read set)
      tx.update(compRef, { teamCount: FieldValue.increment(1) });

      return { status: txStatus, wn: txWn };
    });
    status = result.status;
    wn = result.wn;
  } catch (e) {
    // Handle quota-exceeded errors thrown inside transaction
    if (e.message && e.message.startsWith("QUOTA:")) {
      return { success: false, message: e.message.substring(6) };
    }
    throw e;
  }

  // Write members outside transaction (not quota-sensitive)
  const members = [];
  (fd.students || []).forEach((s, i) => { members.push({ teamId, compId, role: "學生", seq: i + 1, ...s }); });
  (fd.teachers || []).forEach((t, i) => { members.push({ teamId, compId, role: "教練", seq: i + 1, ...t }); });
  const memBatch = db.batch();
  members.forEach(m => memBatch.set(db.collection("members").doc(), m));
  await memBatch.commit();
  
  await auditLog("", "報名", teamId, cfg.competitionName || "");

  // 【信件排版優化】：專業版樣式 + QR Code 產生
  if (cfg.autoEmailNotification !== false) {
    const emailList = [...new Set(members.map(m => m.email).filter(e => e))];
    if (emailList.length > 0) {
      const subject = `[RegMaster] 報名成功通知 - ${cfg.competitionName || ''}`;
      const qrUrl = `https://quickchart.io/qr?text=${teamId}&size=150`;
      const activityUrl = `${EMAIL_HOST}/?comp=${compId}`;
      const calStart = (cfg.sessions && cfg.sessions[0] && cfg.sessions[0].startDate) ? new Date(cfg.sessions[0].startDate) : null;
      const calEnd = calStart ? (cfg.sessions[0].endDate ? new Date(cfg.sessions[0].endDate) : new Date(calStart.getTime() + 28800000)) : null;
      const calFmt = (dt) => dt ? dt.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z' : '';
      const calUrl = calStart ? `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cfg.competitionName||'')}&dates=${calFmt(calStart)}/${calFmt(calEnd)}` : '';
      const bodyHtml = `
        <p style="font-size:16px;line-height:1.6;margin-top:0">您好，您已成功報名 <b>${cfg.competitionName || ''}</b>。</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0">
          <p style="margin:0 0 12px;font-size:15px;color:#64748b">報名編號 <span style="display:block;font-size:22px;color:#0A437A;font-weight:900;font-family:monospace;letter-spacing:1px;margin-top:4px">${teamId}</span></p>
          <p style="margin:0 0 12px;font-size:15px;color:#64748b">登入密碼 <span style="display:block;font-size:20px;color:#d97706;font-weight:800;font-family:monospace;letter-spacing:2px;margin-top:4px">${pwd}</span></p>
          <p style="margin:0;font-size:15px;color:#64748b">報名狀態 <span style="display:block;margin-top:6px"><span style="background:#ecfdf5;border:1px solid #10b981;color:#10b981;padding:4px 12px;border-radius:6px;font-weight:bold;font-size:14px">${status}</span></span></p>
        </div>
        <div style="text-align:center;margin:20px 0">
          <p style="font-size:14px;color:#64748b;font-weight:bold;margin-bottom:12px">憑此 QR Code 進行報到或查詢：</p>
          <img src="${qrUrl}" alt="QR Code" width="140" height="140" style="border:1px solid #cbd5e1;border-radius:8px;padding:6px;background:#fff">
        </div>
        <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto"><tr>
          <td style="background-color:#0A437A;padding:12px 24px;text-align:center">
            <a href="${activityUrl}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;font-family:'Segoe UI',Arial,sans-serif">🔙 返回活動</a>
          </td>
          <td width="10"></td>
          ${calUrl ? `<td style="background-color:#10b981;padding:12px 24px;text-align:center"><a href="${calUrl}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;font-family:'Segoe UI',Arial,sans-serif">📅 加入行事曆</a></td>` : ''}
        </tr></table>
        <p style="font-size:14px;color:#ef4444;font-weight:bold;background-color:#fef2f2;padding:12px;margin-bottom:0">⚠️ 請妥善保管您的報名編號與密碼，日後登入修改資料需使用此憑證。</p>`;
      const htmlBody = emailWrap('🎉 報名成功通知', bodyHtml);
      await db.collection("mail").add({ to: emailList, message: { subject: subject, html: htmlBody, text: `報名成功！您的報名編號：${teamId}，密碼：${pwd}` } });
    }
  }
  // Notify the organiser of a new registration (honors notifPrefs.email.newRegistration). Best-effort.
  await notifyOrganizer(compId, "newRegistration",
    `[RegMaster] 新報名通知 — ${cfg.competitionName || ""}`,
    emailWrap("📥 新的報名", `<p>活動「<b>${escMail(cfg.competitionName || "")}</b>」收到一筆新報名。</p>
      <p>報名編號：<b>${escMail(teamId)}</b><br>隊伍：${escMail(fd.teamNameCN || fd.teamNameEN || "")}<br>狀態：${escMail(status)}</p>
      <p style="color:#475569;font-size:13px">登入主辦後台即可查看完整報名資料。</p>`));
  return { success: true, teamId, password: pwd, status };
});


// ===== 新增：帳號申請與驗證信功能 =====
exports.requestAccount = callable(async (data, request) => {
  // L-1: throttle account-request + OTP-email spam (5 per 10 min per IP).
  const _rl = await checkRateLimit("racc_ip_" + clientIp(request), 5, 600000);
  if (!_rl.ok) return { success: false, message: "操作過於頻繁，請稍後再試" };
  const { username, password, displayName, email, phone, intendedPlan, eulaAgreed } = data;
  if (!username || !password || !email || !displayName) return { success: false, message: "必填欄位請填寫完整" };
  if (!eulaAgreed) return { success: false, message: "請先閱讀並同意服務條款與 EULA" };

  // V3 Phase 2.5: validate plan from signup page (defaults to "free" legacy behavior)
  // QW-2: the 14-day free trial is offered for Starter / Pro only (no standalone "trial" plan).
  const validPlans = ["free", "starter", "pro"];
  const plan = validPlans.includes(intendedPlan) ? intendedPlan : "free";

  // 檢查是否已被註冊
  const existUser = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (!existUser.empty) return { success: false, message: "此帳號已被註冊" };

  const existEmail = await db.collection("accounts").where("email", "==", email).limit(1).get();
  if (!existEmail.empty) return { success: false, message: "此 Email 已被註冊過" };

  // 產生 6 位數 OTP 驗證碼
  const otp = crypto.randomInt(100000, 1000000).toString();

  // 寫入暫存區 (15分鐘後過期)
  await db.collection("accountRequests").doc(username).set({
    username, passwordHash: hashPwd(password), displayName, email, phone, otp,
    intendedPlan: plan,
    eulaVersion: EULA_VERSION, eulaAgreed: true,
    expiresAt: new Date(Date.now() + 15 * 60000).getTime()
  });

  // 發送驗證信
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0A437A; padding: 20px; text-align: center; color: white;"><h2 style="margin: 0;">RegMaster 帳號驗證碼</h2></div>
      <div style="padding: 30px 20px; text-align: center;">
        <p style="font-size: 16px;">您好 <b>${displayName}</b>，您的註冊驗證碼為：</p>
        <div style="font-size: 32px; font-weight: 900; color: #F49121; letter-spacing: 4px; margin: 20px 0; background: #FFF7ED; padding: 15px; border-radius: 8px;">${otp}</div>
        <p style="font-size: 14px; color: #ef4444;">請於 15 分鐘內在系統中輸入以完成開通。</p>
      </div>
    </div>
  `;
  await db.collection("mail").add({
    to: [email],
    message: { subject: "[RegMaster] 帳號申請驗證碼", html: htmlBody, text: `您的驗證碼為: ${otp}` }
  });

  return { success: true };
});

// ===== 新增：忘記密碼與重置 =====
// C-7a: account password reset now emails a one-time RESET LINK (no plaintext password is ever
// sent). Keeps the 15-min cooldown + anti-enumeration. The link lands on /reset-account.html,
// which consumes the token via resetAccountPassword and sets a bcrypt hash.
exports.resetAdminPassword = callable(async (data, request) => {
  const email = String((data && data.email) || "").trim();
  if (!email) return { success: false, message: "請輸入 Email" };
  const genericMsg = "若此 Email 已註冊，密碼重設連結將寄送至信箱";
  // L-1: throttle reset-email bombing per IP. Return the generic message (not an error) so the
  // limit can't be used to probe registered emails (consistent with the anti-enumeration design).
  const _rl = await checkRateLimit("rpw_ip_" + clientIp(request), 5, 600000);
  if (!_rl.ok) return { success: true, message: genericMsg };

  let snap = await db.collection("accounts").where("email", "==", email).limit(1).get();
  if (snap.empty) snap = await db.collection("accounts").where("email", "==", email.toLowerCase()).limit(1).get();
  if (snap.empty) return { success: true, message: genericMsg }; // anti-enumeration

  const doc = snap.docs[0];
  const user = doc.data();

  // Rate limit: 15 min cooldown per account. Return the generic message (not an error) so the
  // cooldown can't be used to probe which emails are registered.
  if (Date.now() - (user.lastPasswordReset || 0) < 900000) return { success: true, message: genericMsg };
  await doc.ref.update({ lastPasswordReset: Date.now() });

  // Invalidate any prior unused tokens, then issue a fresh one-time token (60-min TTL).
  const oldSnap = await db.collection("accountPwdResets").where("username", "==", user.username).where("used", "==", false).get();
  if (oldSnap.size) { const b = db.batch(); oldSnap.docs.forEach(d => b.update(d.ref, { used: true, invalidatedAt: fmtNow() })); await b.commit(); }
  const token = generateSessionToken();
  await db.collection("accountPwdResets").doc(token).set({
    username: user.username, used: false, expiresAt: Date.now() + 60 * 60 * 1000, createdAt: fmtNow()
  });
  const link = EMAIL_HOST + "/reset-account.html?token=" + token;
  const html = emailWrap("重設您的 RegMaster 密碼", `
    <p>您好 <b>${escMail(user.displayName || user.username)}</b>，</p>
    <p>我們收到您（或他人）為此帳號申請的密碼重設。請點擊以下按鈕設定新密碼，連結將於 <b>60 分鐘</b>後失效：</p>
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto"><tr>
      <td style="background-color:#0A437A;padding:13px 28px;border-radius:8px;text-align:center">
        <a href="${link}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:'Segoe UI',Arial,sans-serif">設定新密碼</a>
      </td>
    </tr></table>
    <p style="font-size:12px;color:#94a3b8;word-break:break-all">若按鈕無法點擊，請複製此連結至瀏覽器開啟：<br>${link}</p>
    <p style="font-size:13px;color:#64748b;margin-top:16px">若您並未提出此申請，可忽略本信，您的密碼不會被變更。</p>`);
  await queueMail([user.email || email], "[RegMaster] 密碼重設連結", html);
  return { success: true, message: genericMsg };
});

// Validate an account reset token (for reset-account.html on load).
exports.verifyAccountResetToken = callable(async (data) => {
  const token = String((data && data.token) || "").trim();
  if (!token) return { valid: false, message: "連結無效" };
  const doc = await db.collection("accountPwdResets").doc(token).get();
  if (!doc.exists) return { valid: false, message: "連結無效或不存在" };
  const r = doc.data();
  if (r.used) return { valid: false, message: "此連結已使用過，請重新申請" };
  if (!r.expiresAt || r.expiresAt < Date.now()) return { valid: false, message: "連結已過期，請重新申請" };
  return { valid: true };
});

// Consume an account reset token and set a new (bcrypt) password. One-time use; also clears the
// existing session token so any active sessions are signed out.
exports.resetAccountPassword = callable(async (data) => {
  const token = String((data && data.token) || "").trim();
  const newPassword = String((data && data.newPassword) || "");
  if (!token) return { success: false, message: "連結無效" };
  if (newPassword.length < 6 || newPassword.length > 30) return { success: false, message: "密碼長度須為 6–30 字元" };
  if (/\s/.test(newPassword)) return { success: false, message: "密碼不可包含空白字元" };
  const ref = db.collection("accountPwdResets").doc(token);
  const pre = await ref.get();
  if (!pre.exists) return { success: false, message: "連結無效或不存在" };
  const accSnap = await db.collection("accounts").where("username", "==", pre.data().username).limit(1).get();
  if (accSnap.empty) return { success: false, message: "帳號不存在" };
  const accRef = accSnap.docs[0].ref;
  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return { success: false, message: "連結無效或不存在" };
    const r = doc.data();
    if (r.used) return { success: false, message: "此連結已使用過，請重新申請" };
    if (!r.expiresAt || r.expiresAt < Date.now()) return { success: false, message: "連結已過期，請重新申請" };
    tx.update(accRef, { passwordBcrypt: hashPwdBcrypt(newPassword), passwordHash: "", sessionToken: "" });
    tx.update(ref, { used: true, usedAt: fmtNow() });
    return { success: true, username: r.username };
  });
  if (result.success) await auditLog(result.username, "重設密碼", result.username, "via reset-link");
  return result.success ? { success: true, message: "密碼已更新，請使用新密碼登入。" } : result;
});

// ===== 新增：系統管理員寄發單獨信件給活動管理員 =====
exports.sendSystemEmail = authCallable(["system"], async (data, request) => {
  const { targetEmail, subject, content } = data;
  const htmlBody = `
    <div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:10px;max-width:600px;">
      <div style="background:#0A437A;color:#fff;padding:15px;border-radius:8px 8px 0 0;text-align:center;">
        <h2 style="margin:0;font-size:18px;">RegMaster 系統通知</h2>
      </div>
      <div style="padding:20px;background:#f8fafc;color:#333;line-height:1.6;">
        ${content.replace(/\n/g, '<br>')}
      </div>
    </div>
  `;
  await db.collection("mail").add({
    to: [targetEmail],
    message: { subject: `[RegMaster 系統通知] ${subject}`, html: htmlBody, text: content }
  });
  await auditLog(request.authUser.username, "發送系統信件", targetEmail, subject);
  return { success: true };
});



exports.verifyAccount = callable(async (data, request) => {
  // N-6: per-IP throttle on OTP verification (the 5-attempt cap is per pending request only).
  const _rl = await checkRateLimit("verify_ip_" + clientIp(request), 30, 600000);
  if (!_rl.ok) return { success: false, message: "嘗試過於頻繁，請稍後再試" };
  const { username, otp } = data;
  const doc = await db.collection("accountRequests").doc(username).get();
  if (!doc.exists) return { success: false, message: "查無申請紀錄，或已逾期失效" };
  
  const reqData = doc.data();
  if (Date.now() > reqData.expiresAt) return { success: false, message: "驗證碼已過期，請重新申請" };
  
  // Brute force protection: max 5 attempts
  const attempts = reqData.otpAttempts || 0;
  if (attempts >= 5) {
    await doc.ref.delete();
    return { success: false, message: "驗證嘗試過多，請重新申請帳號" };
  }
  
  if (reqData.otp !== otp) {
    await doc.ref.update({ otpAttempts: attempts + 1 });
    const remaining = 4 - attempts;
    return { success: false, message: "驗證碼輸入錯誤（剩餘 " + remaining + " 次機會）" };
  }

  // 1. 正式建立帳號（V3 Phase 2.5：紀錄使用者註冊時的方案意圖）
  const intendedPlan = reqData.intendedPlan || "free";
  await db.collection("accounts").add({
    username: reqData.username, passwordHash: reqData.passwordHash, role: "competition",
    displayName: reqData.displayName, email: reqData.email, phone: reqData.phone || "",
    emailVerified: true,
    intendedPlan,                       // V3: signup-time plan choice (free/trial/starter/pro)
    // EULA click-wrap acceptance audit trail (#1)
    eulaAcceptedAt: fmtNow(), eulaVersion: reqData.eulaVersion || EULA_VERSION, eulaIp: clientIp(request),
    createdAt: fmtNow(), loginFails: 0, lockedUntil: ""
  });

  // 2. 產出授權碼。依方案不同建立不同類型：
  //    free  → 維持原本 count=1 未啟用授權碼（使用者拿到 code 再去 activateLicense）
  //    trial / starter / pro → 預先啟用的 14 天 subscription，可立即建活動，無 code 啟用步驟
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RM";
  for (let i = 0; i < 4; i++) {
    code += "-";
    for (let j = 0; j < 4; j++) code += c[crypto.randomInt(c.length)];
  }

  const isTrial = intendedPlan === "starter" || intendedPlan === "pro";   // QW-2: Starter/Pro only
  const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  if (isTrial) {
    // 14-day subscription, pre-activated for the new user
    await db.collection("licenses").doc(code).set({
      code, type: "subscription", maxCount: 0, usedCount: 0, years: 0,
      activatedBy: reqData.username,
      activatedAt: fmtNow(),
      expiresAt: trialExpiresAt,
      status: "已啟用",
      createdAt: fmtNow(),
      trial: true,                       // V3 marker: distinguish trial from paid subscription
      intendedPlan                       // remember which paid plan they wanted (for upsell)
    });
  } else {
    // Legacy behavior: free single-count license, user must activate manually
    await db.collection("licenses").doc(code).set({
      code, type: "count", maxCount: 1, usedCount: 0, years: 0,
      activatedBy: "", activatedAt: "", expiresAt: "",
      status: "未啟用", createdAt: fmtNow()
    });
  }

  // 3. 發送歡迎信（內容依方案而異）
  const subject = isTrial
    ? "🎉 [RegMaster] 14 天免費試用已啟動"
    : "🎉 [RegMaster] 帳號開通成功與專屬授權碼";

  const trialExpDate = trialExpiresAt.substring(0, 10);
  const bodyTrial = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0A437A; padding: 20px; text-align: center; color: white;"><h2 style="margin: 0;">🎉 您的試用已啟動</h2></div>
      <div style="padding: 30px 20px;">
        <p style="font-size: 16px;">您好 <b>${reqData.displayName}</b>，您的帳號已成功開通並啟動 <b>14 天免費試用</b>！</p>
        <p style="font-size: 16px;">所有功能無使用限制，可立即建立活動 — <b>${intendedPlan === "trial" ? "" : "您原本選擇的方案是「" + intendedPlan + "」，試用期結束後可前往帳務頁升級。"}</b></p>
        <div style="padding: 15px; background: #FFF7ED; border-radius: 8px; margin: 20px 0;">
          <div style="font-size: 12px; color: #64748b; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px">試用期效</div>
          <div style="font-size: 16px; font-weight: 700; color: #0A437A">即日起 ~ ${trialExpDate}</div>
        </div>
        <p style="font-size: 14px; color: #64748b;">💡 提示：登入後即可直接建立第一場活動，無需輸入授權碼。試用期內所有功能皆可使用。</p>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 16px;">內部紀錄：授權碼 <code>${code}</code></p>
      </div>
    </div>
  `;
  const bodyFree = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #10b981; padding: 20px; text-align: center; color: white;"><h2 style="margin: 0;">🎉 歡迎加入 RegMaster</h2></div>
      <div style="padding: 30px 20px;">
        <p style="font-size: 16px;">您好 <b>${reqData.displayName}</b>，您的帳號已成功開通！</p>
        <p style="font-size: 16px;">為了讓您體驗平台的強大功能，我們贈送您一組免費的「單次活動授權碼」：</p>
        <div style="padding: 15px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; font-size: 18px; font-family: monospace; font-weight: bold; color: #0A437A; text-align: center; letter-spacing: 2px; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 14px; color: #64748b;">💡 提示：請登入系統後，於首頁點擊「輸入授權碼」進行啟用，即可開始建立您的第一場活動！</p>
      </div>
    </div>
  `;
  await db.collection("mail").add({
    to: [reqData.email],
    message: {
      subject,
      html: isTrial ? bodyTrial : bodyFree,
      text: isTrial ? `14 天試用已啟動，至 ${trialExpDate}` : `授權碼: ${code}`
    }
  });

  // 4. 清除暫存
  await doc.ref.delete();

  return { success: true, plan: intendedPlan, isTrial };
});

// Resend the signup OTP for a pending accountRequests doc. Anti-enumeration (always generic
// success), IP-rate-limited, plus a 60s per-request cooldown. Regenerates the OTP, resets the
// attempt counter, and extends the 15-min TTL.
exports.resendVerification = callable(async (data, request) => {
  const username = String((data && data.username) || "").trim();
  const generic = { success: true, message: "若申請仍有效，新的驗證碼已重新寄出" };
  if (!username) return { success: false, message: "缺少帳號" };
  const _rl = await checkRateLimit("resend_ip_" + clientIp(request), 5, 600000);
  if (!_rl.ok) return generic;                       // throttle silently (anti-enumeration)
  const ref = db.collection("accountRequests").doc(username);
  const doc = await ref.get();
  if (!doc.exists) return generic;                   // don't reveal whether the request exists
  const reqData = doc.data();
  if (Date.now() - (reqData.lastResent || 0) < 60000) return generic;  // 60s cooldown
  const otp = crypto.randomInt(100000, 1000000).toString();
  await ref.update({ otp, otpAttempts: 0, lastResent: Date.now(), expiresAt: Date.now() + 15 * 60000 });
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0A437A; padding: 20px; text-align: center; color: white;"><h2 style="margin: 0;">RegMaster 帳號驗證碼（重新寄送）</h2></div>
      <div style="padding: 30px 20px; text-align: center;">
        <p style="font-size: 16px;">您好 <b>${escMail(reqData.displayName || "")}</b>，您的新驗證碼為：</p>
        <div style="font-size: 32px; font-weight: 900; color: #F49121; letter-spacing: 4px; margin: 20px 0; background: #FFF7ED; padding: 15px; border-radius: 8px;">${otp}</div>
        <p style="font-size: 14px; color: #ef4444;">請於 15 分鐘內在系統中輸入以完成開通。</p>
      </div>
    </div>`;
  await queueMail(reqData.email, "[RegMaster] 帳號申請驗證碼（重新寄送）", htmlBody, `您的驗證碼為: ${otp}`);
  return generic;
});

exports.loginTeam = callable(async (data, request) => {
  const { compId, teamId, password } = data;
  // N-6: per-IP throttle (team passwords are low-entropy and previously had NO lockout at all).
  const _rl = await checkRateLimit("loginteam_ip_" + clientIp(request), 30, 600000);
  if (!_rl.ok) return { success: false, message: "嘗試過於頻繁，請稍後再試" };
  const doc = await db.collection("teams").doc(teamId).get();
  if (!doc.exists || doc.data().compId !== compId) return { success: false, message: "找不到" };
  // N-6: per-team failure lockout (mirrors loginAccount) — stops brute-forcing one team's password.
  const _t = doc.data();
  if (_t.lockedUntil && new Date() < new Date(_t.lockedUntil)) return { success: false, message: "嘗試過多，請稍後再試" };
  if (!verifyTeamPwd(_t, password)) {
    const fails = (_t.loginFails || 0) + 1;
    const upd = { loginFails: fails };
    if (fails >= 8) upd.lockedUntil = new Date(Date.now() + 900000).toISOString();  // 15-min lock after 8 misses
    await doc.ref.update(upd).catch(() => {});
    return { success: false, message: fails >= 8 ? "嘗試過多，鎖定 15 分鐘" : "密碼錯誤" };
  }
  if (_t.loginFails || _t.lockedUntil) { await doc.ref.update({ loginFails: 0, lockedUntil: "" }).catch(() => {}); }
  await upgradeTeamPwd(doc.ref, doc.data(), password);
  const team = doc.data();
  const { password: _, ...safeTeam } = team;
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  const students = [], teachers = [];
  memSnap.docs.forEach(d => {
    const m = d.data();
    if (m.role === "學生") students.push(m);
    else teachers.push(m);
  });
  return { success: true, team: safeTeam, students, teachers };
});

// 報名者忘記密碼：將「報名編號 + 密碼」重新寄到報名時填的 Email（不在畫面顯示）。
exports.recoverTeamPassword = callable(async (data) => {
  const { compId, email } = data;
  const e = String(email || "").trim();
  const generic = { success: true, message: "若該 Email 有報名此活動，我們已將報名編號與密碼重設連結寄出，請查收信箱（含垃圾郵件匣）。" };
  if (!compId || !e) return generic;
  // Find this activity's members with that email (bounded per competition).
  const memSnap = await db.collection("members").where("compId", "==", compId).get();
  const teamIds = new Set();
  memSnap.docs.forEach(d => { const m = d.data(); if (m.email && String(m.email).trim().toLowerCase() === e.toLowerCase()) teamIds.add(m.teamId); });
  if (!teamIds.size) return generic;
  const compDoc = await db.collection("competitions").doc(compId).get();
  const compName = compDoc.exists ? ((compDoc.data().config && compDoc.data().config.competitionName) || compDoc.data().name || "活動") : "活動";
  const rows = [];
  for (const tid of teamIds) {
    const tDoc = await db.collection("teams").doc(tid).get();
    if (!tDoc.exists) continue;
    const t = tDoc.data();
    if (t.status === "已取消") continue;
    // P0-2: never email the password. Issue a one-time reset link (60-min) per registration.
    const token = generateSessionToken();
    await db.collection("teamPwdResets").doc(token).set({ teamId: tid, compId, used: false, expiresAt: Date.now() + 60 * 60 * 1000, createdAt: fmtNow() });
    const link = EMAIL_HOST + "/reset-team.html?token=" + token;
    rows.push("報名編號：<b>" + escMail(t.teamId || tid) + "</b>" + (t.teamNameCN ? "（" + escMail(t.teamNameCN) + "）" : "") +
      "<br><a href=\"" + link + "\" target=\"_blank\" style=\"color:#0A437A;font-weight:700;text-decoration:none\">設定 / 重設密碼 →</a>");
  }
  if (rows.length) {
    const html = emailWrap("您的報名編號與密碼重設連結", `
      <p>您在活動「<b>${escMail(compName)}</b>」的報名如下。基於安全，系統不再寄送密碼；請點擊連結設定新密碼（連結 <b>60 分鐘</b>內有效，用後即失效）：</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:12px 0;font-size:14px;line-height:2">${rows.join("<br><br>")}</div>
      <p style="color:#64748b;font-size:13px">設定密碼後，請至活動頁「查詢已報名」以報名編號 + 新密碼登入，即可查詢、修改報名或申請退費。</p>`);
    await queueMail(e, "[RegMaster] 報名編號與密碼重設連結 — " + compName, html);
  }
  return generic;
});

// ===== 報名者隊伍密碼：以「報名編號」申請一次性重設連結（取代明碼重寄）=====
// 安全考量：一律回傳通用訊息，不洩漏報名編號是否存在；token 一次性、60 分鐘到期。
exports.requestTeamPasswordReset = callable(async (data) => {
  const teamId = String((data && data.teamId) || "").trim().toUpperCase();
  const generic = { success: true, message: "若此報名編號存在，密碼重設連結已寄至報名時填寫的 Email，請查收（含垃圾郵件匣）。" };
  if (!teamId) return generic;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists) return generic;
  const t = tDoc.data();
  if (t.status === "已取消") return generic;
  const compId = t.compId;
  // 收集此報名的 Email（報名時填於成員資料）
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  const emails = [...new Set(memSnap.docs.map(d => d.data().email).filter(e => e && String(e).trim()))];
  if (!emails.length) return generic;
  // 活動名稱
  const compDoc = await db.collection("competitions").doc(compId).get();
  const compName = compDoc.exists ? ((compDoc.data().config && compDoc.data().config.competitionName) || compDoc.data().name || "活動") : "活動";
  // 失效任何此報名先前未使用的 token，避免堆積
  const oldSnap = await db.collection("teamPwdResets").where("teamId", "==", teamId).where("used", "==", false).get();
  // C-7b: 10-min per-teamId cooldown to prevent reset-email bombing. A token's create time is
  // (expiresAt - 60min); if one was issued within the last 10 min, silently skip re-sending and
  // still return the generic message (so account/registration existence isn't revealed).
  const _RESET_TTL = 60 * 60 * 1000;
  if (oldSnap.docs.some(d => ((d.data().expiresAt || 0) - _RESET_TTL) > (Date.now() - 10 * 60 * 1000))) return generic;
  const batch = db.batch();
  oldSnap.docs.forEach(d => batch.update(d.ref, { used: true, invalidatedAt: fmtNow() }));
  if (oldSnap.size) await batch.commit();
  // 建立新 token（64 hex 字元）
  const token = generateSessionToken();
  await db.collection("teamPwdResets").doc(token).set({
    teamId, compId, used: false,
    expiresAt: Date.now() + 60 * 60 * 1000,
    createdAt: fmtNow()
  });
  const link = EMAIL_HOST + "/reset-team.html?token=" + token;
  const html = emailWrap("重設您的報名密碼", `
    <p>您（或他人）為活動「<b>${escMail(compName)}</b>」中報名編號 <b>${escMail(teamId)}</b> 申請了密碼重設。</p>
    <p>請點擊以下按鈕設定新密碼，連結將於 <b>60 分鐘</b>後失效：</p>
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto"><tr>
      <td style="background-color:#0A437A;padding:13px 28px;border-radius:8px;text-align:center">
        <a href="${link}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:'Segoe UI',Arial,sans-serif">設定新密碼</a>
      </td>
    </tr></table>
    <p style="font-size:12px;color:#94a3b8;word-break:break-all">若按鈕無法點擊，請複製此連結至瀏覽器開啟：<br>${link}</p>
    <p style="font-size:13px;color:#64748b;margin-top:16px">若您並未提出此申請，可忽略本信，您的密碼不會被變更。</p>`);
  await queueMail(emails, "[RegMaster] 報名密碼重設連結 — " + compName, html);
  return generic;
});

// 驗證重設 token（供 reset-team.html 載入時判斷連結是否有效）
exports.verifyTeamResetToken = callable(async (data) => {
  const token = String((data && data.token) || "").trim();
  if (!token) return { valid: false, message: "連結無效" };
  const doc = await db.collection("teamPwdResets").doc(token).get();
  if (!doc.exists) return { valid: false, message: "連結無效或不存在" };
  const r = doc.data();
  if (r.used) return { valid: false, message: "此連結已使用過，請重新申請" };
  if (!r.expiresAt || r.expiresAt < Date.now()) return { valid: false, message: "連結已過期，請重新申請" };
  return { valid: true, teamId: r.teamId };
});

// 以 token 設定新密碼（一次性消耗）
exports.resetTeamPassword = callable(async (data) => {
  const token = String((data && data.token) || "").trim();
  const newPassword = String((data && data.newPassword) || "");
  if (!token) return { success: false, message: "連結無效" };
  if (newPassword.length < 6 || newPassword.length > 30) return { success: false, message: "密碼長度須為 6–30 字元" };
  if (/\s/.test(newPassword)) return { success: false, message: "密碼不可包含空白字元" };
  const ref = db.collection("teamPwdResets").doc(token);
  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return { success: false, message: "連結無效或不存在" };
    const r = doc.data();
    if (r.used) return { success: false, message: "此連結已使用過，請重新申請" };
    if (!r.expiresAt || r.expiresAt < Date.now()) return { success: false, message: "連結已過期，請重新申請" };
    const teamRef = db.collection("teams").doc(r.teamId);
    const tDoc = await tx.get(teamRef);
    if (!tDoc.exists) return { success: false, message: "找不到此報名" };
    tx.update(teamRef, { passwordBcrypt: hashPwdBcrypt(newPassword), password: FieldValue.delete() });
    tx.update(ref, { used: true, usedAt: fmtNow() });
    return { success: true, teamId: r.teamId, compId: r.compId };
  });
  if (result.success) await auditLog("", "重設隊伍密碼", result.teamId, "via reset-link");
  if (result.success) return { success: true, message: "密碼已更新，請使用新密碼登入。", teamId: result.teamId, compId: result.compId };
  return result;
});

// ===== 退款機制（主辦方全責；平台不經手金流，只做流程/試算/註記/釋名額）=====
// 法定下限：主辦方設定的退費% 不得低於下列下限（可更優待，不可更苛）。
const REFUND_TEMPLATES = {
  travel: {
    label: "營隊／旅遊型（依國內旅遊定型化契約）",
    floors: [{ minDays: 41, pct: 95 }, { minDays: 31, pct: 90 }, { minDays: 21, pct: 80 }, { minDays: 2, pct: 70 }, { minDays: 1, pct: 50 }],
    suggest: [{ daysBefore: 41, pct: 95 }, { daysBefore: 31, pct: 90 }, { daysBefore: 21, pct: 80 }, { daysBefore: 2, pct: 70 }, { daysBefore: 1, pct: 50 }]
  },
  course: {
    label: "課程／工作坊（依短期補習班設立及管理準則§24）",
    floors: [{ minDays: 1, pct: 90 }],
    suggest: [{ daysBefore: 1, pct: 90 }]
  },
  general: {
    label: "一般活動／競賽（建議比照旅遊級距）",
    floors: [{ minDays: 41, pct: 95 }, { minDays: 31, pct: 90 }, { minDays: 21, pct: 80 }, { minDays: 2, pct: 70 }, { minDays: 1, pct: 50 }],
    suggest: [{ daysBefore: 30, pct: 80 }, { daysBefore: 7, pct: 70 }, { daysBefore: 1, pct: 50 }]
  }
};
function refundFloorPct(template, daysBefore) {
  if (daysBefore <= 0) return 0;
  const t = REFUND_TEMPLATES[template] || REFUND_TEMPLATES.general;
  const sorted = t.floors.slice().sort((a, b) => b.minDays - a.minDays);
  for (const f of sorted) { if (daysBefore >= f.minDays) return f.pct; }
  return 0;
}
// Whole days from today (Asia/Taipei) until the event date "YYYY-MM-DD".
function daysUntil(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const ev = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const tw = new Date(Date.now() + 8 * 3600000);
  const today = Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate());
  return Math.round((ev - today) / 86400000);
}
// Given a competition + team, compute the applicable refund per the organiser's policy.
function computeRefund(comp, team) {
  const cfg = comp.config || {};
  const policy = cfg.refundPolicy || null;
  const paid = Number(cfg.registrationFee || 0);
  const eventDate = cfg.competitionDate || "";
  const d = daysUntil(eventDate);
  const out = { paidAmount: paid, eventDate, daysBefore: d, pct: null, calcRefund: 0,
    pastStart: false, hasPolicy: !!(policy && Array.isArray(policy.tiers) && policy.tiers.length), eventDateMissing: d === null,
    template: (policy && policy.template) || "" };
  if (d === null) return out;
  if (d <= 0) { out.pastStart = true; return out; }
  if (!out.hasPolicy) return out;
  const tiers = policy.tiers.slice().sort((a, b) => b.daysBefore - a.daysBefore);
  let pct = 0;
  for (const t of tiers) { if (d >= Number(t.daysBefore)) { pct = Number(t.pct); break; } }
  out.pct = pct;
  out.calcRefund = Math.round(paid * pct / 100);
  return out;
}

// ---- Refund email helpers ----
function escMail(s) { return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]); }
async function refundTeamEmails(teamId) {
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  const set = new Set();
  memSnap.docs.forEach(d => { const e = d.data().email; if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) set.add(e); });
  return [...set];
}
async function organiserEmail(creator) {
  if (!creator) return "";
  const a = await db.collection("accounts").where("username", "==", creator).limit(1).get();
  return a.empty ? "" : (a.docs[0].data().email || "");
}
async function organiserContact(creator) {
  if (!creator) return { name: "", email: "" };
  const a = await db.collection("accounts").where("username", "==", creator).limit(1).get();
  if (a.empty) return { name: "", email: "" };
  const ac = a.docs[0].data();
  return { name: ac.organizationName || ac.displayName || "", email: ac.email || "" };
}
// Footer line with the organiser's unit name + email for registrant-facing emails.
function contactFooter(c) {
  if (!c || (!c.name && !c.email)) return "";
  return '主辦單位：' + escMail(c.name || "（未提供）") + (c.email ? '　·　聯絡 Email：' + escMail(c.email) : '');
}
async function queueMail(to, subject, html, text) {
  const arr = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : []);
  if (!arr.length) return;
  await db.collection("mail").add({ to: arr, message: { subject, html, text: text || subject } });
}

// Email a competition's organiser IF they have the matching notification preference on.
// Consumes the notifPrefs.email.<prefKey> toggle (settings → 通知偏好). Best-effort: any error
// is swallowed so it can never break the caller's registration / payment flow.
const NOTIF_EMAIL_DEFAULTS = { newRegistration: true, paymentReceived: true, dailyDigest: false, weekly: true };
async function notifyOrganizer(compId, prefKey, subject, html) {
  try {
    if (!compId) return;
    const cDoc = await db.collection("competitions").doc(compId).get();
    if (!cDoc.exists) return;
    const owner = cDoc.data().creator || cDoc.data().createdBy || "";
    if (!owner) return;
    const pDoc = await db.collection("notifPrefs").doc(owner).get();
    const emailPrefs = pDoc.exists ? (pDoc.data().email || {}) : {};
    const enabled = emailPrefs[prefKey] !== undefined ? !!emailPrefs[prefKey] : !!NOTIF_EMAIL_DEFAULTS[prefKey];
    if (!enabled) return;
    const aSnap = await db.collection("accounts").where("username", "==", owner).limit(1).get();
    if (aSnap.empty) return;
    const to = aSnap.docs[0].data().email || "";
    if (to) await queueMail(to, subject, html);
  } catch (e) { console.error("notifyOrganizer error:", e); }
}

// Templates + floors for the organiser policy editor.
exports.getRefundTemplates = callable(async () => {
  return { templates: Object.keys(REFUND_TEMPLATES).map(k => ({ key: k, label: REFUND_TEMPLATES[k].label, floors: REFUND_TEMPLATES[k].floors, suggest: REFUND_TEMPLATES[k].suggest })) };
});

// Registrant: preview refund policy + any existing request (teamId + password).
exports.getRefundPreview = callable(async (data) => {
  const { compId, teamId, password } = data;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists || tDoc.data().compId !== compId) return { success: false, message: "找不到報名資料" };
  const team = tDoc.data();
  if (!verifyTeamPwd(team, password)) return { success: false, message: "密碼錯誤" };
  const comp = (await db.collection("competitions").doc(compId).get()).data() || {};
  const calc = computeRefund(comp, team);
  let request = null;
  if (team.refundReqId) { const r = await db.collection("refundRequests").doc(team.refundReqId).get(); if (r.exists) request = r.data(); }
  return { success: true, calc, refundStatus: team.refundStatus || "", request };
});

// Registrant: submit a refund/withdrawal request.
exports.requestRefund = callable(async (data) => {
  const { compId, teamId, password, refundAccount, reason } = data;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists || tDoc.data().compId !== compId) return { success: false, message: "找不到報名資料" };
  const team = tDoc.data();
  if (!verifyTeamPwd(team, password)) return { success: false, message: "密碼錯誤" };
  if (team.status === "已取消") return { success: false, message: "此報名已取消" };
  if (["requested", "approved"].includes(team.refundStatus || "")) return { success: false, message: "已有退費申請處理中" };
  const comp = (await db.collection("competitions").doc(compId).get()).data() || {};
  const calc = computeRefund(comp, team);
  if (calc.eventDateMissing) return { success: false, message: "本活動未設定活動日期，請直接聯繫主辦方辦理退費" };
  if (calc.pastStart) return { success: false, message: "活動已開始或結束，線上退費已關閉，請直接聯繫主辦方" };
  if (!calc.hasPolicy) return { success: false, message: "主辦方尚未設定退費政策，請直接聯繫主辦方" };
  // 帳務重構 S4：判斷退費通道 — 有 PayUNI 已付訂單 → payuni_refund（平台退刷）；否則 owner_bank（主辦方自退）。
  let channel = "owner_bank", payMethod = team.paymentMethod || "", orderId = team.regPaymentId || "";
  if (orderId) {
    try {
      const rp = await db.collection("regPayments").doc(orderId).get();
      if (rp.exists && rp.data().status === "paid" && rp.data().payuniTradeNo && rp.data().payoutState !== "paid_out") { channel = "payuni_refund"; payMethod = "payuni"; }
    } catch (e) {}
  }
  const reqId = generateId("RF");
  await db.collection("refundRequests").doc(reqId).set({
    reqId, compId, creator: comp.creator || "", teamId,
    teamNameCN: team.teamNameCN || "", requesterName: team.remitterName || team.teamNameCN || "",
    refundAccount: String(refundAccount || "").slice(0, 200), reason: String(reason || "").slice(0, 500),
    status: "requested", policyTemplate: (comp.config && comp.config.refundPolicy || {}).template || "",
    policyPct: calc.pct, paidAmount: calc.paidAmount, calcRefund: calc.calcRefund, daysBefore: calc.daysBefore,
    paymentMethod: payMethod, channel, orderId,
    actualRefund: 0, refundMethod: "", refundProof: "", refundedAt: "", operator: "", decideNote: "",
    createdAt: fmtNow(), decidedAt: ""
  });
  await db.collection("teams").doc(teamId).update({ refundStatus: "requested", refundReqId: reqId, statusBeforeRefund: team.status || "正取", status: "退費申請中" });
  await auditLog("", "申請退費", teamId, "退" + calc.pct + "% / NT$" + calc.calcRefund);
  // Notify organiser (new refund request to review)
  try {
    const compName = (comp.config && comp.config.competitionName) || comp.name || "活動";
    const oEmail = await organiserEmail(comp.creator);
    const html = emailWrap("收到新的退費申請", `
      <p>活動「<b>${escMail(compName)}</b>」收到一筆退費申請，請至「報名管理 → 退費申請」審核。</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:12px 0;font-size:14px;line-height:1.8">
        <b>隊伍：</b>${escMail(team.teamNameCN || teamId)}（${escMail(teamId)}）<br>
        <b>距活動：</b>${calc.daysBefore} 天<br>
        <b>政策應退：</b>${calc.pct}% ＝ NT$${calc.calcRefund}<br>
        <b>退款帳戶：</b>${escMail(refundAccount || "（未填）")}<br>
        <b>原因：</b>${escMail(reason || "（未填）")}
      </div>
      <p style="color:#64748b;font-size:13px">提醒：退款由您自行處理，完成後請於後台「註記已退款」以釋出名額。平台不經手金流。</p>`);
    await queueMail(oEmail, "[RegMaster] 退費申請通知 — " + compName, html);
  } catch (e) { /* best-effort */ }
  return { success: true, reqId, pct: calc.pct, calcRefund: calc.calcRefund };
});

// Registrant: withdraw a pending request.
exports.withdrawRefund = callable(async (data) => {
  const { teamId, password } = data;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists) return { success: false, message: "找不到報名資料" };
  const team = tDoc.data();
  if (!verifyTeamPwd(team, password)) return { success: false, message: "密碼錯誤" };
  if ((team.refundStatus || "") !== "requested") return { success: false, message: "目前無可撤回的申請" };
  if (team.refundReqId) await db.collection("refundRequests").doc(team.refundReqId).update({ status: "withdrawn", decidedAt: fmtNow() });
  await db.collection("teams").doc(teamId).update({ refundStatus: FieldValue.delete(), refundReqId: FieldValue.delete(), status: team.statusBeforeRefund || "正取", statusBeforeRefund: FieldValue.delete() });
  return { success: true };
});

// Organiser: list refund requests for a competition.
exports.listRefundRequests = compAuthCallable(async (data) => {
  const snap = await db.collection("refundRequests").where("compId", "==", data.compId).get();
  const rows = snap.docs.map(d => d.data());
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { requests: rows };
});

// Organiser: approve / reject a request.
exports.decideRefund = compAuthCallable(async (data, request) => {
  const { reqId, action, note } = data;
  const rRef = db.collection("refundRequests").doc(reqId);
  const rDoc = await rRef.get();
  if (!rDoc.exists) return { success: false, message: "找不到申請" };
  const r = rDoc.data();
  if (r.status !== "requested") return { success: false, message: "此申請已處理" };
  const tDoc = await db.collection("teams").doc(r.teamId).get();
  const compDoc = await db.collection("competitions").doc(r.compId).get();
  const compName = compDoc.exists ? ((compDoc.data().config && compDoc.data().config.competitionName) || compDoc.data().name || "活動") : "活動";
  const contact = await organiserContact(compDoc.exists ? compDoc.data().creator : "");
  if (action === "reject") {
    await rRef.update({ status: "rejected", decideNote: String(note || "").slice(0, 500), operator: request.authUser.username, decidedAt: fmtNow() });
    if (tDoc.exists) { const t = tDoc.data(); await tDoc.ref.update({ refundStatus: FieldValue.delete(), status: t.statusBeforeRefund || "正取", statusBeforeRefund: FieldValue.delete() }); }
    await auditLog(request.authUser.username, "駁回退費", r.teamId, String(note || ""));
    try {
      const html = emailWrap("退費申請未通過", `
        <p>您在活動「<b>${escMail(compName)}</b>」的退費申請（隊伍 ${escMail(r.teamNameCN || r.teamId)}）未通過審核。</p>
        ${note ? `<p><b>主辦方說明：</b>${escMail(note)}</p>` : ""}
        <p>您的報名仍然有效。如有疑問請直接聯繫主辦方。</p>`, contactFooter(contact));
      await queueMail(await refundTeamEmails(r.teamId), "[RegMaster] 退費申請結果 — " + compName, html);
    } catch (e) {}
    return { success: true };
  }
  if (action === "approve") {
    await rRef.update({ status: "approved", decideNote: String(note || "").slice(0, 500), operator: request.authUser.username, decidedAt: fmtNow() });
    if (tDoc.exists) await tDoc.ref.update({ refundStatus: "approved" });
    // 帳務重構 S4：PayUNI 通道核准後，標記訂單 refundState=approved，供「退刷」執行。
    if (r.channel === "payuni_refund" && r.orderId) { try { await db.collection("regPayments").doc(r.orderId).update({ refundState: "approved", refundReqId: reqId }); } catch (e) {} }
    await auditLog(request.authUser.username, "核准退費", r.teamId, "應退NT$" + r.calcRefund);
    try {
      const refundLine = r.channel === "payuni_refund"
        ? "主辦方核准後，將由平台透過原信用卡退刷退款（無需提供帳戶），完成後您會再收到通知。"
        : "主辦方將依您提供的退款帳戶辦理退款，完成後您會再收到一封通知。";
      const html = emailWrap("退費申請已核准", `
        <p>您在活動「<b>${escMail(compName)}</b>」的退費申請（隊伍 ${escMail(r.teamNameCN || r.teamId)}）已核准。</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:12px 0;font-size:14px;line-height:1.8">
          <b>應退金額：</b>${r.policyPct}% ＝ NT$${r.calcRefund}</div>
        <p>${refundLine}</p>`, contactFooter(contact));
      await queueMail(await refundTeamEmails(r.teamId), "[RegMaster] 退費申請已核准 — " + compName, html);
    } catch (e) {}
    return { success: true };
  }
  return { success: false, message: "未知動作" };
});

// Organiser: after refunding offline, mark refunded → cancel registration + release spot.
exports.markRefunded = compAuthCallable(async (data, request) => {
  const { reqId, actualRefund, refundMethod, refundProof } = data;
  const rRef = db.collection("refundRequests").doc(reqId);
  const rDoc = await rRef.get();
  if (!rDoc.exists) return { success: false, message: "找不到申請" };
  const r = rDoc.data();
  if (!["requested", "approved"].includes(r.status)) return { success: false, message: "此申請狀態無法註記退款" };
  // 帳務重構 S4：PayUNI 線上付款不可線下註記，須至「平台代收轉付」分頁退刷（系統自動退款）。
  if (r.channel === "payuni_refund") return { success: false, message: "此為 PayUNI 線上付款，請至「平台代收轉付」分頁執行退刷，系統將自動退款並取消報名。" };
  const actual = Number(actualRefund);
  if (!(actual >= 0)) return { success: false, message: "請輸入有效的實退金額" };
  if (actual < Number(r.calcRefund || 0)) return { success: false, message: "實退金額不得低於政策應退 NT$" + r.calcRefund + "（可更優待、不可更低）" };
  await rRef.update({ status: "refunded", actualRefund: actual, refundMethod: String(refundMethod || "").slice(0, 40), refundProof: String(refundProof || "").slice(0, 300), operator: request.authUser.username, refundedAt: fmtNow() });
  const tDoc = await db.collection("teams").doc(r.teamId).get();
  if (tDoc.exists && tDoc.data().status !== "已取消") {
    await tDoc.ref.update({ status: "已取消", refundStatus: "refunded", refundedAt: fmtNow() });
    await db.collection("competitions").doc(r.compId).update({ teamCount: FieldValue.increment(-1) });
  }
  await auditLog(request.authUser.username, "註記已退款", r.teamId, "實退NT$" + actual);
  try {
    const compDoc = await db.collection("competitions").doc(r.compId).get();
    const compName = compDoc.exists ? ((compDoc.data().config && compDoc.data().config.competitionName) || compDoc.data().name || "活動") : "活動";
    const contact = await organiserContact(compDoc.exists ? compDoc.data().creator : "");
    const html = emailWrap("退費已完成", `
      <p>您在活動「<b>${escMail(compName)}</b>」的退費（隊伍 ${escMail(r.teamNameCN || r.teamId)}）已由主辦方完成處理。</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:12px 0;font-size:14px;line-height:1.8">
        <b>實際退款金額：</b>NT$${actual}${refundMethod ? `<br><b>退款方式：</b>${escMail(refundMethod)}` : ""}</div>
      <p>您的報名資格已取消、名額已釋出。感謝您的參與，期待下次再見！</p>`, contactFooter(contact));
    await queueMail(await refundTeamEmails(r.teamId), "[RegMaster] 退費已完成 — " + compName, html);
  } catch (e) {}
  return { success: true };
});

// 帳務重構 S4：PayUNI 退刷 + 刪除報名 + 釋名額 + 保留款入 deposit。擁有者/管理者於明細執行。
// 需求 3/4：已匯出(paid_out)禁退刷；退刷成功才刪報名；部分退保留款依方案費率可結算。
exports.payuniRefundAndDelete = compAuthCallable("manage", async (data, request) => {
  const compId = data.compId, reqId = data.reqId;
  const creator = await _resolveCreator(request, compId);
  if (request.authUser.role === "system") return { success: false, message: "系統管理員為檢視模式，無法代主辦方退刷" };
  const rRef = db.collection("refundRequests").doc(reqId);
  const rDoc = await rRef.get();
  if (!rDoc.exists) return { success: false, message: "找不到退費申請" };
  const r = rDoc.data();
  if (r.compId !== compId) return { success: false, message: "申請不屬此活動" };
  if (r.channel !== "payuni_refund") return { success: false, message: "此申請非 PayUNI 線上退刷，請循銀行退款流程" };
  if (r.status === "refunded") return { success: false, message: "此申請已退款完成" };
  if (!["approved", "requested"].includes(r.status)) return { success: false, message: "此申請狀態無法退刷" };
  const orderId = r.orderId; if (!orderId) return { success: false, message: "缺少對應付款訂單" };
  const oRef = db.collection("regPayments").doc(orderId);
  const oDoc = await oRef.get();
  if (!oDoc.exists) return { success: false, message: "找不到付款訂單" };
  const order = oDoc.data();
  if (order.payoutState === "paid_out") return { success: false, code: "ALREADY_PAID_OUT", message: "款項已匯出至主辦方，平台無法退刷；請自行向報名者索取銀行帳戶辦理退款。" };
  if (order.status !== "paid") return { success: false, message: "訂單未完成付款" };
  const refundAmt = Math.round(Number(r.calcRefund) || 0);
  if (refundAmt <= 0) return { success: false, message: "退款金額為 0" };
  const amt = parseInt(order.amount, 10) || 0;
  const retained = Math.max(0, amt - refundAmt);
  const compDoc = await db.collection("competitions").doc(compId).get();
  const compName = (compDoc.exists && ((compDoc.data().config || {}).competitionName || compDoc.data().name)) || compId;
  const contact = await organiserContact(creator);

  // (b) 呼叫 PayUNI 退刷（冪等：已退過則跳過）
  let refundNo = order.payuniRefundNo || "";
  if (order.refundState !== "refunded") {
    const res = await payuniRefund(order, refundAmt);
    if (!res.ok) return { success: false, message: "PayUNI 退刷失敗：" + res.message, code: res.code || "" };
    refundNo = res.tradeNo || "";
    const { feePct } = await _ownerFeePct(creator);
    await oRef.update({ refundState: "refunded", refundedAmount: refundAmt, retainedAmount: retained, payuniRefundNo: refundNo, refundedAt: fmtNow() });
    if (retained > 0) {
      const depRef = db.collection("deposits").doc();
      await depRef.set({ depId: depRef.id, creator, compId, compName, sourceOrderId: orderId, sourceTeamName: order.teamNameCN || r.teamNameCN || "", retainedAmount: retained, feePct, status: "available", payoutReqId: "", createdAt: fmtNow(), note: "PayUNI 部分退款保留款" });
    }
  }
  // (c) 標記退費申請、刪除報名、釋名額（先取 email 再刪）
  await rRef.update({ status: "refunded", channel: "payuni_refund", actualRefund: refundAmt, refundedAmount: refundAmt, retainedAmount: retained, payuniRefundNo: refundNo, refundMethod: "PayUNI 退刷", operator: request.authUser.username, refundedAt: fmtNow() });
  const teamId = r.teamId;
  let emails = [];
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (tDoc.exists) {
    const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
    emails = [...new Set(memSnap.docs.map(d => d.data().email).filter(e => e))];
    const batch = db.batch();
    memSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection("teams").doc(teamId));
    await batch.commit();
    if (tDoc.data().status !== "已取消") await db.collection("competitions").doc(compId).update({ teamCount: FieldValue.increment(-1) });
  }
  await auditLog(request.authUser.username, "PayUNI退刷並刪除報名", teamId, "退NT$" + refundAmt + (retained > 0 ? (" 保留NT$" + retained) : "") + " " + refundNo);
  try {
    const html = emailWrap("退費已完成（並取消報名）", `
      <p>您在活動「<b>${escMail(compName)}</b>」的退費（隊伍 ${escMail(r.teamNameCN || teamId)}）已由平台透過原信用卡完成退刷。</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:12px 0;font-size:14px;line-height:1.8">
        <b>退款金額：</b>NT$${refundAmt}（退刷至原付款卡，依發卡行作業約數個工作日入帳）</div>
      <p>依退費規定，您的報名已取消、名額已釋出。感謝您的參與。</p>`, contactFooter(contact));
    if (emails.length) await queueMail(emails, "[RegMaster] 退費已完成 — " + compName, html);
  } catch (e) {}
  return { success: true, refundedAmount: refundAmt, retainedAmount: retained, payuniRefundNo: refundNo };
});

// 帳務重構 Q2：主辦方「主動退費」（不需報名者申請）。用於報名費為壓金、賽後主動退還等情境。
// 取得退費前置資訊（原付款金額、可用通道）供前端彈窗顯示。
exports.getOwnerRefundContext = compAuthCallable("manage", async (data, request) => {
  const compId = data.compId, teamId = data.teamId;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists || tDoc.data().compId !== compId) return { success: false, message: "找不到報名資料" };
  const team = tDoc.data();
  let paidAmount = 0, channel = "manual", payoutState = "", alreadyRefunded = false, hasPayuni = false;
  if (team.regPaymentId) {
    const rp = await db.collection("regPayments").doc(team.regPaymentId).get();
    if (rp.exists) {
      const p = rp.data();
      paidAmount = parseInt(p.amount, 10) || 0;
      payoutState = p.payoutState || "";
      alreadyRefunded = p.refundState === "refunded";
      if (p.status === "paid" && p.payuniTradeNo) { hasPayuni = true; channel = (p.payoutState === "paid_out") ? "manual" : "payuni"; }
    }
  }
  if (!paidAmount) {
    const comp = (await db.collection("competitions").doc(compId).get()).data() || {};
    paidAmount = (computeRefund(comp, team).paidAmount) || 0;
  }
  return { success: true, paidAmount, channel, payoutState, hasPayuni, alreadyRefunded, paid: (team.paymentStatus || "").includes("已確認"), teamNameCN: team.teamNameCN || "", status: team.status || "" };
});

// 執行主動退費：PayUNI 已付且未匯出 → 退刷；否則記錄主辦方自行退款。保留報名（標記已退費）。
exports.ownerRefund = compAuthCallable("manage", async (data, request) => {
  const compId = data.compId, teamId = data.teamId;
  const creator = await _resolveCreator(request, compId);
  if (request.authUser.role === "system") return { success: false, message: "系統管理員為檢視模式，無法代主辦方退費" };
  const refundAmt = Math.round(Number(data.refundAmount));
  const note = String(data.note || "").slice(0, 300);
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists || tDoc.data().compId !== compId) return { success: false, message: "找不到報名資料" };
  const team = tDoc.data();
  if (team.status === "已取消") return { success: false, message: "此報名已取消" };
  if (!(refundAmt > 0)) return { success: false, message: "請輸入有效的退款金額" };
  let paidAmount = 0, order = null, orderRef = null;
  if (team.regPaymentId) {
    orderRef = db.collection("regPayments").doc(team.regPaymentId);
    const rp = await orderRef.get();
    if (rp.exists) { order = rp.data(); paidAmount = parseInt(order.amount, 10) || 0; }
  }
  if (!paidAmount) { const comp = (await db.collection("competitions").doc(compId).get()).data() || {}; paidAmount = (computeRefund(comp, team).paidAmount) || 0; }
  if (refundAmt > paidAmount) return { success: false, message: "退款金額不可超過原付款金額 NT$" + paidAmount };
  const compDoc = await db.collection("competitions").doc(compId).get();
  const compName = (compDoc.exists && ((compDoc.data().config || {}).competitionName || compDoc.data().name)) || compId;
  const contact = await organiserContact(creator);
  const retained = Math.max(0, paidAmount - refundAmt);
  let channelUsed = "manual", payuniRefundNo = "";

  if (order && order.status === "paid" && order.payuniTradeNo && order.payoutState !== "paid_out" && order.refundState !== "refunded") {
    const res = await payuniRefund(order, refundAmt);
    if (!res.ok) return { success: false, message: "PayUNI 退刷失敗：" + res.message, code: res.code || "" };
    payuniRefundNo = res.tradeNo || ""; channelUsed = "payuni";
    const { feePct } = await _ownerFeePct(creator);
    await orderRef.update({ refundState: "refunded", refundedAmount: refundAmt, retainedAmount: retained, payuniRefundNo, refundedAt: fmtNow() });
    if (retained > 0) {
      const depRef = db.collection("deposits").doc();
      await depRef.set({ depId: depRef.id, creator, compId, compName, sourceOrderId: team.regPaymentId, sourceTeamName: team.teamNameCN || "", retainedAmount: retained, feePct, status: "available", payoutReqId: "", createdAt: fmtNow(), note: "主辦方部分退費保留款" });
    }
  } else if (order && order.payoutState === "paid_out") {
    channelUsed = "manual_paid_out";
  }
  // 保留報名，標記已退費（壓金/賽後退還情境：報名者仍參賽，不刪報名、不釋名額）
  await db.collection("teams").doc(teamId).update({
    paymentStatus: "已退費 NT$" + refundAmt + (retained > 0 ? "（保留NT$" + retained + "）" : "") + " " + fmtNow(),
    ownerRefundedAmount: refundAmt, ownerRefundedAt: fmtNow(), ownerRefundChannel: channelUsed
  });
  const reqId = generateId("RF");
  await db.collection("refundRequests").doc(reqId).set({
    reqId, compId, creator, teamId, teamNameCN: team.teamNameCN || "", requesterName: "(主辦方主動退費)",
    refundAccount: "", reason: note || "主辦方主動退費", status: "refunded",
    channel: channelUsed === "payuni" ? "payuni_refund" : "owner_bank", paymentMethod: team.paymentMethod || "",
    policyPct: 0, paidAmount, calcRefund: refundAmt, actualRefund: refundAmt, refundedAmount: refundAmt, retainedAmount: retained,
    payuniRefundNo, refundMethod: channelUsed === "payuni" ? "PayUNI 退刷" : "主辦方自行退款", operator: request.authUser.username,
    initiatedBy: "owner", createdAt: fmtNow(), refundedAt: fmtNow(), decidedAt: fmtNow()
  });
  await auditLog(request.authUser.username, "主辦方主動退費", teamId, "退NT$" + refundAmt + " via " + channelUsed);
  try {
    const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
    const emails = [...new Set(memSnap.docs.map(d => d.data().email).filter(e => e))];
    const extra = channelUsed === "payuni" ? "退款將退刷至原付款卡，依發卡行作業數個工作日入帳。" : "主辦方將以原付款管道或約定方式退款給您。";
    const html = emailWrap("您已收到退費", `<p>活動「<b>${escMail(compName)}</b>」主辦方已為您的報名（${escMail(team.teamNameCN || teamId)}）辦理退費。</p><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:12px 0;font-size:14px;line-height:1.8"><b>退款金額：</b>NT$${refundAmt}</div><p>${extra}</p>`, contactFooter(contact));
    if (emails.length) await queueMail(emails, "[RegMaster] 退費通知 — " + compName, html);
  } catch (e) {}
  return { success: true, refundedAmount: refundAmt, retainedAmount: retained, channel: channelUsed, payuniRefundNo };
});

exports.updateRegistration = callable(async (data) => {
  const { compId, teamId, pwd, fd } = data;
  const doc = await db.collection("teams").doc(teamId).get();
  if (!doc.exists || doc.data().compId !== compId || !verifyTeamPwd(doc.data(), pwd)) return { success: false, message: "驗證失敗" };
  
  await doc.ref.update({
    group: fd.group || "", teamNameCN: fd.teamNameCN || "", teamNameEN: fd.teamNameEN || "",
    paymentMethod: fd.paymentMethod || "", remitterName: fd.remitterName || "",
    remitterBank: fd.remitterBank || "", remitterAccount: fd.remitterAccount || "",
    creditCardOrderNo: fd.creditCardOrderNo || "",
    selectedSession: fd.selectedSession || 0,
    selectedSessions: fd.selectedSessions || [fd.selectedSession || 0],
    customAnswers: fd.customAnswers || {}
  });
  
  // NEW-01 FIX: Use single batch for atomic member delete + recreate
  const oldMembers = await db.collection("members").where("teamId", "==", teamId).get();
  const members = [];
  (fd.students || []).forEach((s, i) => members.push({ teamId, compId, role: "學生", seq: i + 1, ...s }));
  (fd.teachers || []).forEach((t, i) => members.push({ teamId, compId, role: "教練", seq: i + 1, ...t }));
  const atomicBatch = db.batch();
  oldMembers.docs.forEach(d => atomicBatch.delete(d.ref));
  members.forEach(m => atomicBatch.set(db.collection("members").doc(), m));
  await atomicBatch.commit();
  return { success: true, message: "更新成功" };
});

exports.lookupRegistration = callable(async (data) => {
  const { compId, keyword } = data;
  const kw = (keyword || "").trim().toUpperCase();
  if (!kw) return { found: false };
  /* Lookup by registration ID (teamId) only */
  const doc = await db.collection("teams").doc(kw).get();
  if (doc.exists && doc.data().compId === compId) {
    const t = doc.data();
    let displayStatus = t.status;
    if ((t.status === "正取" || (t.status || "").startsWith("備取")) && !(t.paymentStatus || "").includes("已確認"))
      displayStatus = t.status + " (等待確認中)";
    return { found: true, teamId: t.teamId, group: t.group, teamNameCN: t.teamNameCN, teamNameEN: t.teamNameEN, status: displayStatus, paymentStatus: t.paymentStatus || "" };
  }
  return { found: false };
});

exports.checkDuplicates = callable(async (data, request) => {
  const { compId, teamNameCN, idNumbers, passports, editTeamId } = data;
  // P2: throttle this duplicate-existence oracle, but FAIL-OPEN on limit — return "no duplicates"
  // so legitimate registrants behind a shared/NAT IP (e.g. a whole school registering from one
  // public IP) are NEVER blocked. This check is only an advisory UX guard; exceeding the limit
  // just stops feeding a mass id-number/team-name enumerator (no information is returned).
  const _rl = await checkRateLimit("chkdup_ip_" + clientIp(request), 80, 600000);  // 80 / 10 min / IP
  if (!_rl.ok) return { success: true, errors: [] };
  const errors = [];
  if (teamNameCN) {
    const snap = await db.collection("teams").where("compId", "==", compId).get();
    for (const d of snap.docs) {
      const t = d.data();
      if (editTeamId && t.teamId === editTeamId) continue;
      if (t.status === "已取消") continue;
      if ((t.teamNameCN || "").trim() === teamNameCN.trim()) {
        errors.push("中文隊名「" + teamNameCN + "」已被使用");
        break;
      }
    }
  }
  if ((idNumbers && idNumbers.length) || (passports && passports.length)) {
    // Parallelize: teams and members queries are independent
    const [tSnap, mSnap] = await Promise.all([
      db.collection("teams").where("compId", "==", compId).get(),
      db.collection("members").where("compId", "==", compId).get()
    ]);
    const validTeams = new Set();
    tSnap.docs.forEach(d => {
      const t = d.data();
      if (editTeamId && t.teamId === editTeamId) return;
      if (t.status === "已取消") return;
      validTeams.add(t.teamId);
    });
    mSnap.docs.forEach(d => {
      const m = d.data();
      if (!validTeams.has(m.teamId) || m.role !== "學生") return;
      const existId = (m.idNumber || "").trim().toUpperCase();
      const existPP = (m.passport || "").trim().toUpperCase();
      if (existId && idNumbers) {
        idNumbers.forEach(id => {
          if (id && id.toUpperCase() === existId) errors.push("身分證「" + id + "」已被其他隊伍使用");
        });
      }
      if (existPP && passports) {
        passports.forEach(pp => {
          if (pp && pp.toUpperCase() === existPP) errors.push("護照「" + pp + "」已被其他隊伍使用");
        });
      }
    });
  }
  return { success: errors.length === 0, errors };
});

// ===== Dashboard =====
exports.getDashboardStats = compAuthCallable("view", async (data) => {
  const compId = data.compId;
  const [compDoc, tSnap] = await Promise.all([
    db.collection("competitions").doc(compId).get(),
    db.collection("teams").where("compId", "==", compId).get()
  ]);
  const cfg = compDoc.exists ? (compDoc.data().config || {}) : {};
  let total = 0, accepted = 0, waitlist = 0, payWait = 0;
  const dailyMap = {}, groupMap = {}, sessionMap = {};
  const sessionAccMap = {}, sessionWLMap = {};
  /* Per-group detailed: { groupName: { total, accepted, waitlist, payWait } } */
  const groupDetail = {};
  tSnap.docs.forEach(d => {
    const t = d.data();
    if (t.status === "已取消") return;
    total++;
    const isAccepted = t.status === "正取";
    const isWaitlist = (t.status || "").startsWith("備取");
    const isPayWait = !(t.paymentStatus || "").includes("已確認");
    if (isAccepted) accepted++;
    if (isWaitlist) waitlist++;
    if (isPayWait) payWait++;
    const day = toDayKey(t.registrationTime);
    if (day) dailyMap[day] = (dailyMap[day] || 0) + 1;
    const grp = t.group || "未分組";
    groupMap[grp] = (groupMap[grp] || 0) + 1;
    if (!groupDetail[grp]) groupDetail[grp] = { total: 0, accepted: 0, waitlist: 0, payWait: 0 };
    groupDetail[grp].total++;
    if (isAccepted) groupDetail[grp].accepted++;
    if (isWaitlist) groupDetail[grp].waitlist++;
    if (isPayWait) groupDetail[grp].payWait++;
    /* Session count + per-session accepted/waitlist */
    (t.selectedSessions || [t.selectedSession || 0]).forEach(idx => {
      sessionMap[idx] = (sessionMap[idx] || 0) + 1;
      if (isAccepted) sessionAccMap[idx] = (sessionAccMap[idx] || 0) + 1;
      if (isWaitlist) sessionWLMap[idx] = (sessionWLMap[idx] || 0) + 1;
    });
    /* Per-group daily for trend comparison */
    if (day) {
      if (!groupDetail[grp].daily) groupDetail[grp].daily = {};
      groupDetail[grp].daily[day] = (groupDetail[grp].daily[day] || 0) + 1;
    }
  });
  const dailyTrend = Object.keys(dailyMap).sort().map(d => ({ date: d, count: dailyMap[d] }));
  const groupStats = Object.keys(groupMap).map(g => ({ name: g, count: groupMap[g] }));
  const sessionStats = Object.keys(sessionMap).map(k => ({ idx: parseInt(k), count: sessionMap[k], accepted: sessionAccMap[k] || 0, waitlist: sessionWLMap[k] || 0 }));
  /* Gender stats from members */
  const genderMap = {};
  const hasGender = (cfg.studentFields || []).includes("gender");
  if (hasGender) {
    const mSnap = await db.collection("members").where("compId", "==", compId).get();
    mSnap.docs.forEach(d => {
      const m = d.data();
      if (m.role === "學生" && m.gender) genderMap[m.gender] = (genderMap[m.gender] || 0) + 1;
    });
  }
  const genderStats = Object.keys(genderMap).map(g => ({ name: g, count: genderMap[g] }));
  return { totalTeams: total, accepted, waitlist, payWait, dailyTrend, groupStats, groupDetail, sessionStats, genderStats,
    hasWaitlist: cfg.allowWaitlist !== false, hasPayment: (cfg.paymentMethods || []).length > 0, hasGender };
});

exports.getAllTeams = compAuthCallable("view", async (data, request) => {
  // Fairness (④.1): a judge with judgeSeeRegistrantInfo OFF only gets the minimal fields
  // needed to identify a team for scoring — no member names / PII / custom answers.
  if (!(await judgeInfoAllowed(request, data.compId))) {
    const tSnap = await db.collection("teams").where("compId", "==", data.compId).get();
    return tSnap.docs.map(d => { const t = d.data(); return { teamId: t.teamId, teamNameCN: t.teamNameCN || "", group: t.group || "", status: t.status || "" }; });
  }
  const [snap, mSnap, paySnap] = await Promise.all([
    db.collection("teams").where("compId", "==", data.compId).get(),
    db.collection("members").where("compId", "==", data.compId).get(),
    db.collection("regPayments").where("compId", "==", data.compId).where("status", "==", "paid").get()
  ]);
  // Map teamId → actual paid amount (reflects group/code discounts). Online (PayUNI) payments only;
  // bank transfers have no recorded amount, so the revenue chart falls back to the flat fee for those.
  const paidAmountByTeam = {};
  paySnap.docs.forEach(d => { const p = d.data(); if (p.teamId) paidAmountByTeam[p.teamId] = Number(p.amount) || 0; });
  const membersByTeam = {};
  mSnap.docs.forEach(d => {
    const m = d.data();
    if (!membersByTeam[m.teamId]) membersByTeam[m.teamId] = { studentNames: [], teacherNames: [] };
    if (m.role === "學生") membersByTeam[m.teamId].studentNames.push(m.chineseName || m.englishName || "");
    else membersByTeam[m.teamId].teacherNames.push(m.chineseName || m.englishName || "");
  });
  return snap.docs.map(d => {
    const t = d.data();
    const mInfo = membersByTeam[t.teamId] || { studentNames: [], teacherNames: [] };
    return {
      teamId: t.teamId, registrationTime: t.registrationTime || "", group: t.group,
      teamNameCN: t.teamNameCN, teamNameEN: t.teamNameEN, status: t.status,
      paymentStatus: t.paymentStatus, paymentMethod: t.paymentMethod,
      remitterName: t.remitterName, remitterBank: t.remitterBank, remitterAccount: t.remitterAccount,
      creditCardOrderNo: t.creditCardOrderNo || "", fileUrl: t.fileUrl || "",
      checkedIn: !!t.checkedIn, checkedInAt: t.checkedInAt || "",
      selectedSession: t.selectedSession || 0,
      selectedSessions: t.selectedSessions || [t.selectedSession || 0],
      paidAmount: (paidAmountByTeam[t.teamId] !== undefined ? paidAmountByTeam[t.teamId] : null),  // actual收款(線上)；null=未知(走估算)
      studentNames: mInfo.studentNames,
      teacherNames: mInfo.teacherNames
    };
  });
});

// 報名管理: stats aggregation for the dashboard tab. One callable, one round-trip.
// Returns enough data for ~12 charts; frontend hides individual charts based on which
// fields the organiser actually configured / collected.
exports.getRegistrationStats = compAuthCallable("view", async (data) => {
  const compId = data.compId;
  const [tSnap, mSnap] = await Promise.all([
    db.collection("teams").where("compId", "==", compId).get(),
    db.collection("members").where("compId", "==", compId).get()
  ]);
  const groupCounts = {};
  const statusCounts = {};
  const paymentCounts = { paid: 0, pending: 0 };
  const paymentMethodCounts = {};                       // (h) payment method pie
  const dailyCounts = {};
  const dailyPaidCounts = {};                           // (d)(g) revenue charts use paid teams only
  const sessionCounts = {};
  const byHourOfWeek = {};                              // (e) "<dow>_<hour>" → count (dow 0=Sun)
  let teamTotal = 0;
  const _parseRegTime = rt => {
    // Accept "YYYY-MM-DD HH:MM:SS" or ISO "YYYY-MM-DDTHH:MM[:SS][Z]"
    if (!rt) return null;
    const s = String(rt).replace('T', ' ');
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[\s]+(\d{2}):(\d{2})/);
    if (!m) return null;
    // Treat as a naive local time (organisers and registrants share TW timezone in this product)
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0);
  };
  tSnap.docs.forEach(d => {
    const t = d.data();
    teamTotal++;
    const g = t.group || "（未分組）";
    groupCounts[g] = (groupCounts[g] || 0) + 1;
    const st = t.status || "正取";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    const paid = String(t.paymentStatus || "").includes("已確認") || String(t.paymentStatus || "").toLowerCase().includes("paid");
    if (paid) paymentCounts.paid++; else paymentCounts.pending++;
    const pm = (t.paymentMethod || "").trim();
    if (pm) paymentMethodCounts[pm] = (paymentMethodCounts[pm] || 0) + 1;
    const rt = String(t.registrationTime || "");
    if (rt.length >= 10) {
      const day = rt.slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      if (paid) dailyPaidCounts[day] = (dailyPaidCounts[day] || 0) + 1;
    }
    const dt = _parseRegTime(rt);
    if (dt) {
      const key = dt.getDay() + "_" + dt.getHours();   // 0_14 ... 6_22
      byHourOfWeek[key] = (byHourOfWeek[key] || 0) + 1;
    }
    if (Array.isArray(t.selectedSessions)) {
      t.selectedSessions.forEach(idx => {
        const key = String(idx);
        sessionCounts[key] = (sessionCounts[key] || 0) + 1;
      });
    } else if (t.selectedSession !== undefined) {
      const key = String(t.selectedSession);
      sessionCounts[key] = (sessionCounts[key] || 0) + 1;
    }
  });
  const genderCounts = {};
  const ageBuckets = { "<13": 0, "13-15": 0, "16-18": 0, "19-22": 0, "23-30": 0, "31-50": 0, "51+": 0 };
  let memberTotal = 0, studentTotal = 0, teacherTotal = 0, ageKnown = 0;
  const today = new Date();
  mSnap.docs.forEach(d => {
    const m = d.data();
    memberTotal++;
    if (m.role === "學生") studentTotal++;
    else teacherTotal++;
    if (m.gender) genderCounts[m.gender] = (genderCounts[m.gender] || 0) + 1;
    // (f) age histogram — only count when birthday parses as a valid date
    if (m.birthday) {
      const bd = String(m.birthday).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (bd) {
        const by = +bd[1], bm = +bd[2] - 1, bdy = +bd[3];
        let age = today.getFullYear() - by;
        const mDiff = today.getMonth() - bm;
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < bdy)) age--;
        if (age >= 0 && age < 120) {
          ageKnown++;
          if (age < 13) ageBuckets["<13"]++;
          else if (age <= 15) ageBuckets["13-15"]++;
          else if (age <= 18) ageBuckets["16-18"]++;
          else if (age <= 22) ageBuckets["19-22"]++;
          else if (age <= 30) ageBuckets["23-30"]++;
          else if (age <= 50) ageBuckets["31-50"]++;
          else ageBuckets["51+"]++;
        }
      }
    }
  });
  return {
    teamTotal, memberTotal, studentTotal, teacherTotal, ageKnown,
    groupCounts, genderCounts, statusCounts, paymentCounts, paymentMethodCounts,
    dailyCounts, dailyPaidCounts,                      // { 'YYYY-MM-DD': N }
    sessionCounts,                                     // { '<index>': N }
    byHourOfWeek,                                      // (e) heatmap data
    ageBuckets                                         // (f) histogram
  };
});

// 報名管理: send a custom email to all student emails on a team. Uses the Trigger
// Email extension (`mail` collection). Subject + plain-text body; HTML is wrapped
// by emailWrap so it carries the RegMaster header.
exports.sendTeamEmail = compAuthCallable(async (data, request) => {
  const { compId, teamId, subject, body } = data;
  if (!teamId || !subject || !body) return { success: false, message: "缺少欄位" };
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists || teamDoc.data().compId !== compId) return { success: false, message: "隊伍不存在或不屬於此活動" };
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  const tos = [];
  memSnap.docs.forEach(d => {
    const m = d.data();
    if (m.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) tos.push(m.email);
  });
  if (!tos.length) return { success: false, message: "此隊伍沒有可用的 Email 地址" };
  // Plain-text body → light HTML (escape + line breaks); emailWrap adds the shell
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = emailWrap(subject, '<p style="font:400 14.5px/1.7 system-ui,sans-serif;color:#222;margin:0 0 12px">' + esc(body).replace(/\n/g, '<br>') + '</p>');
  await db.collection("mail").add({
    to: tos,
    message: { subject: String(subject).slice(0, 200), html }
  });
  await auditLog(request.authUser.username, "寄送主辦方信件", teamId, String(subject).slice(0, 60));
  return { success: true, recipientCount: tos.length };
});

exports.getTeamDetail = compAuthCallable("view", async (data, request) => {
  const doc = await db.collection("teams").doc(data.teamId).get();
  if (!doc.exists) return null;
  const t = doc.data();
  // Fairness (④.1): judges without info access cannot open full registrant detail.
  if (request.memberRoleName === "judge" && !(await judgeInfoAllowed(request, t.compId))) {
    return { teamId: t.teamId, teamNameCN: t.teamNameCN || "", group: t.group || "", status: t.status || "", _restricted: true };
  }
  const { password: _, ...safeT } = t;
  const memSnap = await db.collection("members").where("teamId", "==", data.teamId).get();
  const students = [], teachers = [];
  memSnap.docs.forEach(d => {
    const { password: _mp, ...mFields } = d.data();
    // 帳務/編輯：回傳完整成員欄位 + 文件 id（供主辦方編輯與稽核以 id 對應更新）。
    const member = Object.assign({}, mFields, { id: d.id, customAnswers: mFields.customAnswers || {} });
    if (mFields.role === "學生") students.push(member);
    else teachers.push(member);
  });
  return { ...safeT, students, teachers };
});

// 報名詳情可編輯（擁有者/管理者）＋逐項稽核。允許編輯的欄位與其中文標籤（用於操作紀錄）。
const TEAM_EDIT_FIELDS = { teamNameCN: "中文隊名", teamNameEN: "英文隊名", group: "組別", note: "備註" };
const MEMBER_EDIT_LABELS = {
  salutation: "尊稱", chineseName: "中文姓名", englishName: "英文姓名", englishSurname: "英文姓", englishGivenName: "英文名",
  gender: "性別", birthday: "生日", idNumber: "身分證", passport: "護照號碼", nationality: "國籍",
  school: "學校", eduLevel: "教育階段", department: "系所", grade: "年級", classroom: "班級", studentId: "學號",
  jobTitle: "職稱", organization: "服務單位", email: "Email", phone: "電話", city: "居住縣市", postalCode: "郵遞區號",
  address: "地址", lineId: "LINE ID", emergencyName: "緊急聯絡人", emergencyPhone: "緊急聯絡電話", emergencyRelation: "緊急聯絡關係",
  guardianName: "監護人姓名", guardianPhone: "監護人電話", guardianConsent: "家長同意", dietary: "飲食習慣",
  dietaryRestriction: "飲食限制/過敏", accessibility: "特殊需求/無障礙", bloodType: "血型", tshirt: "T-shirt尺寸",
  transportation: "交通方式", accommodation: "住宿需求", referralSource: "如何得知本活動", website: "網站",
  consent: "條款同意", invoiceType: "發票類型", invoiceTitle: "發票抬頭", taxId: "統一編號"
};
// 擁有者/管理者修改報名詳情：逐欄位 diff，更新 teams/members，並對每個變更寫一筆操作紀錄。
exports.updateTeamDetailOwner = compAuthCallable("manage", async (data, request) => {
  const compId = data.compId, teamId = data.teamId, actor = request.authUser.username;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists || tDoc.data().compId !== compId) return { success: false, message: "找不到報名資料" };
  const team = tDoc.data();
  const teamName = team.teamNameCN || teamId;
  const logs = [];
  const _s = v => String(v == null ? "" : v);
  // team-level fields
  const teamUpd = {}, teamIn = data.team || {};
  for (const k of Object.keys(TEAM_EDIT_FIELDS)) {
    if (!(k in teamIn)) continue;
    const nv = _s(teamIn[k]).slice(0, 500), ov = _s(team[k]);
    if (nv !== ov) { teamUpd[k] = nv; logs.push({ who: "", label: TEAM_EDIT_FIELDS[k], old: ov, neu: nv }); }
  }
  // team-level custom answers
  const teamCustomIn = data.teamCustom || {};
  if (teamCustomIn && Object.keys(teamCustomIn).length) {
    const ca = Object.assign({}, team.customAnswers || {});
    for (const qk of Object.keys(teamCustomIn)) {
      const nv = _s(teamCustomIn[qk]).slice(0, 1000), ov = _s(ca[qk]);
      if (nv !== ov) { ca[qk] = nv; logs.push({ who: "", label: qk, old: ov, neu: nv }); }
    }
    teamUpd.customAnswers = ca;
  }
  if (Object.keys(teamUpd).length) await db.collection("teams").doc(teamId).update(teamUpd);
  // members (by doc id)
  const membersIn = Array.isArray(data.members) ? data.members : [];
  for (const min of membersIn) {
    if (!min || !min.id) continue;
    const mRef = db.collection("members").doc(min.id);
    const mDoc = await mRef.get();
    if (!mDoc.exists || mDoc.data().teamId !== teamId) continue;
    const m = mDoc.data();
    const who = String(min.label || (m.role === "學生" ? "學員" : "指導者")).slice(0, 20);
    const upd = {}, fin = min.fields || {};
    for (const k of Object.keys(fin)) {
      if (!MEMBER_EDIT_LABELS[k]) continue;
      const nv = _s(fin[k]).slice(0, 500), ov = _s(m[k]);
      if (nv !== ov) { upd[k] = nv; logs.push({ who, label: MEMBER_EDIT_LABELS[k], old: ov, neu: nv }); }
    }
    const mc = min.customAnswers || {};
    if (mc && Object.keys(mc).length) {
      const ca = Object.assign({}, m.customAnswers || {});
      for (const qk of Object.keys(mc)) {
        const nv = _s(mc[qk]).slice(0, 1000), ov = _s(ca[qk]);
        if (nv !== ov) { ca[qk] = nv; logs.push({ who, label: qk, old: ov, neu: nv }); }
      }
      upd.customAnswers = ca;
    }
    if (Object.keys(upd).length) await mRef.update(upd);
  }
  // one audit entry per changed field — 隊伍編號/名稱 + 項目「由 OLD 改為 NEW」
  for (const lg of logs) {
    await auditLog(actor, "修改報名", teamId,
      teamName + "｜" + (lg.who ? lg.who + " " : "") + lg.label + "：由『" + (lg.old || "（空白）") + "』改為『" + (lg.neu || "（空白）") + "』");
  }
  return { success: true, changes: logs.length };
});

exports.confirmPayment = compAuthCallable(async (data, request) => {
  const { teamId } = data;
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) return { success: false, message: "隊伍不存在" };
  const compId = teamDoc.data().compId;
  const compDoc = compId ? await db.collection("competitions").doc(compId).get() : null;
  const cfg = (compDoc && compDoc.exists && compDoc.data().config) || {};
  // UX-004: online-payment (PayUni) events are reconciled ONLY via the gateway callback —
  // manual confirmation is disabled. Bank-transfer events can still be confirmed by hand.
  if (cfg.payuniEnabled === true) {
    return { success: false, message: "本活動為線上付款，款項由 PayUni 自動對帳，無法手動確認。" };
  }
  await db.collection("teams").doc(teamId).update({ paymentStatus: "已確認 " + fmtNow() });
  await auditLog(request.authUser.username, "確認付款", teamId, "");
  return { success: true };
});

exports.deleteTeam = compAuthCallable(async (data, request) => {
  const teamId = data.teamId;
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) return { success: false, message: "隊伍不存在" };
  const compId = teamDoc.data().compId;
  
  /* Clean up team uploaded file + chunks */
  const tfDoc = await db.collection("teamFiles").doc(teamId).get();
  if (tfDoc.exists) {
    const chunks = await db.collection("teamFiles").where("parentId", "==", teamId).get();
    const fb = db.batch();
    chunks.docs.forEach(d => fb.delete(d.ref));
    fb.delete(tfDoc.ref);
    await fb.commit();
  }
  
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  const batch = db.batch();
  memSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(db.collection("teams").doc(teamId));
  await batch.commit();
  // Only decrement teamCount if team was NOT already cancelled
  // (cancelled teams already had their count decremented by updateTeamStatus)
  const teamStatus = teamDoc.data().status || "";
  if (compId && teamStatus !== "已取消") {
    await db.collection("competitions").doc(compId).update({ teamCount: FieldValue.increment(-1) });
  }
  await auditLog(request.authUser.username, "刪除隊伍", teamId, "");
  return { success: true };
});

exports.reconcilePayments = compAuthCallable(async (data, request) => {
  const { compId, accountSuffix } = data;
  // BUG-12 FIX: Validate accountSuffix minimum length to prevent accidental mass-confirmation
  if (!accountSuffix || accountSuffix.length < 3) {
    return { success: false, message: "帳號後碼至少需輸入 3 碼以上" };
  }
  const snap = await db.collection("teams").where("compId", "==", compId).get();
  let matched = 0;
  for (const d of snap.docs) {
    const t = d.data();
    if ((t.remitterAccount || "").endsWith(accountSuffix) && !(t.paymentStatus || "").includes("已確認")) {
      await d.ref.update({ paymentStatus: "已確認 " + fmtNow() });
      matched++;
    }
  }
  if (matched > 0) await auditLog(request.authUser.username, "匯款對帳", compId, "後碼:" + accountSuffix + " 匹配:" + matched);
  return { success: matched > 0, message: "匹配 " + matched + " 筆" };
});

exports.exportTeamsCSV = compAuthCallable(async (data, request) => {
  await requireCompFeature(request, "csvExport");
  const compId = data.compId;
  const compDoc = await db.collection("competitions").doc(compId).get();
  const cfg = compDoc.exists ? (compDoc.data().config || {}) : {};
  const cqs = cfg.customQuestions || [];
  const scqs = cfg.studentCustomQuestions || [];
  const tcqs = cfg.teacherCustomQuestions || [];
  const sFields = cfg.studentFields || [];
  const tFields = cfg.teacherFields || [];
  const mCount = cfg.memberCount || 1;
  const tCount = cfg.teacherCount || 0;
  const sessions = cfg.sessions || [];
  
  let headers = ["ID", "組別", "中文隊名", "英文隊名", "狀態", "付款狀態", "付款方式", "匯款人", "銀行", "帳號後五碼", "信用卡訂單號", "檔案連結", "報名時間"];
  if (sessions.length > 1) headers.push("參加梯次");
  
  // 學員欄位 × 人數 + SCQ
  for (let i = 1; i <= mCount; i++) {
    sFields.forEach(f => { headers.push(`學員${i}_${f}`); });
    scqs.forEach(sq => { headers.push(`學員${i}_${sq.q}`); });
  }
  // 教練欄位 × 人數 + TCQ
  for (let i = 1; i <= tCount; i++) {
    tFields.forEach(f => { headers.push(`指導者${i}_${f}`); });
    tcqs.forEach(tq => { headers.push(`指導者${i}_${tq.q}`); });
  }
  // 通用自訂問題
  cqs.forEach(cq => { headers.push(cq.q); });
  
  let csv = "\ufeff" + headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
  
  const [tSnap, mSnap] = await Promise.all([
    db.collection("teams").where("compId", "==", compId).get(),
    db.collection("members").where("compId", "==", compId).get()
  ]);
  
  const membersByTeam = {};
  mSnap.docs.forEach(d => {
    const m = d.data();
    if (!membersByTeam[m.teamId]) membersByTeam[m.teamId] = { students: [], teachers: [] };
    if (m.role === "學生") membersByTeam[m.teamId].students.push(m);
    else membersByTeam[m.teamId].teachers.push(m);
  });
  Object.keys(membersByTeam).forEach(tid => {
    membersByTeam[tid].students.sort((a, b) => a.seq - b.seq);
    membersByTeam[tid].teachers.sort((a, b) => a.seq - b.seq);
  });
  
  tSnap.docs.forEach(d => {
    const t = d.data();
    let row = [
      t.teamId, t.group, t.teamNameCN, t.teamNameEN,
      t.status, t.paymentStatus, t.paymentMethod || "",
      t.remitterName || "", t.remitterBank || "", t.remitterAccount || "",
      t.creditCardOrderNo || "", t.fileUrl || "", t.registrationTime || ""
    ];
    // 梯次
    if (sessions.length > 1) {
      const ss = t.selectedSessions || [t.selectedSession || 0];
      row.push(ss.map(idx => "梯次" + (idx + 1)).join("、"));
    }
    // 學員
    const tm = membersByTeam[t.teamId] || { students: [], teachers: [] };
    for (let i = 0; i < mCount; i++) {
      const m = tm.students[i] || {};
      sFields.forEach(f => { row.push(m[f] || ""); });
      const mca = m.customAnswers || {};
      scqs.forEach(sq => { row.push(mca[sq.q] || ""); });
    }
    // 教練
    for (let i = 0; i < tCount; i++) {
      const m = tm.teachers[i] || {};
      tFields.forEach(f => { row.push(m[f] || ""); });
      const mca = m.customAnswers || {};
      tcqs.forEach(tq => { row.push(mca[tq.q] || ""); });
    }
    // 通用自訂問題
    const ans = t.customAnswers || {};
    cqs.forEach((cq, idx) => {
      let val = ans['cq_' + idx] || "";
      if (Array.isArray(val)) val = val.join("、");
      row.push(val);
    });
    
    csv += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",") + "\n";
  });
  
  return csv;
});

// ===== Email Templates =====
exports.saveEmailTemplate = compAuthCallable(async (data) => {
  const { compId, name, subject, body } = data;
  const snap = await db.collection("emailTemplates").where("compId", "==", compId).where("name", "==", name).limit(1).get();
  if (!snap.empty) {
    await snap.docs[0].ref.update({ subject, body, createdAt: fmtNow() });
    return { success: true, message: "已更新" };
  }
  await db.collection("emailTemplates").add({ compId, name, subject, body, createdAt: fmtNow() });
  return { success: true, message: "已儲存" };
});

exports.getEmailTemplates = compAuthCallable(async (data) => {
  const snap = await db.collection("emailTemplates").where("compId", "==", data.compId).get();
  return snap.docs.map(d => {
    const t = d.data();
    return { name: t.name, subject: t.subject, body: t.body, createdAt: t.createdAt || "" };
  });
});

exports.deleteEmailTemplate = compAuthCallable(async (data) => {
  const snap = await db.collection("emailTemplates").where("compId", "==", data.compId).where("name", "==", data.name).limit(1).get();
  if (snap.empty) return { success: false };
  await snap.docs[0].ref.delete();
  return { success: true };
});

// ==========================================
// 寄信功能 (單一隊伍 / 全部隊伍) - 支援變數替換
// ==========================================
exports.sendNotificationToTeam = compAuthCallable(async (data, request) => {
  const { compId, teamId, subject, body } = data;
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  
  const emails = memSnap.docs.map(d => d.data().email).filter(e => e);
  if (emails.length === 0) return { success: false, message: "該隊伍沒有填寫 Email" };

  const tDoc = await db.collection("teams").doc(teamId).get();
  const t = tDoc.exists ? tDoc.data() : {};
  const cDoc = await db.collection("competitions").doc(compId).get();
  const compName = cDoc.exists ? (cDoc.data().name || "") : "";

  // 執行變數替換
  const fSubj = subject.replace(/{{競賽名稱}}/g, compName).replace(/{{(隊伍編號|報名編號)}}/g, teamId)
    .replace(/{{組別}}/g, t.group || "").replace(/{{中文隊名}}/g, t.teamNameCN || "").replace(/{{英文隊名}}/g, t.teamNameEN || "");
  const fBody = body.replace(/{{競賽名稱}}/g, compName).replace(/{{(隊伍編號|報名編號)}}/g, teamId)
    .replace(/{{組別}}/g, t.group || "").replace(/{{中文隊名}}/g, t.teamNameCN || "").replace(/{{英文隊名}}/g, t.teamNameEN || "");

  const htmlContent = emailWrap('📨 ' + fSubj, `<div style="font-size:15px;line-height:1.8">${fBody.replace(/\n/g, '<br>')}</div>`,
    `<a href="${EMAIL_HOST}/?comp=${compId}" style="color:#0A437A;font-weight:600">🔙 返回活動頁面</a>`);

  await db.collection("mail").add({
    to: emails,
    message: { subject: fSubj, text: fBody, html: htmlContent }
  });
  
  await auditLog(request.authUser.username, "發信給隊伍", teamId, subject);
  return { success: true, message: "已加入發送佇列" };
});

exports.sendNotificationToAll = compAuthCallable(async (data, request) => {
  const { compId, subject, body } = data;
  const [tSnap, mSnap] = await Promise.all([
    db.collection("teams").where("compId", "==", compId).get(),
    db.collection("members").where("compId", "==", compId).get()
  ]);
  
  const teamEmails = {};
  mSnap.docs.forEach(d => {
    const m = d.data();
    if (m.email) {
      if (!teamEmails[m.teamId]) teamEmails[m.teamId] = new Set();
      teamEmails[m.teamId].add(m.email);
    }
  });

  const cDoc = await db.collection("competitions").doc(compId).get();
  const compName = cDoc.exists ? (cDoc.data().name || "") : "";

  let count = 0;
  const mailDocs = [];
  for (const doc of tSnap.docs) {
    const t = doc.data();
    const emails = teamEmails[t.teamId] ? Array.from(teamEmails[t.teamId]) : [];
    if (emails.length === 0) continue;

    // 針對每個隊伍執行獨立變數替換
    const fSubj = subject.replace(/{{競賽名稱}}/g, compName).replace(/{{(隊伍編號|報名編號)}}/g, t.teamId)
      .replace(/{{組別}}/g, t.group || "").replace(/{{中文隊名}}/g, t.teamNameCN || "").replace(/{{英文隊名}}/g, t.teamNameEN || "");
    const fBody = body.replace(/{{競賽名稱}}/g, compName).replace(/{{(隊伍編號|報名編號)}}/g, t.teamId)
      .replace(/{{組別}}/g, t.group || "").replace(/{{中文隊名}}/g, t.teamNameCN || "").replace(/{{英文隊名}}/g, t.teamNameEN || "");

    const htmlAll = emailWrap('📨 ' + fSubj, `<div style="font-size:15px;line-height:1.8">${fBody.replace(/\n/g, '<br>')}</div>`,
      `<a href="${EMAIL_HOST}/?comp=${compId}" style="color:#0A437A;font-weight:600">🔙 返回活動頁面</a>`);

    mailDocs.push({ to: emails, message: { subject: fSubj, text: fBody, html: htmlAll } });
    count++;
  }
  
  // Batch write mail documents (400 per batch)
  for (let i = 0; i < mailDocs.length; i += 400) {
    const batch = db.batch();
    mailDocs.slice(i, i + 400).forEach(m => batch.set(db.collection("mail").doc(), m));
    await batch.commit();
  }
  
  await auditLog(request.authUser.username, "群發通知", compId, subject);
  return { success: true, message: "群發已排程 (共 " + count + " 隊)" };
});

// ===== Scores =====
exports.saveScore = compAuthCallable("scoring", async (data, request) => {
  await requireCompFeature(request, "scoring");
  const { compId, teamId, item, score, rank, comment, user } = data;
  const snap = await db.collection("scores").where("compId", "==", compId).where("teamId", "==", teamId).where("item", "==", item).limit(1).get();
  if (!snap.empty) {
    await snap.docs[0].ref.update({ score, rank: rank || "", comment: comment || "", user, time: fmtNow() });
  } else {
    await db.collection("scores").add({ compId, teamId, item, score, rank: rank || "", comment: comment || "", user, time: fmtNow() });
  }
  return { success: true };
});

exports.getScores = compAuthCallable("scoring", async (data) => {
  const snap = await db.collection("scores").where("compId", "==", data.compId).get();
  return snap.docs.map(d => {
    const s = d.data();
    return { teamId: s.teamId, item: s.item, score: s.score, rank: s.rank, comment: s.comment, user: s.user, time: s.time };
  });
});

// ===== License System =====
// ===== Plan tiers =====
// Subscription-only model with three paid tiers above Free.
const TIER_RANK = { free: 0, starter: 1, pro: 2, team: 3 };
const VALID_TIERS = ["starter", "pro", "team"];
function tierLabel(t) { return ({ free: "FREE", starter: "STARTER", pro: "PRO", team: "TEAM" })[(t || "free")] || "FREE"; }
function tierPriceField(t) { return ({ starter: "starterPrice", pro: "proPrice", team: "teamPrice" })[t]; }

// ===== Tier-based feature gating =====
// Applies to 主辦方 (competition role). 系統管理員 (system) bypasses ALL limits.
// Numeric limits (confirmed with product): events 1/3/15/∞, capacity 60/300/1500/∞.
const TIER_LIMITS = {
  free:    { maxActiveEvents: 1,        maxCapacity: 60 },
  starter: { maxActiveEvents: 3,        maxCapacity: 300 },
  pro:     { maxActiveEvents: 15,       maxCapacity: 1500 },
  team:    { maxActiveEvents: Infinity, maxCapacity: Infinity }
};
// Feature key → minimum tier RANK required (see TIER_RANK).
const FEATURE_MIN_RANK = {
  payment:    1, // STARTER+  線上金流收款
  csvExport:  1, // STARTER+  匯出報表
  ai:         2, // PRO+      AI 助理
  multiJudge: 2, // PRO+      多評審評分
  campaigns:  2  // PRO+      公告群發
};
const FEATURE_LABEL = { payment: "線上金流收款", csvExport: "匯出報表", ai: "AI 助理", eventAi: "活動 AI 助理", scoring: "評分", multiJudge: "多評審評分", campaigns: "公告群發", checkin: "QR 報到", waitlist: "允許候補", certificate: "名牌 / 證書" };
const RANK_TIER_LABEL = { 1: "STARTER", 2: "PRO", 3: "TEAM" };
function tierLimits(tier) { return TIER_LIMITS[tier] || TIER_LIMITS.free; }

// ===== Per-plan matrix — single source of truth in config/sales.plans =====
// Convention: price = NT$/year; feePct = PayUNI 手續費 %; maxActiveEvents / maxCapacity
// use 0 = 無限 (matches the existing maxCapacityLimit Infinity?0 convention). System
// role bypasses all of this. DEFAULT_PLANS is the fallback when config/sales.plans is
// absent, and encodes the product decisions (Free 可收款 5%；報到/評分為 Starter+).
const DEFAULT_PLANS = {
  free:    { price:0,     feePct:5, maxActiveEvents:1,  maxCapacity:60,
             name:{ zh:"免費版 Free", en:"Free" }, tagline:{ zh:"適合測試或只辦小型活動", en:"For testing or small one-off events" },
             features:{ payment:true,  csvExport:false, ai:false, eventAi:false, scoring:false, multiJudge:false, campaigns:false, checkin:false, waitlist:false, certificate:false, roles:false } },
  starter: { price:4990,  feePct:3, maxActiveEvents:3,  maxCapacity:300,
             name:{ zh:"入門版 Starter", en:"Starter" }, tagline:{ zh:"適合單次活動、小型主辦方", en:"For single events and small organizers" },
             features:{ payment:true,  csvExport:true,  ai:false, eventAi:true,  scoring:true,  multiJudge:false, campaigns:false, checkin:true,  waitlist:true,  certificate:false, roles:false } },
  pro:     { price:13990, feePct:2, maxActiveEvents:15, maxCapacity:1500,
             name:{ zh:"專業版 Pro", en:"Pro" }, tagline:{ zh:"學校 / 中型機構 · 完整功能", en:"Schools & mid-size orgs · full features" },
             features:{ payment:true,  csvExport:true,  ai:true,  eventAi:true,  scoring:true,  multiJudge:true,  campaigns:true,  checkin:true,  waitlist:true,  certificate:true, roles:true } },
  team:    { price:39900, feePct:1, maxActiveEvents:0,  maxCapacity:0,
             name:{ zh:"團隊版 Team", en:"Team" }, tagline:{ zh:"大型機構 · 政府單位", en:"Large organizations & government" },
             features:{ payment:true,  csvExport:true,  ai:true,  eventAi:true,  scoring:true,  multiJudge:true,  campaigns:true,  checkin:true,  waitlist:true,  certificate:true, roles:true } }
};
const PLAN_FEATURE_KEYS = ["payment","csvExport","ai","eventAi","scoring","multiJudge","campaigns","checkin","waitlist","certificate","roles"];

// Read config/sales and produce the resolved plan matrix (deep-merged over defaults).
// Back-compat: if config/sales has no `plans` object yet, only legacy money fields
// (starterPrice/proPrice/teamPrice + payuniFeeByTier) are overlaid; limits & features
// fall back to DEFAULT_PLANS so the product decisions apply without disruption.
async function getPlans() {
  const doc = await db.collection("config").doc("sales").get();
  const cfg = doc.exists ? doc.data() : {};
  const out = JSON.parse(JSON.stringify(DEFAULT_PLANS));
  const tiers = ["free","starter","pro","team"];
  if (cfg.plans && typeof cfg.plans === "object") {
    for (const t of tiers) {
      const p = cfg.plans[t];
      if (!p || typeof p !== "object") continue;
      if (typeof p.price === "number") out[t].price = p.price;
      if (typeof p.feePct === "number") out[t].feePct = p.feePct;
      if (typeof p.maxActiveEvents === "number") out[t].maxActiveEvents = p.maxActiveEvents;
      if (typeof p.maxCapacity === "number") out[t].maxCapacity = p.maxCapacity;
      if (p.features && typeof p.features === "object") {
        for (const k of PLAN_FEATURE_KEYS) {
          if (typeof p.features[k] === "boolean") out[t].features[k] = p.features[k];
        }
      }
    }
  } else {
    // Legacy migration — carry over only the money settings the admin had configured.
    if (typeof cfg.starterPrice === "number") out.starter.price = cfg.starterPrice;
    if (typeof cfg.proPrice === "number")    out.pro.price    = cfg.proPrice;
    if (typeof cfg.teamPrice === "number")   out.team.price   = cfg.teamPrice;
    const feeBy = cfg.payuniFeeByTier || {};
    for (const t of tiers) if (typeof feeBy[t] === "number") out[t].feePct = feeBy[t];
  }
  return out;
}

// Resolved numeric limits for a tier; 0 → Infinity (so callers compare as before).
async function planLimits(tier) {
  const plans = await getPlans();
  const p = plans[tier] || plans.free;
  return {
    maxActiveEvents: (p.maxActiveEvents === 0 || p.maxActiveEvents == null) ? Infinity : p.maxActiveEvents,
    maxCapacity:     (p.maxCapacity === 0 || p.maxCapacity == null) ? Infinity : p.maxCapacity
  };
}

// Resolve the account's effective (highest active) subscription tier:
// "free" | "starter" | "pro" | "team". Mirrors getLicenseStatus's bestTier +
// the legacy "valid-but-untiered subscription counts as starter" fallback.
async function getEffectiveTier(username) {
  if (!username) return "free";
  const snap = await db.collection("licenses").where("activatedBy", "==", username).get();
  const now = Date.now();
  let bestRank = 0, bestTier = "free", subValid = false, totalRem = 0;
  snap.docs.forEach(doc => {
    const l = doc.data();
    const type = (l.type || "").toLowerCase();
    const isSub = type === "subscription" || (!type && l.years > 0);
    const isCount = type === "count" || (!type && l.maxCount > 0);
    if (isSub && l.status === "已啟用") {
      const isLifetime = !l.expiresAt || l.expiresAt === "";
      let valid = isLifetime;
      if (!isLifetime) { const t = new Date(l.expiresAt).getTime(); valid = !isNaN(t) && t > now; }
      if (valid) {
        subValid = true;
        const r = TIER_RANK[(l.tier || "").toLowerCase()] || 0;
        if (r > bestRank) { bestRank = r; bestTier = (l.tier || "free").toLowerCase(); }
      }
    }
    if (isCount && l.status === "已啟用") {
      totalRem += ((parseInt(l.maxCount) || 0) - (parseInt(l.usedCount) || 0));
    }
  });
  let tier = bestTier;
  if (tier === "free" && (subValid || totalRem > 0)) tier = "starter";
  return tier;
}

// Throw permission-denied if a competition-role account's tier lacks `key`.
// Returns the resolved tier on success. System role always allowed (returns "team").
// Resolve a feature gate against a SPECIFIC user's plan (tier). `isSystem` short-circuits to full.
async function requireFeatureAs(username, isSystem, key) {
  if (isSystem) return "team";
  const tier = await getEffectiveTier(username);
  const plans = await getPlans();
  const feats = (plans[tier] && plans[tier].features) || {};
  // Matrix is authoritative; keys absent from the matrix fall back to legacy rank logic.
  const inMatrix = Object.prototype.hasOwnProperty.call(feats, key);
  const allowed = inMatrix ? (feats[key] === true) : ((TIER_RANK[tier] || 0) >= (FEATURE_MIN_RANK[key] || 0));
  if (!allowed) {
    // Lowest tier that unlocks this feature → for the upgrade message.
    let minLabel = "付費";
    for (const t of ["free","starter","pro","team"]) {
      const tf = (plans[t] && plans[t].features) || {};
      const has = Object.prototype.hasOwnProperty.call(tf, key) ? (tf[key] === true) : ((TIER_RANK[t] || 0) >= (FEATURE_MIN_RANK[key] || 0));
      if (has) { minLabel = tierLabel(t); break; }
    }
    throw new HttpsError("permission-denied",
      "「" + (FEATURE_LABEL[key] || key) + "」為 " + minLabel + " 以上方案功能，請先升級方案。");
  }
  return tier;
}
// Account-level gate — checks the CALLER's own plan (e.g. createCompetition).
async function requireFeature(authUser, key) {
  return requireFeatureAs(authUser && authUser.username, !!(authUser && authUser.role === "system"), key);
}
// Comp-scoped gate — entitlement follows the EVENT OWNER's plan, so org members
// (manager/judge/staff) inherit the owner's paid features for that event. For an owner
// acting on their own event compOwner === caller, so behaviour is unchanged.
async function requireCompFeature(request, key) {
  const owner = (request && request.compOwner) || (request && request.authUser && request.authUser.username);
  return requireFeatureAs(owner, !!(request && request.authUser && request.authUser.role === "system"), key);
}

exports.createLicense = authCallable(["system"], async (data) => {
  const tier = String(data.tier || "").toLowerCase();
  const years = Math.max(1, parseInt(data.years, 10) || 1);
  if (!VALID_TIERS.includes(tier)) return { success: false, message: "請選擇方案層級（starter / pro / team）" };
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RM";
  for (let i = 0; i < 4; i++) {
    code += "-";
    for (let j = 0; j < 4; j++) code += c[crypto.randomInt(c.length)];
  }
  await db.collection("licenses").doc(code).set({
    code, type: "subscription", tier, years,
    activatedBy: "", activatedAt: "", expiresAt: "", status: "未啟用", createdAt: fmtNow()
  });
  await auditLog("system", "建立授權碼", code, tier + " / " + years + " 年");
  return { success: true, code };
});

exports.listLicenses = authCallable(["system"], async () => {
  const snap = await db.collection("licenses").get();
  const now = Date.now();
  return snap.docs.map(d => {
    const l = d.data();
    // Subscription-only model: activated + past expiry → 已失效; activated → 已啟用; else 未啟用.
    let computedStatus = "未啟用";
    if (l.activatedBy) {
      if (l.expiresAt && String(l.expiresAt).trim() !== "" && new Date(l.expiresAt).getTime() < now) computedStatus = "已失效";
      else computedStatus = "已啟用";
    }
    return { ...l, computedStatus, tier: l.tier || "" };
  });
});

exports.clearExpiredLicenses = authCallable(["system"], async () => {
  const snap = await db.collection("licenses").get();
  const now = Date.now();
  let count = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    let batchCount = 0;
    snap.docs.slice(i, i + 400).forEach(d => {
      const l = d.data();
      let expired = false;
      if (l.type === "count" && l.activatedBy && l.maxCount > 0 && l.usedCount >= l.maxCount) expired = true;
      if (l.type === "subscription" && l.activatedBy && l.expiresAt && new Date(l.expiresAt).getTime() < now) expired = true;
      if (l.status === "已失效" || l.status === "已過期" || l.status === "已用盡") expired = true;
      if (expired) { batch.delete(d.ref); batchCount++; }
    });
    if (batchCount > 0) { await batch.commit(); count += batchCount; }
  }
  return { success: true, count };
});

exports.deleteLicense = authCallable(["system"], async (data) => {
  await db.collection("licenses").doc(data.code).delete();
  await auditLog("system", "刪除授權碼", data.code, "");
  return { success: true };
});

// BUG-05 FIX: getLicenseStatus requires authenticated session, verifies identity
exports.getLicenseStatus = authCallable(["system","competition"], async (data, request) => {
  // Only allow querying own license status (system admin can query any)
  const targetUser = (request.authUser.role === "system" && data.username) ? data.username : request.authUser.username;
  const snap = await db.collection("licenses").where("activatedBy", "==", targetUser).get();
      
  let subValid = false;
  let maxExpiresAt = 0;
  let hasLifetime = false; // 【修正】：加入永久授權的防呆標記
  let totalRem = 0;
  let bestTierRank = 0;          // highest active tier rank → effective plan
  let bestTier = "free";
  const history = [];

  snap.docs.forEach(doc => {
    const l = doc.data();
    const type = (l.type || "").toLowerCase();
    const isSub = type === "subscription" || (!type && l.years > 0);
    const isCount = type === "count" || (!type && l.maxCount > 0);

    // 判斷是否為「永久授權」
    const isLifetimeSub = isSub && (!l.expiresAt || l.expiresAt === ""); // 移除 "undefined" 字串判定
    // 【自動維護機制】：過濾並更新已過期的訂閱 (永久授權免疫)
    if (isSub && !isLifetimeSub && l.status === "已啟用") {
      const expTime = new Date(l.expiresAt).getTime();
      if (!isNaN(expTime) && expTime < Date.now()) {
        l.status = "已過期";
        doc.ref.update({ status: "已過期" }); // 背景更新狀態
      }
    }

    // 【自動維護機制】：過濾並更新已用盡的次數
    if (isCount && l.status === "已啟用") {
      const rem = (parseInt(l.maxCount) || 0) - (parseInt(l.usedCount) || 0);
      if (rem <= 0) {
        l.status = "已用盡";
        doc.ref.update({ status: "已用盡" }); // 背景更新狀態
      }
    }

    // 寫入歷史紀錄陣列
    history.push({
      code: l.code,
      tier: (l.tier || "").toLowerCase(),
      type: l.tier ? tierLabel(l.tier) : (isSub ? "期限訂閱" : "次數額度"),
      quota: isSub ? `${l.years || 1} 年` : `${l.maxCount || 1} 次`,
      usedCount: isCount ? (l.usedCount || 0) : "-",
      activatedAt: l.activatedAt || "-",
      expiresAt: isLifetimeSub ? "永久" : (isSub && l.expiresAt ? String(l.expiresAt).substring(0, 10) : "-"),
      status: l.status
    });

    // 【機制 3】：計算訂閱最晚到期日與永久狀態
    if (isSub && l.status === "已啟用") {
      if (isLifetimeSub) {
        hasLifetime = true;
        subValid = true; // 擁有永久授權，絕對有效
      } else {
        const t = new Date(l.expiresAt).getTime();
        if (!isNaN(t) && t > maxExpiresAt) maxExpiresAt = t;
      }
      // Track the highest active tier → the account's effective plan
      const r = TIER_RANK[(l.tier || "").toLowerCase()] || 0;
      if (r > bestTierRank) { bestTierRank = r; bestTier = (l.tier || "free").toLowerCase(); }
    }

    // 【機制 2】：加總所有有效的次數額度
    if (isCount && l.status === "已啟用") {
      totalRem += ((parseInt(l.maxCount) || 0) - (parseInt(l.usedCount) || 0));
    }
  });

  // 檢查一般期限訂閱是否有效
  if (!hasLifetime && maxExpiresAt > Date.now()) {
      subValid = true;
  }

  let msg = "";
  if (subValid) {
     let subExpMsg = "永久";
     // 如果不是永久授權，才去格式化最晚到期日
     if (!hasLifetime && maxExpiresAt > 0) {
         const d = new Date(maxExpiresAt);
         subExpMsg = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
     }
     msg = "訂閱方案 (至 " + subExpMsg + ")";
     if (totalRem > 0) msg += `，另備有 ${totalRem} 次額度`;
  } else {
     if (totalRem > 0) msg = `次數方案 (總剩餘 ${totalRem} 次)`;
     else msg = "授權已過期或用盡";
  }

  // 依照啟用時間排序歷史紀錄 (新的在上面)
  history.sort((a, b) => (b.activatedAt || "").localeCompare(a.activatedAt || ""));

  // Effective plan tier. Legacy valid-but-untiered subscriptions count as starter.
  let tier = bestTier;
  if (tier === "free" && (subValid || totalRem > 0)) tier = "starter";
  const expiresAt = (subValid && !hasLifetime && maxExpiresAt > 0)
    ? new Date(maxExpiresAt).toISOString().substring(0, 10)
    : (hasLifetime ? "永久" : "");

  // UX-002: expose the effective feature matrix so the admin UI can lock/upsell
  // gated entry points (scoring/campaigns/checkin/certificate) without duplicating
  // the matrix client-side.
  const _plans = await getPlans();
  const features = (_plans[tier] && _plans[tier].features) || {};
  return { hasValid: subValid || totalRem > 0, tier, planLabel: tierLabel(tier), expiresAt, message: msg, history, features };
});

// ===== 2. 啟用授權碼 (時間累加機制) =====
exports.activateLicense = authCallable(["system","competition"], async (data, request) => {
  const { code } = data;
  const username = request.authUser.username;
  const ref = db.collection("licenses").doc(code);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "無效的授權碼" };
  
  const lic = doc.data();
  if (lic.status !== "未啟用") return { success: false, message: "此授權碼已被使用或失效" };
  
  const type = (lic.type || "").toLowerCase();
  const isSub = type === "subscription" || (!type && lic.years > 0);
  
  let returnedExpDate = null; // 【修正】：將變數宣告在 if 區塊外，讓最底下的 return 可以讀取
  
  if (isSub) {
    // 【機制 3】：找出該帳號目前「最晚」的有效到期日
    const userLicSnap = await db.collection("licenses")
      .where("activatedBy", "==", username)
      .where("type", "==", "subscription")
      .where("status", "==", "已啟用")
      .get();
      
    let maxExpTime = Date.now();
    userLicSnap.docs.forEach(d => {
       const e = d.data().expiresAt;
       if (e) {
         const t = new Date(e).getTime();
         if (!isNaN(t) && t > maxExpTime) maxExpTime = t;
       }
    });
    
    // 從最晚的到期日 (或現在) 往後加上新的年限
    const addYears = parseFloat(lic.years) || 1;
    const newExpDate = new Date(maxExpTime);
    newExpDate.setFullYear(newExpDate.getFullYear() + addYears);
    
    await ref.update({ 
      activatedBy: username, status: "已啟用", activatedAt: fmtNow(), 
      expiresAt: newExpDate.toISOString() 
    });
    
    returnedExpDate = newExpDate.toISOString().substring(0, 10); // 【修正】：將算好的日期存出來
  } else {
    // 次數型直接啟用
    await ref.update({ activatedBy: username, status: "已啟用", activatedAt: fmtNow() });
  }
  
  return { 
    success: true, 
    type: isSub ? "subscription" : "count", 
    expiresAt: returnedExpDate // 【修正】：安全地回傳變數
  };
});

// ===== 3. 扣除授權次數 (優先權判定與低餘額提醒) =====
exports.consumeLicense = authCallable(["system","competition"], async (data, request) => {
  const username = request.authUser.username;
  const userDoc = await db.collection("accounts").where("username", "==", username).limit(1).get();
  if (userDoc.empty) return { success: false, message: "無效帳號" };
  const userEmail = (userDoc.docs[0].data() || {}).email || "";

  const snap = await db.collection("licenses")
      .where("activatedBy", "==", username)
      .where("status", "==", "已啟用")
      .get();
  
  let hasValidSub = false;
  let activeCountLicenses = [];
  let totalRem = 0; // 計算總剩餘次數

  snap.docs.forEach(doc => {
    const l = doc.data();
    const type = (l.type || "").toLowerCase();
    const isSub = type === "subscription" || (!type && l.years > 0);
    const isCount = type === "count" || (!type && l.maxCount > 0);
    
    if (isSub) {
      // 【修正】：加入永久授權的防呆，否則永久授權會被系統誤判為已過期而扣除次數！
      const isLifetimeSub = (!l.expiresAt || String(l.expiresAt).trim() === "undefined" || l.expiresAt === "");
      if (isLifetimeSub || new Date(l.expiresAt).getTime() > Date.now()) {
        hasValidSub = true;
      }
    } else if (isCount) {
      const maxC = parseInt(l.maxCount) || 0;
      const usedC = parseInt(l.usedCount) || 0;
      if (usedC < maxC) {
         activeCountLicenses.push({ id: doc.id, ref: doc.ref, usedCount: usedC, maxCount: maxC });
         totalRem += (maxC - usedC);
      }
    }
  });
  
  if (hasValidSub) return { success: true, message: "使用訂閱授權，不扣除次數" };
  
  if (activeCountLicenses.length > 0) {
     const target = activeCountLicenses[0]; 
     const newUsedCount = target.usedCount + 1;
     
     await target.ref.update({ 
         usedCount: newUsedCount,
         status: newUsedCount >= target.maxCount ? "已用盡" : "已啟用"
     });
     
     // 扣除後剩餘 1 次的推播通知
     const remainingAfterDeduct = totalRem - 1;
     if (remainingAfterDeduct === 1 && userEmail) {
        const htmlBody = `<p>提醒您，您的帳號剩餘最後 <b>1</b> 次建檔額度。請及早準備新的授權碼以確保服務不中斷。</p>`;
        await db.collection("mail").add({
          to: [userEmail], message: { subject: "⚠️ [RegMaster] 授權次數即將用罄提醒", html: htmlBody, text: "授權次數剩餘最後 1 次" }
        });
     }
     
     return { success: true };
  }
  return { success: false, message: "沒有可用額度，請購買新授權" };
});

// ===== AI (Gemini) =====
// P1-4: best-effort sliding-window rate limit (Firestore). Fail-open on infra error so a
// transient DB hiccup never blocks legitimate users.
async function checkRateLimit(key, limit, windowMs) {
  const ref = db.collection("rateLimits").doc(String(key).slice(0, 128));
  try {
    return await db.runTransaction(async (tx) => {
      const d = await tx.get(ref);
      const now = Date.now();
      let count = 0, windowStart = now;
      if (d.exists) { const v = d.data(); if (now - (v.windowStart || 0) < windowMs) { count = v.count || 0; windowStart = v.windowStart || now; } }
      if (count >= limit) return { ok: false };
      tx.set(ref, { count: count + 1, windowStart, updatedAt: now });
      return { ok: true };
    });
  } catch (e) { return { ok: true }; }
}

exports.askCompetitionAI = callable(async (data, request) => {
  const { compId, question } = data;
  const compDoc = await db.collection("competitions").doc(compId).get();
  if (!compDoc.exists) return { answer: "找不到競賽" };
  const comp = compDoc.data();
  const cfg = comp.config || {};
  // Gate by the EVENT OWNER's plan (callers here are unauthenticated registrants) AND
  // the organiser's per-activity toggle (cfg.enableAI, default on). 活動 AI 助理 is STARTER+.
  const ownerUser = comp.creator || comp.createdBy || "";
  if (ownerUser) {
    const plans = await getPlans();
    const ownerTier = await getEffectiveTier(ownerUser);
    const planAllows = !!(plans[ownerTier] && plans[ownerTier].features && plans[ownerTier].features.eventAi === true);
    if (!planAllows || cfg.enableAI === false) {
      return { answer: "此活動未開放 AI 助理。", disabled: true };
    }
  }
  // P1-4: throttle the unauthenticated AI endpoint (wallet-DoS protection) before any Gemini call.
  const _ip = clientIp(request) || "?";
  const _ipOk = await checkRateLimit("aiq_ip_" + _ip, 12, 60000);          // 12 / min / IP
  const _cdOk = await checkRateLimit("aiq_cd_" + compId, 400, 24 * 3600000); // 400 / day / event
  if (!_ipOk.ok || !_cdOk.ok) return { answer: "AI 助理使用過於頻繁，請稍後再試。", rateLimited: true };
  const rules = comp.rulesText || "";
  const desc = cfg.description || "";
  const keyInfo = await getNextGeminiKey();
  if (!keyInfo) return { answer: "AI 未設定" };
  // Pull the ORGANISER's unit name + contact info from their account so the AI can
  // answer as that unit's assistant and surface official contact details.
  let orgName = "", orgEmail = "", orgPhone = "";
  if (ownerUser) {
    try {
      const accSnap = await db.collection("accounts").where("username", "==", ownerUser).limit(1).get();
      if (!accSnap.empty) {
        const acc = accSnap.docs[0].data();
        orgName = acc.organizationName || acc.displayName || "";
        orgEmail = acc.email || "";
        orgPhone = acc.phone || "";
      }
    } catch (e) { /* best-effort */ }
  }
  /* Build comprehensive context from rules, description, and config */
  let ctx = "活動規則/規章：\n" + rules.substring(0, 4000);
  if (desc) ctx += "\n\n活動說明：\n" + desc.replace(/<[^>]*>/g, ' ').substring(0, 2000);
  ctx += "\n\n活動名稱：" + (cfg.competitionName || comp.name || "");
  if (cfg.sessions && cfg.sessions.length) { ctx += "\n活動梯次："; cfg.sessions.forEach(function(s, i) { ctx += "\n梯次" + (i+1) + "：" + (s.startDate || "") + " ~ " + (s.endDate || ""); }); }
  if (comp.deadline) ctx += "\n報名截止：" + comp.deadline;
  if (orgName || orgEmail || orgPhone) {
    ctx += "\n\n主辦單位資訊：";
    if (orgName) ctx += "\n單位名稱：" + orgName;
    if (orgEmail) ctx += "\n聯絡 Email：" + orgEmail;
    if (orgPhone) ctx += "\n聯絡電話：" + orgPhone;
  }
  const persona =
    "你是「" + (orgName || (cfg.competitionName || comp.name || "本活動主辦單位")) + "」的官方活動 AI 助理，" +
    "代表主辦單位回答報名者的提問。請以親切、專業、代表主辦方的口吻回覆。" +
    "若報名者詢問聯絡方式、洽詢窗口或如何聯繫主辦，請優先提供上方「主辦單位資訊」中的聯絡 Email 與電話；" +
    "若上方未提供某項聯絡資訊，才引導對方參考活動說明或於系統內留言。" +
    "請僅根據以上提供的活動與主辦單位資訊回答，勿杜撰不存在的細節。";
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + keyInfo.key, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: persona + "\n\n" + ctx + "\n\n問題：" + question + "\n請依照問題的語言回答。簡潔明瞭。" }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.3 }
      })
    });
    const json = await res.json();
    let answer = "";
    try {
      json.candidates[0].content.parts.forEach(p => { if (p.text) answer += p.text; });
    } catch (e) { answer = "AI 無法回答"; }
    if (!answer || answer.includes("找不到") || answer.includes("沒有提到")) {
      await db.collection("notifications").add({ notifId: generateId("N"), compId, question, time: fmtNow(), read: false });
    }
    return { answer };
  } catch (e) {
    await rotateGeminiKey();
    return { answer: "AI 暫時無法使用：" + e.message };
  }
});

// ===== Admin AI Assistant (with Manual RAG) =====
let _manualCache = { text: "", sections: [], ts: 0 };

async function loadManualSections() {
  const now = Date.now();
  if (_manualCache.sections.length > 0 && (now - _manualCache.ts) < 3600000) return _manualCache.sections;
  try {
    const res = await fetch(PROJECT_HOST + "/Manual.html");
    const html = await res.text();
    const plain = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|li|tr|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const chunks = [];
    const lines = plain.split("\n");
    let chunk = "", heading = "總覽";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { if (chunk) chunk += "\n"; continue; }
      const isHeading = /^[一二三四五六七八九十\d]{1,3}[.、)）]/.test(trimmed) || /^(步驟|功能|設定|說明|注意|備註)/.test(trimmed);
      if (isHeading && chunk.length > 80) {
        chunks.push({ heading, content: chunk.trim() });
        chunk = ""; heading = trimmed.substring(0, 40);
      }
      chunk += trimmed + "\n";
      if (chunk.length > 600) {
        chunks.push({ heading, content: chunk.trim() });
        chunk = ""; heading = trimmed.substring(0, 40);
      }
    }
    if (chunk.trim()) chunks.push({ heading, content: chunk.trim() });
    _manualCache = { text: plain, sections: chunks, ts: now };
    return chunks;
  } catch (e) {
    return _manualCache.sections;
  }
}

function ragSearch(sections, question, topK) {
  const q = question.toLowerCase();
  const keywords = q.replace(/[？?！!，,。.、\s]+/g, " ").split(" ").filter(w => w.length >= 2);
  if (keywords.length === 0) return sections.slice(0, topK).map(s => s.content).join("\n\n");
  const scored = sections.map(s => {
    const t = (s.heading + " " + s.content).toLowerCase();
    let score = 0;
    keywords.forEach(kw => {
      const idx = t.indexOf(kw);
      if (idx !== -1) { score += 10; if (s.heading.toLowerCase().includes(kw)) score += 5; }
      const parts = t.split(kw);
      score += (parts.length - 1) * 3;
    });
    return { section: s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const results = scored.filter(s => s.score > 0).slice(0, topK);
  if (results.length === 0) return sections.slice(0, topK).map(s => s.content).join("\n\n");
  return results.map(r => r.section.content).join("\n\n");
}

// ===== Vector knowledge base (Gemini embeddings + cosine retrieval) =====
const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768;
async function geminiEmbed(text, keyInfo) {
  const k = keyInfo || await getNextGeminiKey();
  if (!k) return null;
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + EMBED_MODEL + ":embedContent?key=" + k.key, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/" + EMBED_MODEL,
        content: { parts: [{ text: String(text || "").slice(0, 8000) }] },
        outputDimensionality: EMBED_DIM
      })
    });
    const j = await res.json();
    return (j && j.embedding && j.embedding.values) || null;
  } catch (e) { return null; }
}
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
// Returns top-K manual passages by semantic similarity, or null if the KB is
// empty / embedding fails (callers then fall back to keyword ragSearch).
async function vectorSearch(question, topK) {
  const keyInfo = await getNextGeminiKey();
  if (!keyInfo) return null;
  const qEmb = await geminiEmbed(question, keyInfo);
  if (!qEmb) return null;
  const snap = await db.collection("knowledgeBase").get();
  if (snap.empty) return null;
  const scored = snap.docs.map(d => { const k = d.data(); return { content: k.content, score: cosineSim(qEmb, k.embedding || []) }; });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(r => r.content).join("\n\n");
}

// Rebuild the vector knowledge base from the operation manual (system only).
exports.rebuildKnowledgeBase = authCallable(["system"], async () => {
  const keyInfo = await getNextGeminiKey();
  if (!keyInfo) return { success: false, message: "AI 金鑰未設定" };
  _manualCache.ts = 0; // force a fresh manual fetch
  const sections = await loadManualSections();
  if (!sections.length) return { success: false, message: "找不到知識庫來源（Manual.html）" };
  // Clear the old KB
  const old = await db.collection("knowledgeBase").get();
  if (old.size) { const bd = db.batch(); old.docs.forEach(d => bd.delete(d.ref)); await bd.commit(); }
  // Embed + store each section
  let count = 0;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const emb = await geminiEmbed(s.heading + "\n" + s.content, keyInfo);
    if (!emb) continue;
    await db.collection("knowledgeBase").doc("kb_" + i).set({ heading: s.heading, content: s.content, embedding: emb, idx: i, updatedAt: fmtNow() });
    count++;
  }
  await auditLog("system", "重建AI知識庫", "", count + " / " + sections.length + " 段");
  return { success: true, count, total: sections.length };
});

// Knowledge-base status (count) for the system settings UI.
exports.getKnowledgeBaseStatus = authCallable(["system"], async () => {
  const snap = await db.collection("knowledgeBase").get();
  let updatedAt = "";
  snap.docs.forEach(d => { const u = d.data().updatedAt || ""; if (u > updatedAt) updatedAt = u; });
  return { count: snap.size, updatedAt };
});

// Build a registration-data + statistics context for the organiser AI.
// Scoped to the caller's OWN activities only (security). This is ONLY used by the
// auth-gated askAdminAI — never by the public registrant-facing askCompetitionAI.
async function buildOrgStatsContext(username, role, compId) {
  function statusBuckets(tSnap) {
    let total = 0, accepted = 0, waitlist = 0, cancelled = 0, paid = 0, payWait = 0;
    const groupMap = {}, dailyMap = {};
    tSnap.docs.forEach(d => {
      const t = d.data(); const st = t.status || "";
      if (st === "已取消") { cancelled++; return; }
      total++;
      if (st === "正取") accepted++;
      if (st.startsWith("備取")) waitlist++;
      if (String(t.paymentStatus || "").includes("已確認")) paid++; else payWait++;
      const g = t.group || "未分組"; groupMap[g] = (groupMap[g] || 0) + 1;
      const day = toDayKey(t.registrationTime); if (day) dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    return { total, accepted, waitlist, cancelled, paid, payWait, groupMap, dailyMap };
  }
  if (compId) {
    const [compDoc, tSnap] = await Promise.all([
      db.collection("competitions").doc(compId).get(),
      db.collection("teams").where("compId", "==", compId).get()
    ]);
    if (!compDoc.exists) return "";
    const comp = compDoc.data();
    const s = statusBuckets(tSnap);
    const views = comp.viewCount || 0;
    const conv = views > 0 ? ((s.total / views) * 100).toFixed(1) + "%" : "（尚無瀏覽數據）";
    const payRate = s.total > 0 ? ((s.paid / s.total) * 100).toFixed(1) + "%" : "0%";
    let c = "\n=== 此活動報名資料與統計（即時）===\n";
    c += "報名總數（不含已取消）：" + s.total + "\n";
    c += "正取：" + s.accepted + "，備取：" + s.waitlist + "，已取消：" + s.cancelled + "\n";
    c += "已付款：" + s.paid + "，待付款／待確認：" + s.payWait + "，付款完成率：" + payRate + "\n";
    c += "頁面瀏覽數：" + views + "，瀏覽→報名轉換率：" + conv + "\n";
    c += "名額上限：" + (comp.maxTeams || "不限") + "\n";
    const gl = Object.keys(s.groupMap).map(g => g + "：" + s.groupMap[g]).join("，");
    if (gl) c += "各組別報名數：" + gl + "\n";
    const days = Object.keys(s.dailyMap).sort();
    if (days.length) c += "近 7 日每日報名：" + days.slice(-7).map(d => d + " (" + s.dailyMap[d] + ")").join("，") + "\n";
    return c;
  }
  // No compId — aggregate across the caller's activities (system role sees none here).
  if (role !== "competition") return "";
  const snap = await db.collection("competitions").where("creator", "==", username).get();
  if (snap.empty) return "";
  let evCount = 0, openCount = 0, tTotal = 0, tPaid = 0, tPayWait = 0, tViews = 0;
  const perEvent = [];
  for (const doc of snap.docs) {
    const comp = doc.data(); evCount++;
    if (comp.isOpen) openCount++;
    const tSnap = await db.collection("teams").where("compId", "==", doc.id).get();
    const s = statusBuckets(tSnap);
    const views = comp.viewCount || 0;
    tTotal += s.total; tPaid += s.paid; tPayWait += s.payWait; tViews += views;
    const conv = views > 0 ? ((s.total / views) * 100).toFixed(1) + "%" : "—";
    perEvent.push((comp.name || doc.id) + "：報名 " + s.total + "，已付款 " + s.paid + "，待付款 " + s.payWait + "，瀏覽 " + views + "，轉換 " + conv + (comp.isOpen ? "，開放中" : "，未開放"));
  }
  const overallConv = tViews > 0 ? ((tTotal / tViews) * 100).toFixed(1) + "%" : "（尚無瀏覽數據）";
  const overallPay = tTotal > 0 ? ((tPaid / tTotal) * 100).toFixed(1) + "%" : "0%";
  let c = "\n=== 你所有活動的報名資料與統計（彙總，即時）===\n";
  c += "活動總數：" + evCount + "（開放中 " + openCount + "）\n";
  c += "報名總數：" + tTotal + "，已付款：" + tPaid + "，待付款／待確認：" + tPayWait + "\n";
  c += "整體付款完成率：" + overallPay + "，整體瀏覽→報名轉換率：" + overallConv + "，總瀏覽數：" + tViews + "\n";
  c += "\n各活動概況：\n" + perEvent.map((e, i) => (i + 1) + "、 " + e).join("\n") + "\n";
  return c;
}

exports.askAdminAI = compAuthCallable(async (data, request) => {
  await requireCompFeature(request, "ai");
  const { question, compId } = data;
  const keyInfo = await getNextGeminiKey();
  if (!keyInfo) return { answer: "AI 未設定" };

  // Prefer semantic (vector) retrieval; fall back to keyword search if the KB
  // hasn't been built yet or embedding is unavailable.
  let ragContext = await vectorSearch(question, 5);
  if (!ragContext) {
    const sections = await loadManualSections();
    ragContext = ragSearch(sections, question, 5);
  }

  let ctx = "你是 RegMaster 線上報名平台的系統設定 AI 助理。\n";
  ctx += "回覆規則：\n";
  ctx += "1. 可使用簡單的 Markdown（粗體 **、清單 - 或 1.、小標題 #）讓回答清楚易讀\n";
  ctx += "2. 回答簡潔明瞭，具系統化結構；段落之間用空行分隔\n";
  ctx += "3. 依照問題的語言回答\n";
  ctx += "4. 你可參考下方「報名資料與統計」回答報名轉換率、付款狀況等數據問題，並據此提供具體、可執行的提升報名／轉換建議\n\n";

  ctx += "=== 操作手冊參考內容 ===\n" + ragContext + "\n\n";

  ctx += "=== RegMaster 功能總覽 ===\n";
  ctx += "RegMaster 是專業線上報名平台，核心功能包含：\n";
  ctx += "1、活動管理：建立活動、設定組別、梯次（單選/複選）、報名截止日、最大報名數\n";
  ctx += "2、報名表設定：學生/教練欄位、自訂問題、便當/T-shirt選項\n";
  ctx += "3、金流整合：銀行轉帳、信用卡、現金、PAYUNi線上金流\n";
  ctx += "4、檔案上傳：海報圖片、規則PDF、報名時要求上傳PDF（必填/選填）\n";
  ctx += "5、通知系統：自動Email通知、公告功能\n";
  ctx += "6、AI 助理：報名者AI助理（回答活動問題）、管理者AI助理（回答設定問題）\n";
  ctx += "7、授權管理：授權碼系統、到期提醒\n";
  ctx += "8、帳號管理：系統管理員可建立活動管理員帳號\n";
  ctx += "9、報到系統：QR Code報到\n";
  ctx += "10、成績管理：成績輸入與發布\n\n";
  ctx += "=== 常見設定說明 ===\n";
  ctx += "活動梯次：可設定多個梯次，2個以上時可選擇「單選」或「複選」模式\n";
  ctx += "檔案上傳要求：勾選後可設為「必填」或「選填」\n";
  ctx += "最大報名數：設為0表示不限制\n";
  ctx += "開放時間：可設定「即日起」或指定日期\n";
  ctx += "AI 助理開關：控制報名者是否能使用AI助理\n";
  ctx += "自動Email通知：報名成功後自動寄信\n";
  ctx += "PAYUNi金流：需填入商店代號、HashKey、HashIV\n";
  ctx += "組別年齡限制：可對每個組別設定年齡或出生日期限制\n";

  if (compId) {
    try {
      const compDoc = await db.collection("competitions").doc(compId).get();
      if (compDoc.exists) {
        const comp = compDoc.data();
        const cfg = comp.config || {};
        ctx += "\n=== 目前活動設定 ===\n";
        ctx += "活動名稱：" + (cfg.competitionName || comp.name || "") + "\n";
        ctx += "狀態：" + (comp.isOpen ? "開放報名" : "未開放") + "\n";
        ctx += "組別：" + (cfg.groups || []).join("、") + "\n";
        ctx += "梯次數：" + ((cfg.sessions || []).length) + "\n";
        ctx += "梯次模式：" + (cfg.sessionSelectMode === "multi" ? "複選" : "單選") + "\n";
        ctx += "最大報名數：" + (comp.maxTeams || "不限") + "\n";
        ctx += "檔案上傳：" + (cfg.requireFileUpload ? ("啟用，" + (cfg.fileUploadLevel === "optional" ? "選填" : "必填")) : "未啟用") + "\n";
        ctx += "付款方式：" + (cfg.paymentMethods || []).join("、") + "\n";
        if (comp.deadline) ctx += "截止日：" + comp.deadline + "\n";
        if (cfg.openDate) ctx += "開放日：" + cfg.openDate + "\n";
      }
    } catch(e) {}
  }

  // Live registration data + statistics (scoped to the caller's own activities).
  try { ctx += await buildOrgStatsContext(request.authUser.username, request.authUser.role, compId); } catch (e) {}

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + keyInfo.key, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ctx + "\n管理員問題：" + question }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.3 }
      })
    });
    const json = await res.json();
    let answer = "";
    try { json.candidates[0].content.parts.forEach(p => { if (p.text) answer += p.text; }); } catch(e) { answer = "AI 無法回答"; }
    return { answer };
  } catch(e) {
    await rotateGeminiKey();
    return { answer: "AI 暫時無法使用：" + e.message };
  }
});

// Tells the admin AI page which knowledge sources actually EXIST for an activity,
// so the KB panel can hide empty ones (規章/說明/報名資料/主辦資訊).
exports.getCompKbStatus = compAuthCallable(async (data) => {
  const compId = data.compId;
  if (!compId) return {};
  const compDoc = await db.collection("competitions").doc(compId).get();
  if (!compDoc.exists) return {};
  const comp = compDoc.data();
  const cfg = comp.config || {};
  const hasRules = !!((comp.rulesText && comp.rulesText.trim()) || comp.rulesPdfId);
  const hasDescription = (cfg.description || "").replace(/<[^>]*>/g, "").trim().length > 0;
  let orgName = "", orgEmail = "", orgPhone = "";
  if (comp.creator) {
    try {
      const a = await db.collection("accounts").where("username", "==", comp.creator).limit(1).get();
      if (!a.empty) { const ac = a.docs[0].data(); orgName = ac.organizationName || ac.displayName || ""; orgEmail = ac.email || ""; orgPhone = ac.phone || ""; }
    } catch (e) {}
  }
  const hasOrgInfo = !!(orgName || orgEmail || orgPhone);
  const tSnap = await db.collection("teams").where("compId", "==", compId).get();
  let regCount = 0;
  tSnap.docs.forEach(d => { if ((d.data().status || "") !== "已取消") regCount++; });
  return { hasRules, hasDescription, hasOrgInfo, regCount, hasRegData: regCount > 0 };
});


// ===== Missing Functions: PDF Upload, AI Analysis, Batch Import =====
exports.uploadRulesPdf = compAuthCallable(async (data, request) => {
  const { compId, base64Data, fileName } = data;
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "not found" };
  
  try {
    const oldData = doc.data();
    /* Delete old PDF + chunks */
    if (oldData.pdfDocId) {
      try {
        const oldChunks = await db.collection("pdfFiles").where("parentId", "==", oldData.pdfDocId).get();
        const batch = db.batch();
        oldChunks.docs.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection("pdfFiles").doc(oldData.pdfDocId));
        await batch.commit();
      } catch(e) {}
    }
    
    /* Extract text from PDF for AI assistant */
    let extractedText = "";
    try {
      const pdfParse = require("pdf-parse");
      const pdfBuffer = Buffer.from(base64Data, "base64");
      const parsed = await pdfParse(pdfBuffer);
      extractedText = (parsed.text || "").substring(0, 10000).trim();
    } catch(pe) {
      extractedText = "(PDF text extraction failed: " + pe.message + ")";
    }
    
    /* Split base64 into chunks (each < 800KB to stay under Firestore 1MB limit) */
    const CHUNK_SIZE = 800000;
    const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
    const pdfRef = db.collection("pdfFiles").doc();
    
    /* Store first chunk + metadata in main doc */
    await pdfRef.set({
      compId, fileName, mimeType: "application/pdf",
      data: base64Data.substring(0, CHUNK_SIZE),
      totalChunks, totalSize: base64Data.length,
      createdAt: fmtNow()
    });
    
    /* Store remaining chunks */
    for (let i = 1; i < totalChunks; i++) {
      await db.collection("pdfFiles").doc(pdfRef.id + "_chunk" + i).set({
        parentId: pdfRef.id,
        chunkIndex: i,
        data: base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      });
    }
    
    const viewUrl = "pfpdf:" + pdfRef.id;
    const textPreview = extractedText.length > 50 ? extractedText.substring(0, 50) + "..." : extractedText;
    await ref.update({ rulesPdfId: viewUrl, pdfDocId: pdfRef.id, rulesText: extractedText });
    await auditLog(request.authUser.username, "upload rules", compId, fileName + " (" + Math.round(base64Data.length * 3/4/1024) + "KB, " + totalChunks + " chunks, text: " + extractedText.length + " chars)");
    
    return { success: true, fileId: pdfRef.id, viewUrl: "pfpdf:" + pdfRef.id, textExtracted: extractedText.length };
  } catch (e) {
    return { success: false, message: "上傳失敗: " + e.message };
  }
});

/* Fetch PDF from pdfFiles for viewing */
exports.getPdfData = callable(async (data) => {
  const { docId } = data;
  if (!docId) return { success: false };
  const pDoc = await db.collection("pdfFiles").doc(docId).get();
  if (!pDoc.exists) return { success: false };
  const p = pDoc.data();
  
  /* Reassemble chunks if multi-chunk PDF */
  let fullData = p.data || "";
  const totalChunks = p.totalChunks || 1;
  if (totalChunks > 1) {
    for (let i = 1; i < totalChunks; i++) {
      const chunkDoc = await db.collection("pdfFiles").doc(docId + "_chunk" + i).get();
      if (chunkDoc.exists) fullData += chunkDoc.data().data || "";
    }
  }
  
  return { success: true, dataUri: "data:application/pdf;base64," + fullData, fileName: p.fileName || "rules.pdf" };
});


// P1-3: require the event owner/manager (was unauthenticated → anyone could overwrite any
// team's file by teamId). Only caller was the retired legacy SPA; v3 has none.
exports.uploadTeamFile = compAuthCallable("manage", async (data, request) => {
  const { compId, teamId, base64Data, fileName } = data;
  try {
    /* Delete old chunks */
    const oldChunks = await db.collection("teamFiles").where("parentId", "==", teamId).get();
    if (!oldChunks.empty) {
      const batch = db.batch();
      oldChunks.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    
    const CHUNK_SIZE = 800000;
    const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
    const fileRef = db.collection("teamFiles").doc(teamId);
    await fileRef.set({
      compId, teamId, fileName, mimeType: "application/pdf",
      data: base64Data.substring(0, CHUNK_SIZE),
      totalChunks, totalSize: base64Data.length,
      createdAt: fmtNow()
    });
    for (let i = 1; i < totalChunks; i++) {
      await db.collection("teamFiles").doc(teamId + "_chunk" + i).set({
        parentId: teamId,
        chunkIndex: i,
        data: base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      });
    }
    const fileUrl = "pftf:" + teamId;
    await db.collection("teams").doc(teamId).update({ fileUrl });
    return { success: true, url: fileUrl };
  } catch(e) {
    return { success: false, message: "上傳失敗: " + e.message };
  }
});

// ===== Item 7: per-field registration file upload (regFiles collection) =====
// Public: a registrant uploads a file for a form file-field (before the team
// exists), getting back a fileId stored in the answer as "regfile:<id>|<name>".
exports.uploadRegFile = callable(async (data) => {
  const { compId, base64Data, fileName, mimeType } = data;
  if (!base64Data) return { success: false, message: "缺少檔案" };
  if (base64Data.length > 8000000) return { success: false, message: "檔案過大（上限約 5MB）" };
  // C-5 hardening: uploads must target a real activity (blocks junk uploads / quota abuse).
  const compDoc = await db.collection("competitions").doc(String(compId || "")).get();
  if (!compDoc.exists) return { success: false, message: "活動不存在" };
  try {
    // C-2: non-guessable file id (was Date.now()+Math.random — enumerable, fed the C-6 IDOR).
    const fileId = "RF" + crypto.randomBytes(12).toString("hex");
    const CHUNK = 800000;
    const total = Math.ceil(base64Data.length / CHUNK);
    await db.collection("regFiles").doc(fileId).set({
      fileId, compId: compId || "", fileName: fileName || "file",
      mimeType: mimeType || "application/octet-stream",
      data: base64Data.substring(0, CHUNK), totalChunks: total, totalSize: base64Data.length, createdAt: fmtNow()
    });
    for (let i = 1; i < total; i++) {
      await db.collection("regFiles").doc(fileId + "_chunk" + i).set({ parentId: fileId, chunkIndex: i, data: base64Data.substring(i * CHUNK, (i + 1) * CHUNK) });
    }
    return { success: true, fileId, fileName: fileName || "file" };
  } catch (e) { return { success: false, message: "上傳失敗: " + e.message }; }
});
exports.getRegFileData = compAuthCallable("view", async (data, request) => {
  const { fileId, compId } = data;
  if (!fileId) return { success: false };
  // Fairness (④.1): judges without info access cannot download registrant uploads.
  if (request.memberRoleName === "judge" && !(await judgeInfoAllowed(request, compId))) return { success: false, message: "權限不足" };
  const doc = await db.collection("regFiles").doc(fileId).get();
  if (!doc.exists) return { success: false, message: "找不到檔案" };
  const d = doc.data();
  // C-6 IDOR guard: the file must belong to the activity the caller was authorised for.
  // compAuthCallable already verified the caller owns / has view on `compId` (system bypasses);
  // here we ensure the requested file actually belongs to that same activity.
  if (!compId || (d.compId || "") !== compId) {
    throw new HttpsError("permission-denied", "權限不足");
  }
  let b64 = d.data || "";
  for (let i = 1; i < (d.totalChunks || 1); i++) {
    const c = await db.collection("regFiles").doc(fileId + "_chunk" + i).get();
    if (c.exists) b64 += (c.data().data || "");
  }
  return { success: true, fileName: d.fileName, mimeType: d.mimeType, dataUrl: "data:" + (d.mimeType || "application/octet-stream") + ";base64," + b64 };
});

/* Fetch team uploaded file from teamFiles collection */
exports.getTeamFileData = compAuthCallable(async (data) => {
  const { teamId } = data;
  if (!teamId) return { success: false };
  const pDoc = await db.collection("teamFiles").doc(teamId).get();
  if (!pDoc.exists) return { success: false };
  const p = pDoc.data();
  let fullData = p.data || "";
  const totalChunks = p.totalChunks || 1;
  if (totalChunks > 1) {
    for (let i = 1; i < totalChunks; i++) {
      const chunkDoc = await db.collection("teamFiles").doc(teamId + "_chunk" + i).get();
      if (chunkDoc.exists) fullData += chunkDoc.data().data || "";
    }
  }
  return { success: true, dataUri: "data:application/pdf;base64," + fullData, fileName: p.fileName || "upload.pdf" };
});


exports.analyzeRulesWithAI = compAuthCallable(async (data) => {
  const { compId } = data;
  const compDoc = await db.collection("competitions").doc(compId).get();
  if (!compDoc.exists) return { success: false, message: "not found" };
  
  const comp = compDoc.data();
  const rules = comp.rulesText || "";
  if (!rules || rules.length < 20) return { success: false, message: "please upload rules PDF first" };
  
  const keyInfo = await getNextGeminiKey();
  if (!keyInfo) return { success: false, message: "AI not configured" };
  
  let rawResponseText = ""; // 用來儲存原始回應，方便 Debug
  
  try {
    // 【修改重點 1】：換回您 GAS 版精準的中文 Prompt，特別指定 yyyy-MM-ddTHH:mm 格式，並加入新版需要的欄位
    let prompt = '你是競賽報名系統的助理。根據以下競賽規則內容，分析並提取資訊。請嚴格以JSON格式回覆（不要markdown）：\n';
    prompt += '{"competitionName":"競賽名稱","openDate":"開放報名日期時間(yyyy-MM-ddTHH:mm格式)","deadline":"報名截止日期時間(yyyy-MM-ddTHH:mm格式)","competitionDate":"比賽日期時間(yyyy-MM-ddTHH:mm格式)","memberCount":學生人數(數字),"teacherCount":老師人數(數字),"maxTeams":最大組數(數字),"groups":["組別1","組別2"],"paymentInfo":"付款相關資訊","description":"<h3>競賽簡介</h3>HTML格式內容"}\n\n';
    prompt += '競賽規則全文：\n' + rules.substring(0, 8000);

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + keyInfo.key, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.1 }
      })
    });
    
    const json = await res.json();
    rawResponseText = JSON.stringify(json, null, 2); // 備份完整的 API 回應
    
    // API 回傳非 200 狀態碼
    if (!res.ok) {
      await rotateGeminiKey();
      return { success: false, message: 'API 錯誤 (' + res.status + ')', debug: rawResponseText };
    }
    
    let text = "";
    try { 
      json.candidates[0].content.parts.forEach(p => { if (p.text) text += p.text; }); 
    } catch(e) {
      return { success: false, message: "AI 回應結構異常", debug: rawResponseText };
    }
    
    // 【修改重點 2】：使用正則表達式擷取 JSON，並加入嚴謹的 Try-Catch 解析
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return { success: false, message: "AI 未回傳有效 JSON", debug: "AI 文字：\n" + text };
    }
    
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, data: parsed };
    } catch (je) {
      return { success: false, message: "JSON 解析失敗", debug: "擷取到的字串：\n" + jsonMatch[0] };
    }
    
  } catch (e) {
    await rotateGeminiKey();
    return { success: false, message: "系統錯誤: " + e.message, debug: rawResponseText };
  }
});


// V-21: block SSRF to internal/metadata endpoints when fetching an external poster URL.
function isSafeFetchUrl(u) {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    const h = url.hostname.toLowerCase();
    if (h === "localhost" || h === "metadata.google.internal" || h === "169.254.169.254") return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (h.endsWith(".internal") || h.endsWith(".local")) return false;
    return true;
  } catch (e) { return false; }
}

exports.analyzePosterColors = compAuthCallable(async (data) => {
  const { compId, posterUrl } = data;
  
  const keyInfo = await getNextGeminiKey();
  if (!keyInfo) return { success: false, message: "請先設定 Gemini API Key" };
  
  try {
    let base64Data = "";
    let mimeType = "image/png";
    
    // Try stored poster first
    const compDoc = await db.collection("competitions").doc(compId).get();
    const compData = compDoc.exists ? compDoc.data() : {};
    if (compData.posterDocId) {
      const posterDoc = await db.collection("posterFiles").doc(compData.posterDocId).get();
      if (posterDoc.exists) {
        base64Data = posterDoc.data().data || "";
        mimeType = posterDoc.data().mimeType || "image/png";
      }
    }
    
    // Fallback: data URL (extract base64)
    if (!base64Data && posterUrl && posterUrl.startsWith("data:")) {
      const parts = posterUrl.split(",");
      if (parts.length > 1) {
        base64Data = parts[1];
        mimeType = (parts[0].match(/data:([^;]+)/) || [])[1] || "image/png";
      }
    }
    
    // Fallback: regular URL download
    if (!base64Data && posterUrl && posterUrl.startsWith("http")) {
      if (!isSafeFetchUrl(posterUrl)) return { success: false, message: "海報網址不被允許（僅接受 https 公開網址）" };
      const imgResp = await fetch(posterUrl);
      if (!imgResp.ok) return { success: false, message: "無法下載海報圖片" };
      const arrayBuffer = await imgResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 10000000) return { success: false, message: "圖片超過 10MB" };
      base64Data = buffer.toString("base64");
      mimeType = imgResp.headers.get("content-type") || "image/jpeg";
    }
    
    if (!base64Data) return { success: false, message: "請先上傳海報圖片" };

    const prompt = '分析這張海報的主要配色。嚴格規定只能回傳JSON物件，不要包含Markdown格式。必須包含這5個Hex顏色欄位：{"primary":"#xxxxxx", "secondary":"#xxxxxx", "accent":"#xxxxxx", "background":"#xxxxxx", "text":"#xxxxxx"}';

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + keyInfo.key, {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: prompt }
          ] 
        }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.1 }
      })
    });
    
    const json = await res.json();
    let text = "";
    try { 
      json.candidates[0].content.parts.forEach(p => { if (p.text) text += p.text; }); 
    } catch(e) {}
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, message: "AI 回傳格式錯誤", debug: text };
    
    const colors = JSON.parse(jsonMatch[0]);
    
    // 【修改重點】：改為 JSON 物件並轉為字串儲存
    const themeObj = {
      primary: colors.primary || "#0A437A",
      secondary: colors.secondary || "#0D5BA8",
      accent: colors.accent || "#F49121",
      background: colors.background || "#F8FAFC",
      text: colors.text || "#1E293B"
    };
    
    // 轉為 JSON 字串存入資料庫
    await db.collection("competitions").doc(compId).update({ themeColors: JSON.stringify(themeObj) });
    
    return { success: true, colors: colors };    
    
  } catch (e) {
    await rotateGeminiKey();
    return { success: false, message: e.message };
  }
});


exports.batchImportTeams = compAuthCallable(async (data) => {
  const { compId, csvText } = data;
  const lines = (csvText || "").trim().split("\n").filter(l => l.trim());
  if (!lines.length) return { success: false, message: "empty" };
  
  const compDoc = await db.collection("competitions").doc(compId).get();
  const comp = compDoc.data();
  const cfg = comp ? comp.config || {} : {};
  const stats = await getCompStats(compId);
  
  let imported = 0, errors = [];
  const perSession = isPerSessionQuota(cfg);
  
  // Track current counts for incremental quota checking
  let currentAccepted = stats.accepted || 0;
  let currentWaitlist = stats.waitlist || 0;
  // Per-session tracking
  const curSessAccepted = { ...(stats.sessionAccepted || {}) };
  const curSessWaitlist = { ...(stats.sessionWaitlist || {}) };
  
  for (const line of lines) {
    const cols = line.split(",").map(c => c.trim());
    if (cols.length < 2) { errors.push("format error: " + line.substring(0, 30)); continue; }
    
    const teamId = generateId("T");
    const pwd = generatePassword();
    
    let status = "正取";
    let wn = 0;
    
    // Parse selected sessions from CSV if sessions > 1
    let teamSessions = [0];
    const sessions = cfg.sessions || [];
    let extraColOffset = 0;
    if (sessions.length > 1) {
      // Session column comes after group(col0), teamNameCN(col1), optionally teamNameEN(col2)
      let sColIdx = cfg.requireTeamNameCN ? 1 : 1;
      if (cfg.requireTeamNameEN) sColIdx++;
      sColIdx++; // After group col
      const sVal = (cols[sColIdx] || "").trim();
      if (sVal) {
        teamSessions = sVal.split(/[;；,、]/).map(v => parseInt(v.trim()) - 1).filter(v => !isNaN(v) && v >= 0);
        if (!teamSessions.length) teamSessions = [0];
      }
      extraColOffset = 1; // account for session column in CSV
    }
    
    if (perSession) {
      // Per-session quota check
      for (const sIdx of teamSessions) {
        const s = sessions[sIdx];
        if (!s) continue;
        const sMax = parseInt(s.maxTeams) || 0;
        if (sMax <= 0) continue;
        const sAcc = curSessAccepted[sIdx] || 0;
        if (sAcc >= sMax) {
          if (s.allowWaitlist === false) { status = "FULL"; break; }
          const sWait = curSessWaitlist[sIdx] || 0;
          wn = sWait + 1;
          status = "備取" + wn;
        }
      }
      if (status === "FULL") { errors.push("session full"); continue; }
    } else {
      const maxT = comp.maxTeams || 0;
      if (maxT > 0 && currentAccepted >= maxT) {
        if (cfg.allowWaitlist === false) { errors.push("full"); continue; }
        currentWaitlist++;
        wn = currentWaitlist;
        status = "備取" + wn;
      } else {
        currentAccepted++;
      }
    }
    
    // Update per-session counters
    if (perSession) {
      for (const sIdx of teamSessions) {
        if (status === "正取") curSessAccepted[sIdx] = (curSessAccepted[sIdx] || 0) + 1;
        else curSessWaitlist[sIdx] = (curSessWaitlist[sIdx] || 0) + 1;
      }
    }
    
    // 【修正】：將正確的 waitlistNum (wn) 寫入資料庫，取代原本寫死的 0
    await db.collection("teams").doc(teamId).set({
      teamId, compId, registrationTime: fmtNow(), group: cols[0] || "",
      teamNameCN: cols[1] || "", teamNameEN: "", status, paymentStatus: "pending",
      paymentMethod: "", remitterName: "", remitterBank: "", remitterAccount: "",
      note: "batch import", passwordBcrypt: hashPwdBcrypt(pwd), waitlistNum: wn, creditCardOrderNo: "", fileUrl: "",
      selectedSessions: teamSessions, customAnswers: {}
    });
    
    let colIdx = 2; 
    for (let i = 0; i < (cfg.memberCount || 1); i++) {
      let studentData = { teamId, compId, role: "學生", seq: i + 1 };
      (cfg.studentFields || []).forEach((f) => { studentData[f] = cols[colIdx] || ""; colIdx++; });
      await db.collection("members").add(studentData);
    }
    for (let i = 0; i < (cfg.teacherCount || 0); i++) {
      let teacherData = { teamId, compId, role: "教練", seq: i + 1 };
      (cfg.teacherFields || []).forEach((f) => { teacherData[f] = cols[colIdx] || ""; colIdx++; });
      await db.collection("members").add(teacherData);
    }
    imported++;
  }
  // Update teamCount counter
  if (imported > 0) {
    await db.collection("competitions").doc(compId).update({ teamCount: FieldValue.increment(imported) });
  }
  return { success: true, message: "imported " + imported + " teams" + (errors.length ? ", errors: " + errors.length : "") };
});

exports.updateTeamStatus = compAuthCallable(async (data, request) => {
  const { teamId, newStatus } = data;
  
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) return { success: false, message: "Team not found" };
  const team = teamDoc.data();
  const oldStatus = team.status || "";
  const compId = team.compId;
  
  const compDoc = await db.collection("competitions").doc(compId).get();
  const comp = compDoc.exists ? compDoc.data() : {};
  const compName = comp.name || "競賽活動";
  const cfg = comp.config || {};

  await db.collection("teams").doc(teamId).update({ status: newStatus });
  await auditLog(request.authUser.username, "status change", teamId, oldStatus + " → " + newStatus);
  
  // MISS-02: Adjust teamCount when status changes to/from "已取消"
  if (oldStatus !== "已取消" && newStatus === "已取消" && compId) {
    await db.collection("competitions").doc(compId).update({ teamCount: FieldValue.increment(-1) });
  } else if (oldStatus === "已取消" && newStatus !== "已取消" && compId) {
    await db.collection("competitions").doc(compId).update({ teamCount: FieldValue.increment(1) });
  }
  
  // ==========================================
  // 【修改】：狀態更新自動發信邏輯 (加入開關判斷)
  // ==========================================
  if (cfg.autoEmailNotification !== false) {
    const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
    const emailList = [...new Set(memSnap.docs.map(d => d.data().email).filter(e => e))];
    
    if (emailList.length > 0) {
      const subject = `[RegMaster] 隊伍狀態更新通知 - ${compName}`;
      const statusBody = `
        <p style="font-size:16px;line-height:1.6;margin-top:0">您好，您在 <b>${compName}</b> 的隊伍狀態已更新。</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0;text-align:center">
          <p style="margin:0 0 8px;font-size:14px;color:#64748b">報名編號</p>
          <p style="margin:0 0 16px;font-size:20px;color:#0A437A;font-weight:900;font-family:monospace">${teamId}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#64748b">最新狀態</p>
          <span style="background:#ecfdf5;border:1px solid #10b981;color:#10b981;padding:6px 18px;border-radius:8px;font-weight:bold;font-size:16px">${newStatus}</span>
        </div>
        <p style="font-size:14px;color:#475569">若有任何問題，請隨時留意活動頁面的最新公告。</p>`;
      const htmlBody = emailWrap('🔔 隊伍狀態已更新', statusBody,
        `<a href="${EMAIL_HOST}/?comp=${compId}" style="color:#0A437A;font-weight:600">🔙 返回活動頁面</a>`);
      
      await db.collection("mail").add({
        to: emailList,
        message: { subject: subject, html: htmlBody, text: `您在${compName}的隊伍(${teamId})狀態已更新為：${newStatus}` }
      });
    }
  }
  
  return { success: true };
});

// ===== Clear Audit Logs =====
exports.clearAuditLogs = authCallable(["system"], async () => {
  let totalDeleted = 0;
  const batchSize = 400;
  let hasMore = true;
  while (hasMore) {
    const snap = await db.collection("auditLogs").limit(batchSize).get();
    if (snap.empty) { hasMore = false; break; }
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snap.docs.length;
    if (snap.docs.length < batchSize) hasMore = false;
  }
  return { success: true, deleted: totalDeleted };
});

// ===== Upload Poster Image =====
exports.uploadPosterImage = compAuthCallable(async (data, request) => {
  const { compId, base64Data, fileName, mimeType } = data;
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "not found" };
  const oldData = doc.data();
  if (oldData.posterDocId) {
    try { await db.collection("posterFiles").doc(oldData.posterDocId).delete(); } catch(e) {}
  }
  /* Store full base64 in posterFiles (Firestore 1MB doc limit ≈ 900KB base64 safe) */
  const posterRef = db.collection("posterFiles").doc();
  const storedData = base64Data.substring(0, 900000);
  await posterRef.set({
    compId, fileName, mimeType: mimeType || "image/png",
    data: storedData, createdAt: fmtNow()
  });
  /* Config stores a small reference, NOT a huge data URI */
  const posterUrl = "pfid:" + posterRef.id;
  const cfg = oldData.config || {};
  cfg.posterUrl = posterUrl;
  await ref.update({ posterDocId: posterRef.id, config: cfg });
  await auditLog(request.authUser.username, "upload poster", compId, fileName);
  /* Return full data URI for immediate display */
  const fullUrl = "data:" + (mimeType || "image/png") + ";base64," + storedData;
  return { success: true, posterDocId: posterRef.id, posterUrl: fullUrl };
});

/* Fetch full poster image from posterFiles */
exports.getPosterData = callable(async (data) => {
  const { compId } = data;
  const doc = await db.collection("competitions").doc(compId).get();
  if (!doc.exists) return { success: false };
  const posterDocId = doc.data().posterDocId;
  if (!posterDocId) return { success: false };
  const pDoc = await db.collection("posterFiles").doc(posterDocId).get();
  if (!pDoc.exists) return { success: false };
  const p = pDoc.data();
  return { success: true, dataUri: "data:" + (p.mimeType || "image/png") + ";base64," + (p.data || "") };
});

// ===== Delete Poster Image =====
exports.deletePosterImage = compAuthCallable(async (data, request) => {
  const { compId } = data;
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "活動不存在" };

  const oldData = doc.data();
  const posterDocId = oldData.posterDocId;

  /* Delete poster document from posterFiles collection */
  if (posterDocId) {
    try { await db.collection("posterFiles").doc(posterDocId).delete(); } catch(e) {}
  }

  /* Clear poster references in competition document */
  const cfg = oldData.config || {};
  cfg.posterUrl = "";
  await ref.update({ posterDocId: "", config: cfg });

  await auditLog(request.authUser.username, "delete poster", compId, "posterDocId: " + (posterDocId || ""));
  return { success: true };
});

// ===== Delete Rules PDF =====
exports.deleteRulesPdf = compAuthCallable(async (data, request) => {
  const { compId } = data;
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "活動不存在" };

  const oldData = doc.data();
  const pdfDocId = oldData.pdfDocId;

  /* Delete PDF main doc + all chunks from pdfFiles collection */
  if (pdfDocId) {
    try {
      const chunks = await db.collection("pdfFiles").where("parentId", "==", pdfDocId).get();
      const batch = db.batch();
      chunks.docs.forEach(d => batch.delete(d.ref));
      batch.delete(db.collection("pdfFiles").doc(pdfDocId));
      await batch.commit();
    } catch(e) {}
  }

  /* Clear PDF references and extracted text in competition document */
  await ref.update({ rulesPdfId: "", pdfDocId: "", rulesText: "" });

  await auditLog(request.authUser.username, "delete rules pdf", compId, "pdfDocId: " + (pdfDocId || ""));
  return { success: true };
});

// ===== Duplicate Competition =====
exports.duplicateCompetition = compAuthCallable(async (data, request) => {
  const { compId, newName } = data;
  const creator = request.authUser.username;
  // V-12: enforce the plan's max-active-events limit on duplication too (previously only
  // checked in createCompetition, so 複製活動 could bypass the quota).
  if (request.authUser.role !== "system") {
    const tier = await getEffectiveTier(creator);
    const lim = await planLimits(tier);
    if (lim.maxActiveEvents !== Infinity) {
      const existing = await db.collection("competitions").where("creator", "==", creator).get();
      if (existing.size >= lim.maxActiveEvents) {
        return { success: false, message: "您的方案（" + tierLabel(tier) + "）最多可擁有 " + lim.maxActiveEvents + " 個活動（含報名中／未開始／已截止／已結束等所有狀態），目前已有 " + existing.size + " 個。請刪除舊活動或升級方案。" };
      }
    }
  }
  const src = await db.collection("competitions").doc(compId).get();
  if (!src.exists) return { success: false, message: "not found" };
  const srcData = src.data();
  const cfg = JSON.parse(JSON.stringify(srcData.config || {}));
  cfg.isOpen = false;
  const newId = "C" + Date.now() + crypto.randomInt(1000);
  await db.collection("competitions").doc(newId).set({
    name: newName || ((srcData.name || "") + " (副本)"),
    category: srcData.category || "", config: cfg,
    isOpen: false, isVisible: false,
    deadline: "", maxTeams: srcData.maxTeams || 0,
    creator: creator || srcData.creator || "",
    rulesPdfId: "", rulesText: srcData.rulesText || "",
    themeColors: srcData.themeColors || "", createdAt: fmtNow(),
    teamCount: 0
  });
  const annSnap = await db.collection("announcements").where("compId", "==", compId).get();
  for (const d of annSnap.docs) { await db.collection("announcements").add({ ...d.data(), compId: newId }); }
  await auditLog(creator || "", "複製活動", newId, "from " + compId);
  return { success: true, compId: newId };
});

// ===== QR Code Check-in =====
exports.checkInTeam = compAuthCallable("checkin", async (data, request) => {
  await requireCompFeature(request, "checkin");
  const { teamId } = data;
  if (!teamId) return { success: false, message: "missing teamId" };
  const ref = db.collection("teams").doc(teamId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "找不到此報名編號 / Registration ID not found" };
  const t = doc.data();
  if (t.checkedIn) return { success: false, message: "已報到 / Already checked in", alreadyCheckedIn: true, time: t.checkedInAt || "" };
  await ref.update({ checkedIn: true, checkedInAt: fmtNow(), checkedInBy: request.authUser.username });
  await auditLog(request.authUser.username, "check-in", teamId, t.teamNameCN || "");
  /* Fetch member names for display */
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  const students = [], teachers = [];
  memSnap.docs.forEach(d => {
    const m = d.data();
    const name = m.chineseName || m.englishName || "";
    if (m.role === "學生") students.push(name);
    else teachers.push(name);
  });
  return {
    success: true, teamId: t.teamId, teamNameCN: t.teamNameCN || "", teamNameEN: t.teamNameEN || "",
    group: t.group || "", students, teachers,
    message: "報到成功 / Check-in successful"
  };
});

// ===== PAYUNi Payment Integration =====
const { onRequest } = require("firebase-functions/v2/https");

function payuniEncrypt(params, key, iv) {
  const qs = Object.entries(params).map(([k,v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  let enc = cipher.update(qs, "utf8", "base64");
  enc += cipher.final("base64");
  const tag = cipher.getAuthTag().toString("base64");
  return Buffer.from(enc + ":::" + tag, "utf8").toString("hex");
}
function payuniDecrypt(hexStr, key, iv) {
  const raw = Buffer.from(hexStr, "hex").toString("utf8");
  const [encData, tagB64] = raw.split(":::");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  let dec = decipher.update(encData, "base64", "utf8");
  dec += decipher.final("utf8");
  const result = {};
  new URLSearchParams(dec).forEach((v, k) => { result[k] = v; });
  return result;
}
function payuniHash(encStr, key, iv) {
  return crypto.createHash("sha256").update(key + encStr + iv).digest("hex").toUpperCase();
}

// C-9: actively query PayUNI for an order's TRUE status (二次查詢) — defense-in-depth on the
// notify webhook + a recovery path if a notification is ever missed. Returns
// { verdict:'paid'|'notpaid'|'unknown', tradeNo }. NEVER throws and is fail-open: any error,
// missing record, pending, or unparseable response → 'unknown' so a real payment is never blocked.
async function payuniInquiry(orderId, creds) {
  try {
    if (!orderId || !creds || !creds.merID || !creds.key || !creds.iv) return { verdict: "unknown", tradeNo: "" };
    const enc = payuniEncrypt({ MerID: creds.merID, MerTradeNo: orderId, Timestamp: Math.floor(Date.now() / 1000) }, creds.key, creds.iv);
    const hash = payuniHash(enc, creds.key, creds.iv);
    const prefix = creds.mode === "t" ? "https://sandbox-" : "https://";
    const resp = await fetch(prefix + "api.payuni.com.tw/api/trade/query", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ MerID: creds.merID, Version: "1.0", EncryptInfo: enc, HashInfo: hash })
    });
    if (!resp.ok) return { verdict: "unknown", tradeNo: "" };
    const json = await resp.json().catch(() => null);
    if (!json) return { verdict: "unknown", tradeNo: "" };
    let rec = {};
    if (json.EncryptInfo) { try { rec = payuniDecrypt(json.EncryptInfo, creds.key, creds.iv); } catch (e) { return { verdict: "unknown", tradeNo: "" }; } }
    const tradeNo = rec.TradeNo || "";
    const tradeStatus = (rec.TradeStatus != null) ? String(rec.TradeStatus) : "";
    // PayUNI 整合金流：TradeStatus "1" = 交易成功。只有明確的 "1" 才算已付款（最保守，絕不誤判）。
    if (tradeStatus === "1") return { verdict: "paid", tradeNo };
    // 明確的終態失敗碼才視為未付款（供 webhook 記錄矛盾用，不阻擋）。其餘（待付款/查無/無法解析）一律 unknown。
    if (tradeStatus === "2" || tradeStatus === "3" || tradeStatus === "9") return { verdict: "notpaid", tradeNo };
    return { verdict: "unknown", tradeNo };
  } catch (e) { return { verdict: "unknown", tradeNo: "" }; }
}

// 帳務重構 S4：取得某訂單對應的 PayUNI 金鑰（須與原始扣款同一把：comp 或 sales）。
async function resolvePayuniCreds(order) {
  if (order.payuniKeySource === "comp" && order.compId) {
    const c = await db.collection("competitions").doc(order.compId).get();
    const cfg = c.exists ? (c.data().config || {}) : {};
    if (cfg.payuniHashKey && cfg.payuniHashIV) return { merID: cfg.payuniMerID, key: cfg.payuniHashKey, iv: cfg.payuniHashIV, mode: cfg.payuniMode };
  }
  const s = await db.collection("config").doc("sales").get();
  const sales = s.exists ? s.data() : {};
  return { merID: sales.payuniMerID, key: sales.payuniHashKey, iv: sales.payuniHashIV, mode: sales.payuniMode };
}
// 信用卡退刷（trade_close, CloseType=2）。部分退帶 TradeAmt（一次付清/國外卡支援；分期/銀聯僅全額，
// 由 PayUNI 端把關，失敗則回錯誤訊息）。回 { ok, tradeNo, message, code }。
async function payuniRefund(order, refundAmt) {
  const creds = await resolvePayuniCreds(order);
  if (!creds.merID || !creds.key || !creds.iv) return { ok: false, message: "金流金鑰未設定" };
  if (!order.payuniTradeNo) return { ok: false, message: "缺少 PayUNI 交易序號(TradeNo)" };
  const info = { MerID: creds.merID, TradeNo: order.payuniTradeNo, Timestamp: Math.floor(Date.now() / 1000), CloseType: 2, TradeAmt: Math.round(refundAmt) };
  const enc = payuniEncrypt(info, creds.key, creds.iv);
  const hash = payuniHash(enc, creds.key, creds.iv);
  const prefix = creds.mode === "t" ? "https://sandbox-" : "https://";
  let resp;
  try {
    resp = await fetch(prefix + "api.payuni.com.tw/api/trade/close", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "user-agent": "payuni" },
      body: new URLSearchParams({ MerID: creds.merID, Version: "1.0", EncryptInfo: enc, HashInfo: hash })
    });
  } catch (e) { return { ok: false, message: "PayUNI 連線失敗：" + (e && e.message) }; }
  if (!resp.ok) return { ok: false, message: "PayUNI HTTP " + resp.status };
  const json = await resp.json().catch(() => null);
  if (!json) return { ok: false, message: "PayUNI 回應無法解析" };
  let inner = {};
  if (json.EncryptInfo) { try { inner = payuniDecrypt(json.EncryptInfo, creds.key, creds.iv); } catch (e) { return { ok: false, message: "PayUNI 回應解密失敗" }; } }
  const status = inner.Status || json.Status || "";
  if (status === "SUCCESS") return { ok: true, tradeNo: inner.TradeNo || order.payuniTradeNo, message: inner.Message || "SUCCESS", raw: inner };
  return { ok: false, message: (inner.Message || json.Message || status || "退刷失敗"), code: status, raw: inner };
}

// Activation logic for a PLAN/licence order — single source of truth shared by the webhook
// (exports.payuniNotify) and the reconcile callable. Idempotent: no-op if already paid.
async function activatePlanOrderPaid(orderRef, order, orderId, tradeNo) {
  if (order.status === "paid") return false;
  /* Create licenses. Tier purchases are bound + activated to the buyer
     immediately (no manual code entry); legacy items stay unactivated. */
  const codes = [];
  const codeDetails = [];
  const mkCode = () => "RM-" + [1,2,3,4].map(() => {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () => c[crypto.randomInt(c.length)]).join("");
  }).join("-");
  for (const item of (order.items || [])) {
    const code = mkCode();
    if (item.type === "tier") {
      const years = parseInt(item.years, 10) || 1;
      const exp = new Date(); exp.setFullYear(exp.getFullYear() + years);
      await db.collection("licenses").doc(code).set({
        code, type: "subscription", tier: item.tier, years,
        status: "已啟用", activatedBy: order.username, activatedAt: fmtNow(),
        expiresAt: exp.toISOString(), createdAt: fmtNow(),
        orderId, purchasedBy: order.username
      });
      codes.push(code);
      codeDetails.push({ code, type: "tier", desc: tierLabel(item.tier) + " " + years + " 年（已綁定）" });
    } else {
      const licType = item.type === "count" ? "count" : "subscription";
      await db.collection("licenses").doc(code).set({
        code, type: licType, status: "未啟用",
        maxCount: item.type === "count" ? item.qty : 0, usedCount: 0,
        years: item.type === "subscription" ? item.qty : 0,
        durationMonths: item.type === "subscription" ? item.qty * 12 : 0,
        createdAt: fmtNow(), activatedBy: "", activatedAt: "",
        orderId, purchasedBy: order.username
      });
      codes.push(code);
      codeDetails.push({ code, type: licType, desc: item.type === "count" ? item.qty + " 次" : item.qty + " 年" });
    }
  }
  await orderRef.update({ status: "paid", paidAt: fmtNow(), payuniTradeNo: tradeNo || "", licenseCodes: codes });

  /* Use coupon */
  if (order.couponCode) {
    const cSnap = await db.collection("coupons").where("code", "==", order.couponCode).limit(1).get();
    if (!cSnap.empty) await cSnap.docs[0].ref.update({ usedCount: FieldValue.increment(1) });
  }

  /* Send email to purchaser */
  if (order.username) {
    const userSnap = await db.collection("accounts").where("username", "==", order.username).limit(1).get();
    if (!userSnap.empty) {
      const userEmail = (userSnap.docs[0].data().email) || "";
      if (userEmail) {
        const anyTier = codeDetails.some(d => d.type === "tier");
        let codesHtml = codeDetails.map(d =>
          `<div style="background:#E8F0F8;padding:14px 18px;border-radius:10px;margin:8px 0;font-family:monospace;font-size:18px;font-weight:700;color:#0A437A;letter-spacing:1px;text-align:center">${d.code}<br><span style="font-size:13px;font-weight:400;color:#475569">${d.type === "tier" ? d.desc : (d.type === "count" ? "次數授權 " + d.desc : "訂閱授權 " + d.desc)}</span></div>`
        ).join("");
        const emailHtml = `
          <div style="font-family:'Noto Sans TC',sans-serif;max-width:540px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#062845,#0A437A);padding:24px;border-radius:14px 14px 0 0;text-align:center">
              <h1 style="color:#fff;font-size:22px;margin:0">🎉 購買成功！</h1>
              <p style="color:rgba(255,255,255,.6);font-size:13px;margin:4px 0 0">RegMaster 授權碼已產生</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px">
              <p style="font-size:15px;color:#1e293b">感謝您的購買！以下是您的訂單明細：</p>
              ${codesHtml}
              <p style="font-size:14px;color:#475569;margin-top:16px">${anyTier
                ? '您的方案已自動啟用，登入 <a href="' + PROJECT_HOST + '" style="color:#0A437A;font-weight:600">RegMaster</a> 即可使用（上方代碼供您留存）。'
                : '請登入 <a href="' + PROJECT_HOST + '" style="color:#0A437A;font-weight:600">RegMaster</a> 管理介面，點擊「方案與授權」輸入上述代碼即可啟用。'}</p>
              <p style="font-size:13px;color:#94a3b8;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:12px">訂單編號：${orderId}<br>付款金額：NT$${order.total}</p>
            </div>
          </div>`;
        await db.collection("mail").add({
          to: [userEmail],
          message: { subject: "🎉 [RegMaster] 授權碼購買成功通知 — 訂單 " + orderId, html: emailHtml, text: "您的授權碼：" + codes.join(", ") }
        });
      }
    }
  }
  await auditLog("system", "payment_success", orderId, codes.join(","));
  return true;
}

// Activation logic for a REGISTRATION-fee payment — shared by the webhook (payuniRegNotify)
// and the reconcile callable. Idempotent: no-op if already paid.
async function activateRegPaymentPaid(orderRef, order, orderId, compId, tradeNo) {
  if (order.status === "paid") return false;
  // 帳務重構 S1: paid 訂單帶入正交狀態（payoutState 可提領 / refundState 無退費）
  await orderRef.update({ status: "paid", paidAt: fmtNow(), payuniTradeNo: tradeNo || "", payoutState: "available", refundState: "none" });
  /* Auto-confirm team payment — 不覆寫 paymentMethod（保留報名時選的 "payuni"），
     付款已由 paymentStatus「已確認(線上付款)」表達，使付款方式欄一致顯示「信用卡（PayUNI）」。 */
  await db.collection("teams").doc(order.teamId).update({
    paymentStatus: "已確認 (線上付款) " + fmtNow(),
    regPaymentId: orderId
  });
  /* Item 10: consume the discount code now that payment succeeded */
  if (order.discountCode) {
    try { await db.collection("discountCodes").doc(compId + "_" + order.discountCode).update({ usedCount: FieldValue.increment(1) }); } catch (e) {}
  }
  await auditLog("system", "線上付款成功", order.teamId, "PAYUNi " + orderId);

  /* Send confirmation email */
  const compDoc = await db.collection("competitions").doc(compId).get();
  const compCfg = compDoc.exists ? (compDoc.data().config || {}) : {};
  if (compCfg.autoEmailNotification !== false) {
    const memSnap = await db.collection("members").where("teamId", "==", order.teamId).get();
    const emails = [...new Set(memSnap.docs.map(d => d.data().email).filter(e => e))];
    if (emails.length) {
      await db.collection("mail").add({
        to: emails,
        message: {
          subject: `[RegMaster] 付款成功通知 - ${compCfg.competitionName || ""}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#065f46">✅ 付款成功！</h2>
            <p>您的報名編號 <b>${order.teamId}</b> 已完成線上付款。</p>
            <p>活動：${compCfg.competitionName || ""}</p>
            <p>金額：NT$${order.amount}</p>
            <p style="color:#475569;font-size:13px;margin-top:20px">此為系統自動通知，請勿直接回覆。</p></div>`,
          text: `付款成功！報名編號 ${order.teamId}，金額 NT$${order.amount}`
        }
      });
    }
  }
  // Notify the organiser of a received payment (honors notifPrefs.email.paymentReceived). Best-effort.
  await notifyOrganizer(compId, "paymentReceived",
    `[RegMaster] 收到報名費 — ${compCfg.competitionName || ""}`,
    emailWrap("💰 收到一筆報名費", `<p>活動「<b>${escMail(compCfg.competitionName || "")}</b>」收到線上付款。</p>
      <p>報名編號：<b>${escMail(order.teamId)}</b><br>金額：NT$${Number(order.amount) || 0}</p>`));
  return true;
}

// --- Sales Config ---
exports.getSalesConfig = authCallable(["system","competition"], async (data, request) => {
  const doc = await db.collection("config").doc("sales").get();
  const cfg = doc.exists ? doc.data() : { singlePrice: 500, yearlyPrice: 3000, taxRate: 5, bulkDiscounts: [], payuniMerID: "", payuniHashKey: "", payuniHashIV: "", payuniMode: "t" };
  const plans = await getPlans();
  if (request.authUser.role === "competition") {
    // Organizers see the plan matrix (prices/fees/limits/features to upgrade) but never
    // the PayUni secrets. Flat fields are derived from `plans` for backward compatibility.
    return {
      plans,
      starterPrice: plans.starter.price, proPrice: plans.pro.price, teamPrice: plans.team.price,
      singlePrice: cfg.singlePrice, yearlyPrice: cfg.yearlyPrice,
      taxRate: cfg.taxRate, bulkDiscounts: cfg.bulkDiscounts || [],
      payuniFeeByTier: { free: plans.free.feePct, starter: plans.starter.feePct, pro: plans.pro.feePct, team: plans.team.feePct },
      payoutCycle: cfg.payoutCycle || "weekly"
    };
  }
  // SECURITY (M-3): never ship the PayUni signing secrets to the browser. Return masked
  // "is-set" flags instead; the form shows a placeholder and only re-sends a value when the
  // admin actually types a new one (saveSalesConfig preserves the stored secret on empty).
  const safe = { ...cfg, plans };
  safe.payuniHashKeySet = !!cfg.payuniHashKey;
  safe.payuniHashIVSet = !!cfg.payuniHashIV;
  delete safe.payuniHashKey;
  delete safe.payuniHashIV;
  return safe;
});

// Public (no-auth) plan matrix for the landing pages — prices/fees/limits/features only,
// never any keys or internal config.
exports.getPublicPlans = callable(async () => {
  const plans = await getPlans();
  const safe = {};
  for (const t of ["free","starter","pro","team"]) {
    const p = plans[t];
    safe[t] = { price: p.price, feePct: p.feePct, maxActiveEvents: p.maxActiveEvents, maxCapacity: p.maxCapacity, name: p.name || null, tagline: p.tagline || null, features: { ...p.features } };
  }
  return { plans: safe };
});

// The caller's own resolved plan (tier + limits + features) — used by edit.html to
// validate capacity inputs and gate per-activity toggles (活動 AI、允許候補).
exports.getMyPlan = authCallable(["system", "competition"], async (data, request) => {
  const tier = request.authUser.role === "system" ? "team" : await getEffectiveTier(request.authUser.username);
  const plans = await getPlans();
  const p = plans[tier] || plans.free;
  return {
    tier,
    maxActiveEvents: p.maxActiveEvents,   // 0 = 無限
    maxCapacity: p.maxCapacity,           // 0 = 無限
    feePct: (typeof p.feePct === "number") ? p.feePct : 0,   // UX-004: 線上付款託收 %
    features: Object.assign({}, p.features)
  };
});

// Fair upgrade proration: 應補差額 = 新方案價 − 目前方案價 ×(剩餘天數 ÷ 365)，
// 付款日起重新計算 365 天。Free→付費 = 全額。回傳金額為「直接收費」(已含稅、不另加稅)。
async function computeUpgradeQuote(username, newTier) {
  newTier = String(newTier || "").toLowerCase();
  if (!VALID_TIERS.includes(newTier)) return null;
  const plans = await getPlans();
  const newPrice = parseInt(plans[newTier] && plans[newTier].price, 10) || 0;
  const curTier = await getEffectiveTier(username);
  const curRank = TIER_RANK[curTier] || 0;
  const newRank = TIER_RANK[newTier] || 0;
  const curPrice = parseInt(plans[curTier] && plans[curTier].price, 10) || 0;
  // Remaining days of the buyer's current active subscription (clamped 0–365).
  let remainingDays = 0;
  if (curRank > 0) {
    const snap = await db.collection("licenses").where("activatedBy", "==", username).get();
    const now = Date.now();
    snap.docs.forEach(d => {
      const l = d.data();
      const type = (l.type || "").toLowerCase();
      const isSub = type === "subscription" || (!type && l.years > 0);
      if (isSub && l.status === "已啟用" && l.expiresAt) {
        const t = new Date(l.expiresAt).getTime();
        if (!isNaN(t) && t > now) { const dd = Math.ceil((t - now) / 86400000); if (dd > remainingDays) remainingDays = dd; }
      }
    });
    if (remainingDays > 365) remainingDays = 365;
  }
  const isUpgrade = newRank > curRank && curRank > 0;
  const credit = isUpgrade ? Math.round(curPrice * remainingDays / 365) : 0;
  const amount = Math.max(0, newPrice - credit);
  return { currentTier: curTier, newTier, newPrice, curPrice, remainingDays, credit, amount, isUpgrade, canBuy: newRank > curRank };
}

// Upgrade quotes for every tier above the caller's current tier — drives license.html.
exports.getUpgradeOptions = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const curTier = request.authUser.role === "system" ? "team" : await getEffectiveTier(username);
  const options = [];
  for (const t of VALID_TIERS) {
    const q = await computeUpgradeQuote(username, t);
    if (q) options.push(q);
  }
  return { currentTier: curTier, options };
});

exports.saveSalesConfig = authCallable(["system"], async (data) => {
  const config = data.config || {};
  // Validate the plan matrix if present (price≥0 int, feePct 0–100, limits≥0 int, features boolean).
  if (config.plans && typeof config.plans === "object") {
    for (const t of ["free","starter","pro","team"]) {
      const p = config.plans[t];
      if (!p || typeof p !== "object") continue;
      if (p.price !== undefined) { const v = Number(p.price); if (!Number.isFinite(v) || v < 0) return { success: false, message: t + " 年費需為 ≥0 的數字" }; p.price = Math.round(v); }
      if (p.feePct !== undefined) { const v = Number(p.feePct); if (!Number.isFinite(v) || v < 0 || v > 100) return { success: false, message: t + " 手續費需為 0–100" }; p.feePct = v; }
      if (p.maxActiveEvents !== undefined) { const v = Number(p.maxActiveEvents); if (!Number.isFinite(v) || v < 0) return { success: false, message: t + " 活動數需為 ≥0 整數" }; p.maxActiveEvents = Math.round(v); }
      if (p.maxCapacity !== undefined) { const v = Number(p.maxCapacity); if (!Number.isFinite(v) || v < 0) return { success: false, message: t + " 名額需為 ≥0 整數" }; p.maxCapacity = Math.round(v); }
      if (p.features && typeof p.features === "object") {
        for (const k of Object.keys(p.features)) p.features[k] = (p.features[k] === true);
      }
    }
  }
  // SECURITY (M-3): the form sends an empty HashKey/HashIV when the admin left the masked
  // field untouched. Drop empties before the merge so a blank field PRESERVES the stored
  // secret instead of wiping it. (Empty MerID/Mode are still allowed to clear those.)
  if (!config.payuniHashKey) delete config.payuniHashKey;
  if (!config.payuniHashIV) delete config.payuniHashIV;
  await db.collection("config").doc("sales").set(config, { merge: true });
  return { success: true };
});

// --- Coupon CRUD ---
exports.createCoupon = authCallable(["system"], async (data) => {
  const { code, type, value, maxUses, expiresAt } = data;
  if (!code || !type) return { success: false, message: "missing fields" };
  const id = "CPN" + Date.now();
  await db.collection("coupons").doc(id).set({ code: code.toUpperCase(), type, value: Number(value) || 0, maxUses: Number(maxUses) || 0, usedCount: 0, expiresAt: expiresAt || "", active: true, createdAt: fmtNow() });
  return { success: true, id };
});
exports.listCoupons = authCallable(["system"], async () => {
  const snap = await db.collection("coupons").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});
exports.deleteCoupon = authCallable(["system"], async (data) => {
  await db.collection("coupons").doc(data.id).delete();
  return { success: true };
});
exports.validateCoupon = callable(async (data) => {
  const { code } = data;
  const snap = await db.collection("coupons").where("code", "==", (code || "").toUpperCase()).where("active", "==", true).limit(1).get();
  if (snap.empty) return { success: false, message: "無效優惠券" };
  const c = snap.docs[0].data();
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { success: false, message: "優惠券已用完" };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { success: false, message: "優惠券已過期" };
  return { success: true, coupon: { type: c.type, value: c.value, code: c.code } };
});

// --- Order + PAYUNi ---
exports.createPayuniOrder = authCallable(["system", "competition"], async (data, request) => {
  // N-3 fix: require auth and derive the buyer from the session — never trust a body `username`
  // (which previously let anyone create plan orders for arbitrary accounts / enumerate tiers).
  const { items, couponCode } = data;
  const username = request.authUser.username;
  const salesDoc = await db.collection("config").doc("sales").get();
  const sales = salesDoc.exists ? salesDoc.data() : {};
  if (!sales.payuniMerID || !sales.payuniHashKey) return { success: false, message: "金流尚未設定" };
  const plans = await getPlans();

  /* Calculate price */
  let subtotal = 0;
  let hasTier = false;
  const orderItems = [];
  for (const item of (items || [])) {
    if (item.type === "tier") {
      // Tiered subscription purchase — server computes the (prorated) amount; the price
      // charged is exactly this (tax-inclusive, no extra tax). Fresh 365 days on success.
      const tier = String(item.tier || "").toLowerCase();
      if (!VALID_TIERS.includes(tier)) continue;
      const q = await computeUpgradeQuote(username, tier);
      if (!q || !q.canBuy) return { success: false, message: "您目前的方案已等於或高於此方案，無法購買。" };
      if (q.newPrice <= 0) return { success: false, message: "此方案尚未設定價格，請聯絡系統管理員" };
      hasTier = true;
      orderItems.push({ type: "tier", tier, years: 1, unitPrice: q.amount, fullPrice: q.newPrice,
        credit: q.credit, upgradeFrom: q.currentTier, discount: 1, subtotal: q.amount });
      subtotal += q.amount;
    } else {
      // Legacy count/subscription items (deprecated)
      const qty = Math.min(Math.max(1, item.qty || 1), item.type === "count" ? 10 : 5);
      const unitPrice = item.type === "count" ? (sales.singlePrice || 500) : (sales.yearlyPrice || 3000);
      let disc = 1;
      for (const bd of (sales.bulkDiscounts || [])) {
        if (qty >= bd.qty) disc = Math.min(disc, bd.discount);
      }
      const sub = Math.round(qty * unitPrice * disc);
      orderItems.push({ type: item.type, qty, unitPrice, discount: disc, subtotal: sub });
      subtotal += sub;
    }
  }
  /* Coupon */
  let couponDiscount = 0;
  if (couponCode) {
    const cSnap = await db.collection("coupons").where("code", "==", couponCode.toUpperCase()).where("active", "==", true).limit(1).get();
    if (!cSnap.empty) {
      const c = cSnap.docs[0].data();
      if ((!c.maxUses || c.usedCount < c.maxUses) && (!c.expiresAt || new Date(c.expiresAt) >= new Date())) {
        if (c.type === "percent") couponDiscount = Math.round(subtotal * c.value / 100);
        else couponDiscount = Math.min(c.value, subtotal);
      }
    }
  }
  const taxRate = (sales.taxRate || 5) / 100;
  const afterDiscount = subtotal - couponDiscount;
  // Plan (tier) purchases are charged at the plan price directly — no extra tax.
  const tax = hasTier ? 0 : Math.round(afterDiscount * taxRate);
  const total = afterDiscount + tax;
  if (total < 1) return { success: false, message: "金額不正確" };
  
  const orderId = "RM" + Date.now() + crypto.randomInt(100);
  await db.collection("orders").doc(orderId).set({
    orderId, username, items: orderItems, subtotal, couponCode: couponCode || "", couponDiscount,
    taxRate: sales.taxRate || 5, tax, total, status: "pending", createdAt: fmtNow(), paidAt: ""
  });
  
  /* Build PAYUNi parameters */
  const hostUrl = PROJECT_HOST;
  const encryptInfo = {
    MerID: sales.payuniMerID,
    MerTradeNo: orderId,
    TradeAmt: String(total),
    Timestamp: String(Math.floor(Date.now() / 1000)),
    ProdDesc: "RegMaster " + orderItems.map(i => i.type === "tier" ? (tierLabel(i.tier) + "x" + i.years + "年") : (i.type === "count" ? "次數x" + i.qty : "訂閱x" + i.qty + "年")).join("+"),
    ReturnURL: hostUrl + "/payuni-return.html",
    NotifyURL: FUNCTIONS_BASE + "/payuniNotify",
    TradeType: "1",
    // Credit-card only — do not offer ATM / WebATM / CVS / barcode for plan purchases.
    Credit: "1"
  };
  const encStr = payuniEncrypt(encryptInfo, sales.payuniHashKey, sales.payuniHashIV);
  const hashStr = payuniHash(encStr, sales.payuniHashKey, sales.payuniHashIV);
  const prefix = sales.payuniMode === "t" ? "https://sandbox-" : "https://";
  
  return {
    success: true, orderId, total,
    payuni: { action: prefix + "api.payuni.com.tw/api/upp", MerID: sales.payuniMerID, Version: "1.0", EncryptInfo: encStr, HashInfo: hashStr }
  };
});

/* PAYUNi Notify (server-to-server callback) */
exports.payuniNotify = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  try {
    const salesDoc = await db.collection("config").doc("sales").get();
    const sales = salesDoc.exists ? salesDoc.data() : {};
    if (!sales.payuniHashKey) { res.status(400).send("not configured"); return; }
    
    const { EncryptInfo, HashInfo } = req.body;
    const chk = payuniHash(EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
    if (chk !== HashInfo) { res.status(400).send("hash mismatch"); return; }
    
    const info = payuniDecrypt(EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
    const orderId = info.MerTradeNo;
    const tradeStatus = info.Status;
    
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) { res.status(404).send("order not found"); return; }
    const order = orderDoc.data();
    
    if (tradeStatus === "SUCCESS" && order.status !== "paid") {
      // C-9: advisory 二次查詢 — NEVER blocks a real payment (the notify is already
      // AES-GCM-authenticated); only flags a contradiction on the order for manual review.
      try {
        const _inq = await payuniInquiry(orderId, { merID: sales.payuniMerID, key: sales.payuniHashKey, iv: sales.payuniHashIV, mode: sales.payuniMode });
        if (_inq.verdict === "notpaid") { console.error("[C-9] PayUNI inquiry contradicts SUCCESS notify (plan order)", orderId); await orderRef.update({ inquiryMismatch: true }).catch(() => {}); }
      } catch (e) {}
      await activatePlanOrderPaid(orderRef, order, orderId, info.TradeNo);
    }
    res.status(200).send("OK");
  } catch (e) {
    console.error("payuniNotify error:", e);
    res.status(500).send("error");
  }
});

exports.getOrderStatus = callable(async (data) => {
  const { orderId } = data;
  if (!orderId) return { status: "unknown" };
  const doc = await db.collection("orders").doc(orderId).get();
  if (!doc.exists) return { status: "unknown" };
  const o = doc.data();
  // N-2 hardening: only expose the order STATUS to this public poll. Previously it also returned
  // licenseCodes + total, which (paired with a guessable orderId) leaked purchased codes/amounts.
  return { status: o.status || "pending" };
});

// C-9 recovery: actively confirm a PLAN/licence order with PayUNI (二次查詢) and self-heal if a
// notify was missed. Safe to expose publicly — it only ever activates when PayUNI itself returns
// 'paid' (cannot be abused to fake a payment), and is idempotent. Frontends may poll this.
exports.reconcilePlanOrder = callable(async (data) => {
  const orderId = String((data && data.orderId) || "");
  if (!orderId) return { success: false, status: "unknown" };
  const orderRef = db.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) return { success: false, status: "unknown" };
  const order = orderDoc.data();
  if (order.status === "paid") return { success: true, status: "paid", licenseCodes: order.licenseCodes || [] };
  const salesDoc = await db.collection("config").doc("sales").get();
  const sales = salesDoc.exists ? salesDoc.data() : {};
  if (!sales.payuniHashKey || !sales.payuniHashIV) return { success: true, status: order.status || "pending" };
  const inq = await payuniInquiry(orderId, { merID: sales.payuniMerID, key: sales.payuniHashKey, iv: sales.payuniHashIV, mode: sales.payuniMode });
  if (inq.verdict === "paid") {
    await activatePlanOrderPaid(orderRef, order, orderId, inq.tradeNo);
    const fresh = await orderRef.get();
    return { success: true, status: "paid", licenseCodes: (fresh.exists && fresh.data().licenseCodes) || [] };
  }
  return { success: true, status: order.status || "pending", inquiry: inq.verdict };
});

// C-9 recovery: actively confirm a REGISTRATION-fee payment with PayUNI and self-heal if a notify
// was missed — so a registrant's payment is captured even when the webhook never arrived. Public +
// idempotent; only activates on a PayUNI-confirmed 'paid'. Tries system keys, then the activity's keys.
exports.reconcileRegPayment = callable(async (data) => {
  const orderId = String((data && data.orderId) || "");
  if (!orderId) return { success: false, status: "unknown" };
  const orderRef = db.collection("regPayments").doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) return { success: false, status: "unknown" };
  const order = orderDoc.data();
  if (order.status === "paid") return { success: true, status: "paid" };
  const compId = order.compId || "";
  // Candidate credentials: system-level sales keys first, then the activity's own keys.
  const creds = [];
  const salesDoc = await db.collection("config").doc("sales").get();
  const sales = salesDoc.exists ? salesDoc.data() : {};
  if (sales.payuniHashKey && sales.payuniHashIV) creds.push({ merID: sales.payuniMerID, key: sales.payuniHashKey, iv: sales.payuniHashIV, mode: sales.payuniMode });
  if (compId) {
    const cDoc = await db.collection("competitions").doc(compId).get();
    const cfg = cDoc.exists ? (cDoc.data().config || {}) : {};
    if (cfg.payuniHashKey && cfg.payuniHashIV) creds.push({ merID: cfg.payuniMerID, key: cfg.payuniHashKey, iv: cfg.payuniHashIV, mode: cfg.payuniMode });
  }
  for (const cr of creds) {
    const inq = await payuniInquiry(orderId, cr);
    if (inq.verdict === "paid") {
      await activateRegPaymentPaid(orderRef, order, orderId, compId, inq.tradeNo);
      return { success: true, status: "paid" };
    }
  }
  return { success: true, status: order.status || "pending" };
});

// ===== Production Reset: Clear all data except config + system admin =====
exports.productionReset = authCallable(["system"], async (data) => {
  const { confirmCode } = data;
  if (confirmCode !== "RESET-PRODUCTION-2026") return { success: false, message: "確認碼錯誤" };
  
  const collectionsToWipe = [
    "competitions", "teams", "members", "announcements", "emailTemplates",
    "emailLogs", "payments", "notifications", "scores", "posterFiles",
    "pdfFiles", "auditLogs", "licenses", "orders", "coupons", "mail",
    "accountRequests", "regPayments", "feedback", "feedbackFiles", "visitors"
  ];
  
  let totalDeleted = 0;
  for (const col of collectionsToWipe) {
    const snap = await db.collection(col).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += Math.min(400, snap.docs.length - i);
    }
  }
  
  /* Delete non-system accounts — batched to stay under Firestore 500 limit */
  const acctSnap = await db.collection("accounts").get();
  const toDelete = acctSnap.docs.filter(d => d.data().role !== "system");
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = db.batch();
    toDelete.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  const acctDeleted = toDelete.length;
  totalDeleted += acctDeleted;
  
  await auditLog("system", "production_reset", "", "deleted " + totalDeleted + " docs");
  return { success: true, message: "清除完成！共刪除 " + totalDeleted + " 筆資料。保留了系統設定與管理員帳號。" };
});

// ===== PAYUNi Registration Payment (活動管理者自己的金流) =====
// ===== Discounts (item 10): group-tier auto discounts + discount codes =====
// Pick the best (highest threshold met) group-discount tier for a given headcount.
function bestGroupDiscount(cfg, peopleCount) {
  const tiers = Array.isArray(cfg.groupDiscounts) ? cfg.groupDiscounts : [];
  let best = null;
  tiers.forEach(t => {
    const min = parseInt(t.minPeople, 10) || 0;
    if (peopleCount >= min && (!best || min > best.minPeople)) best = { minPeople: min, type: t.type, value: Number(t.value) || 0 };
  });
  return best;
}
// Apply a percent/amount discount to a base, clamped to [0, base].
function applyDisc(base, type, value) {
  if (!value || base <= 0) return 0;
  if (type === 'percent') return Math.min(base, Math.round(base * value / 100));
  return Math.min(base, Math.round(value));
}
// Server-authoritative price quote. Group discount is automatic; code is optional.
async function quoteRegistration(compId, peopleCount, code) {
  const compDoc = await db.collection("competitions").doc(compId).get();
  if (!compDoc.exists) return { ok: false, message: "找不到活動" };
  const cfg = compDoc.data().config || {};
  // P2: prefer cfg.registrationFee (already a sum from saveCompetitionConfig); for older
  // configs without it, derive from feeItems so the payable amount is never silently 0.
  let base = parseInt(cfg.registrationFee, 10) || 0;
  if (!base && Array.isArray(cfg.feeItems)) {
    base = cfg.feeItems.reduce((n, it) => n + (parseInt(it.amount, 10) || 0), 0);
  }
  let groupDiscount = 0, groupLabel = "";
  const g = bestGroupDiscount(cfg, peopleCount || 1);
  if (g) { groupDiscount = applyDisc(base, g.type, g.value); groupLabel = "團報優惠（滿 " + g.minPeople + " 人）"; }
  let codeDiscount = 0, codeValid = false, codeMsg = "", codeUp = "";
  if (code) {
    codeUp = String(code).toUpperCase();
    const cd = await db.collection("discountCodes").doc(compId + "_" + codeUp).get();
    if (!cd.exists) codeMsg = "折扣碼無效";
    else {
      const c = cd.data();
      if (c.active === false) codeMsg = "折扣碼已停用";
      else if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) codeMsg = "折扣碼已過期";
      else if ((parseInt(c.maxUses, 10) || 0) > 0 && (c.usedCount || 0) >= c.maxUses) codeMsg = "折扣碼已用完";
      else { codeDiscount = applyDisc(base - groupDiscount, c.type, c.value); codeValid = true; codeMsg = "已套用折扣碼"; }
    }
  }
  const total = Math.max(0, base - groupDiscount - codeDiscount);
  return { ok: true, base, groupDiscount, groupLabel, codeDiscount, codeValid, codeMsg, code: codeUp, total };
}

// Public: registrant previews the discounted total (does NOT consume the code).
// Counts the team's members server-side so the group discount is accurate.
exports.validateDiscountCode = callable(async (data) => {
  let peopleCount = parseInt(data.peopleCount, 10) || 1;
  if (data.teamId) {
    try { const ms = await db.collection("members").where("teamId", "==", data.teamId).get(); if (ms.size) peopleCount = ms.size; } catch (e) {}
  }
  return await quoteRegistration(data.compId, peopleCount, data.code || "");
});

// Organizer: manage discount codes (codes live in their own collection for atomic usedCount).
exports.createDiscountCode = compAuthCallable(async (data, request) => {
  const { compId, code, type, value, maxUses, expiresAt, note } = data;
  if (!code || !/^[A-Za-z0-9_-]{2,20}$/.test(code)) return { success: false, message: "折扣碼格式：2–20 碼英數字（可含 - _）" };
  if (type !== 'percent' && type !== 'amount') return { success: false, message: "折扣類型錯誤" };
  if (!(Number(value) > 0)) return { success: false, message: "折扣值需大於 0" };
  const docId = compId + "_" + String(code).toUpperCase();
  const exist = await db.collection("discountCodes").doc(docId).get();
  if (exist.exists) return { success: false, message: "此折扣碼已存在" };
  await db.collection("discountCodes").doc(docId).set({
    compId, code: String(code).toUpperCase(), type, value: Number(value) || 0,
    maxUses: parseInt(maxUses, 10) || 0, usedCount: 0, active: true,
    expiresAt: expiresAt || "", note: note || "", createdAt: fmtNow()
  });
  await auditLog(request.authUser.username, "建立折扣碼", compId, String(code).toUpperCase());
  return { success: true };
});
exports.listDiscountCodes = compAuthCallable(async (data) => {
  const snap = await db.collection("discountCodes").where("compId", "==", data.compId).get();
  return snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
});
exports.deleteDiscountCode = compAuthCallable(async (data, request) => {
  await db.collection("discountCodes").doc(data.compId + "_" + String(data.code).toUpperCase()).delete();
  await auditLog(request.authUser.username, "刪除折扣碼", data.compId, String(data.code).toUpperCase());
  return { success: true };
});

exports.createRegistrationPayment = callable(async (data) => {
  const { compId, teamId } = data;
  const compDoc = await db.collection("competitions").doc(compId).get();
  if (!compDoc.exists) return { success: false, message: "找不到活動" };
  const cfg = compDoc.data().config || {};
  if (!cfg.payuniEnabled) return { success: false, message: "此活動未啟用線上付款" };

  // U2 fix: edit.html doesn't expose per-activity PayUNI keys (only the enable toggle), so
  // cfg.payuniMerID/payuniHashKey are almost always empty. Fall back to the system-level
  // sales config — same merchant credentials already used for license payments.
  let payMerID = cfg.payuniMerID || "";
  let payKey   = cfg.payuniHashKey || "";
  let payIV    = cfg.payuniHashIV || "";
  // payuniMode "" = 正式 (production), "t" = 測試 (sandbox). EMPTY STRING IS A VALID VALUE,
  // so we have to use a strict-undefined check instead of `||` — otherwise production
  // mode (saved as "") gets overridden by the sandbox fallback and PayUNI returns
  // "商店不存在" because the production MerID isn't registered in the sandbox.
  let payMode  = (cfg.payuniMode !== undefined && cfg.payuniMode !== null) ? cfg.payuniMode : null;
  if (!payMerID || !payKey || !payIV) {
    const salesDoc = await db.collection("config").doc("sales").get();
    const sales = salesDoc.exists ? salesDoc.data() : {};
    payMerID = payMerID || sales.payuniMerID || "";
    payKey   = payKey   || sales.payuniHashKey || "";
    payIV    = payIV    || sales.payuniHashIV || "";
    if (payMode === null) {
      // Take sales mode as-is — DO NOT collapse "" into a fallback.
      payMode = (sales.payuniMode !== undefined && sales.payuniMode !== null) ? sales.payuniMode : "";
    }
  }
  if (payMode === null) payMode = "";
  if (!payMerID || !payKey || !payIV) {
    return { success: false, message: "金流尚未設定（請洽系統管理員設定 PayUNI 商店代號與金鑰）" };
  }

  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) return { success: false, message: "找不到報名資料" };
  const team = teamDoc.data();

  // Item 10: server-authoritative total = base − group discount − code discount.
  const memSnap = await db.collection("members").where("teamId", "==", teamId).get();
  const peopleCount = memSnap.size || 1;
  const q = await quoteRegistration(compId, peopleCount, data.discountCode || "");
  if (data.discountCode && !q.codeValid) return { success: false, message: q.codeMsg || "折扣碼無效" };
  const fee = q.total;
  if ((q.base || 0) > 0 && fee < 1) {
    // Fully discounted → no online payment needed; mark paid + consume code.
    await db.collection("teams").doc(teamId).update({ paymentStatus: "已確認 (折扣全免) " + fmtNow(), paymentMethod: "discount" });
    if (q.codeValid && q.code) { try { await db.collection("discountCodes").doc(compId + "_" + q.code).update({ usedCount: FieldValue.increment(1) }); } catch (e) {} }
    return { success: true, freeAfterDiscount: true };
  }
  if (fee < 1) return { success: false, message: "報名費金額不正確" };

  const orderId = "RG" + Date.now() + crypto.randomInt(100);
  await db.collection("regPayments").doc(orderId).set({
    orderId, compId, teamId, amount: fee,
    base: q.base, groupDiscount: q.groupDiscount, codeDiscount: q.codeDiscount, discountCode: q.codeValid ? q.code : "",
    teamNameCN: team.teamNameCN || "", teamNameEN: team.teamNameEN || "",
    status: "pending", createdAt: fmtNow()
  });

  const hostUrl = PROJECT_HOST;
  // Persist the keyset used for this order so payuniRegNotify can verify the callback
  // (otherwise we'd have to iterate every competition's keyset to find the match).
  await db.collection("regPayments").doc(orderId).update({
    payuniMerID: payMerID, payuniKeySource: cfg.payuniMerID ? "comp" : "sales"
  });
  const encryptInfo = {
    MerID: payMerID,
    MerTradeNo: orderId,
    TradeAmt: String(fee),
    Timestamp: String(Math.floor(Date.now() / 1000)),
    // ASCII-only ProdDesc avoids any encoding gotcha; the orderId disambiguates per-team
    ProdDesc: "RegMaster Order " + orderId,
    ReturnURL: hostUrl + "/payuni-return.html",
    NotifyURL: FUNCTIONS_BASE + "/payuniRegNotify"
  };
  const encStr = payuniEncrypt(encryptInfo, payKey, payIV);
  const hashStr = payuniHash(encStr, payKey, payIV);
  const prefix = payMode === "t" ? "https://sandbox-" : "https://";

  // Diagnostic echo so the registrant page can show "正在前往 PayUNI（正式/沙箱 · 商店 ABC**）"
  // and we don't have to guess later why PayUNI rejected the call.
  const merMasked = payMerID.length > 4 ? payMerID.slice(0, 2) + '…' + payMerID.slice(-2) : '***';
  return {
    success: true, orderId,
    payuni: { action: prefix + "api.payuni.com.tw/api/upp", MerID: payMerID, Version: "1.0", EncryptInfo: encStr, HashInfo: hashStr },
    diagnostic: { mode: payMode === "t" ? "sandbox" : "production", merMasked, action: prefix + "api.payuni.com.tw/api/upp" }
  };
});

exports.payuniRegNotify = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  try {
    const { EncryptInfo, HashInfo } = req.body;
    let matched = null;

    // U2 fix: orders are now most often signed with the SYSTEM-LEVEL sales keys (because
    // edit.html doesn't expose per-activity keys), so try sales first, then fall back to
    // per-activity keys for any future per-activity merchant setup.
    const salesDoc = await db.collection("config").doc("sales").get();
    const sales = salesDoc.exists ? salesDoc.data() : {};
    if (sales.payuniHashKey && sales.payuniHashIV) {
      const chk = payuniHash(EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
      if (chk === HashInfo) {
        try {
          const info = payuniDecrypt(EncryptInfo, sales.payuniHashKey, sales.payuniHashIV);
          matched = { info, cfg: sales, compId: null };
        } catch (e) { /* fall through to per-comp scan */ }
      }
    }
    if (!matched) {
      /* Find by iterating competitions — MerTradeNo lives inside the encrypted payload */
      const compSnap = await db.collection("competitions").get();
      for (const comp of compSnap.docs) {
        const cfg = (comp.data().config || {});
        if (!cfg.payuniEnabled || !cfg.payuniHashKey) continue;
        const chk = payuniHash(EncryptInfo, cfg.payuniHashKey, cfg.payuniHashIV);
        if (chk === HashInfo) {
          try {
            const info = payuniDecrypt(EncryptInfo, cfg.payuniHashKey, cfg.payuniHashIV);
            matched = { info, cfg, compId: comp.id };
          } catch(e) { continue; }
          break;
        }
      }
    }
    if (!matched) { res.status(400).send("hash mismatch"); return; }

    const { info } = matched;
    const orderId = info.MerTradeNo;
    const tradeStatus = info.Status;

    const orderRef = db.collection("regPayments").doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) { res.status(404).send("order not found"); return; }
    const order = orderDoc.data();
    // N-1 fix: re-verify the callback was signed with THIS order's OWN merchant keyset. The
    // hash-matching loop above can match ANY competition's HashKey; without this binding an
    // attacker controlling one competition's key could forge "paid" on another competition's
    // order. We look up the keyset the order was created against and re-check the signature.
    {
      let expKey, expIV;
      if (order.payuniKeySource === "comp" && order.compId) {
        const cDoc = await db.collection("competitions").doc(order.compId).get();
        const ccfg = cDoc.exists ? (cDoc.data().config || {}) : {};
        expKey = ccfg.payuniHashKey; expIV = ccfg.payuniHashIV;
      } else {
        expKey = sales.payuniHashKey; expIV = sales.payuniHashIV;
      }
      if (!expKey || payuniHash(EncryptInfo, expKey, expIV) !== HashInfo) {
        console.error("[N-1] payuniRegNotify key/order mismatch:", orderId);
        res.status(400).send("key mismatch"); return;
      }
    }
    // compId for downstream collection writes (notifications, discount codes, etc.)
    const compId = matched.compId || order.compId;

    if (tradeStatus === "SUCCESS" && order.status !== "paid") {
      // C-9: advisory 二次查詢 — NEVER blocks a real payment; only flags a contradiction.
      try {
        const _c = matched.cfg || {};
        const _inq = await payuniInquiry(orderId, { merID: _c.payuniMerID, key: _c.payuniHashKey, iv: _c.payuniHashIV, mode: _c.payuniMode });
        if (_inq.verdict === "notpaid") { console.error("[C-9] PayUNI inquiry contradicts SUCCESS notify (reg payment)", orderId); await orderRef.update({ inquiryMismatch: true }).catch(() => {}); }
      } catch (e) {}
      await activateRegPaymentPaid(orderRef, order, orderId, compId, info.TradeNo);
    }
    res.status(200).send("OK");
  } catch (e) {
    console.error("payuniRegNotify error:", e);
    res.status(500).send("error");
  }
});

// ===== FF1: Billing / payouts to organisers =====
// Pulls every paid order (PayUNI or bank-transfer-confirmed) in the date range
// for one organiser, applies that organiser's tier-specific PayUNI fee %, and
// returns ready-to-display rows + an aggregate summary. The wire fee (NT$15) is
// only added to the final wire-out total — see markBillingAsRemitted.
exports.getOrganizerBilling = authCallable(["system", "competition"], async (data, request) => {
  const targetCreator = request.authUser.role === "system"
    ? (data.creator || null)
    : request.authUser.username;
  const fromDate = String(data.fromDate || "1970-01-01").slice(0, 10);
  const toDate   = String(data.toDate   || "9999-12-31").slice(0, 10);

  // Tier-specific fee % — read from the plan matrix (fallback to legacy payuniFeeByTier).
  const salesDoc = await db.collection("config").doc("sales").get();
  const feeByTier = (salesDoc.exists ? (salesDoc.data().payuniFeeByTier || {}) : {});
  const plans = await getPlans();
  const tierFeePct = (t) => (plans[t] && typeof plans[t].feePct === "number") ? plans[t].feePct : (parseFloat(feeByTier[t]) || 0);

  // Resolve the set of creators we report on.
  let creators;
  if (targetCreator) {
    creators = [targetCreator];
  } else {
    const accSnap = await db.collection("accounts").where("role", "==", "competition").get();
    creators = accSnap.docs.map(d => d.data().username);
  }

  const results = [];
  for (const creator of creators) {
    const tier = await getEffectiveTier(creator);
    const feePct = tierFeePct(tier);

    const compSnap = await db.collection("competitions").where("creator", "==", creator).get();
    const compMap = {};
    compSnap.docs.forEach(d => { compMap[d.id] = d.data(); });
    const compIds = Object.keys(compMap);
    if (!compIds.length) continue;

    const orders = [];
    let payuniGross = 0, feeTotal = 0, payuniNet = 0, atmNet = 0;

    for (const compId of compIds) {
      const compName = compMap[compId].name || (compMap[compId].config && compMap[compId].config.competitionName) || "";

      // PayUNI orders — keyed by paidAt date
      const paySnap = await db.collection("regPayments").where("compId", "==", compId).where("status", "==", "paid").get();
      paySnap.docs.forEach(d => {
        const p = d.data();
        const paidDateStr = String(p.paidAt || "").slice(0, 10);
        if (!paidDateStr || paidDateStr < fromDate || paidDateStr > toDate) return;
        const amt = parseInt(p.amount, 10) || 0;
        const fee = Math.round(amt * feePct) / 100; // UX-003: 2-decimal handling fee (feePct% of amt)
        const net = Math.round((amt - fee) * 100) / 100;
        payuniGross += amt;
        feeTotal    += fee;
        payuniNet   += net;
        orders.push({
          type: "payuni",
          compId, compName,
          orderId: p.orderId,
          teamId: p.teamId || "",
          teamNameCN: p.teamNameCN || "",
          teamNameEN: p.teamNameEN || "",
          payuniTradeNo: p.payuniTradeNo || "",
          paidAt: p.paidAt || "",
          amount: amt, feePct, fee, net
        });
      });

      // Bank-transfer confirmed teams — no fee deduction
      const teamSnap = await db.collection("teams").where("compId", "==", compId).get();
      const cfg = compMap[compId].config || {};
      // For ATM rows we don't have per-order amount → use the activity's registration fee
      let atmAmount = parseInt(cfg.registrationFee, 10) || 0;
      if (!atmAmount && Array.isArray(cfg.feeItems)) {
        atmAmount = cfg.feeItems.reduce((n, it) => n + (parseInt(it.amount, 10) || 0), 0);
      }
      teamSnap.docs.forEach(d => {
        const t = d.data();
        const pm = String(t.paymentMethod || "");
        // Skip PayUNI / discounts — those are handled by regPayments above
        if (pm === "payuni" || pm === "onlinePayment" || pm === "discount") return;
        // Require an explicit 已確認 marker
        const ps = String(t.paymentStatus || "");
        if (!ps.includes("已確認")) return;
        // Confirm date — pulled from the timestamp embedded in the status string
        const dm = ps.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!dm) return;
        const confirmDate = dm[1] + "-" + dm[2] + "-" + dm[3];
        if (confirmDate < fromDate || confirmDate > toDate) return;
        if (!atmAmount) return; // skip free events
        atmNet += atmAmount;
        orders.push({
          type: "atm",
          compId, compName,
          orderId: "(銀行轉帳)",
          teamId: t.teamId || "",
          teamNameCN: t.teamNameCN || "",
          teamNameEN: t.teamNameEN || "",
          payuniTradeNo: "",
          paidAt: confirmDate,
          amount: atmAmount, feePct: 0, fee: 0, net: atmAmount
        });
      });
    }

    // Was this period already remitted?
    const remDocId = creator + "_" + fromDate + "_" + toDate;
    const remDoc = await db.collection("billingRemittances").doc(remDocId).get();
    const remitted = remDoc.exists;
    const remittance = remitted ? remDoc.data() : null;

    // Bank-transfer (ATM) orders pay the organiser DIRECTLY at their own bank — that
    // money never reaches the platform, so it doesn't enter the wire-out calculation.
    // ATM rows are still surfaced in the orders list as informational context, but
    // subtotal / actualWire compute on PayUNI net only.
    feeTotal = Math.round(feeTotal * 100) / 100;          // UX-003: 2-decimal accumulated handling fee
    const subtotal = Math.round(payuniNet);               // round net to whole NT$ at payout time
    const wireFee  = 15;                                  // NT$ 15 / actual wire-out
    const actualWire = Math.max(0, subtotal - wireFee);

    // Sort orders newest first
    orders.sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));

    results.push({
      creator, tier, feePct,
      orders,
      summary: {
        payuniGross, feeTotal, payuniNet, atmNet, subtotal, wireFee, actualWire,
        orderCount: orders.length,
        payuniCount: orders.filter(o => o.type === "payuni").length,
        atmCount:    orders.filter(o => o.type === "atm").length
      },
      remitted, remittance,
      period: { fromDate, toDate }
    });
  }
  return results;
});

// System admin marks a (creator × period) bill as wired. Persists the recorded
// amount + wire fee + author + note, so future runs of getOrganizerBilling can
// flag the period as "已匯款".
exports.markBillingAsRemitted = authCallable(["system"], async (data, request) => {
  const { creator, fromDate, toDate, actualWireAmount, wireFee, note } = data;
  if (!creator || !fromDate || !toDate) return { success: false, message: "缺少必要欄位 (creator/fromDate/toDate)" };
  const docId = creator + "_" + String(fromDate).slice(0, 10) + "_" + String(toDate).slice(0, 10);
  await db.collection("billingRemittances").doc(docId).set({
    creator,
    fromDate: String(fromDate).slice(0, 10),
    toDate:   String(toDate).slice(0, 10),
    actualWireAmount: parseInt(actualWireAmount, 10) || 0,
    wireFee:          parseInt(wireFee, 10) || 15,
    remittedAt: fmtNow(),
    remittedBy: request.authUser.username,
    note: String(note || "").slice(0, 200)
  });
  await auditLog(request.authUser.username, "標記已匯款", creator,
    String(fromDate).slice(0, 10) + "~" + String(toDate).slice(0, 10) + " NT$" + (parseInt(actualWireAmount, 10) || 0));
  return { success: true };
});

// Past wire-outs (organiser sees their own; system admin can pass a creator or omit for all).
exports.listRemittanceHistory = authCallable(["system", "competition"], async (data, request) => {
  const targetCreator = request.authUser.role === "system"
    ? (data && data.creator) || null
    : request.authUser.username;
  let snap;
  if (targetCreator) snap = await db.collection("billingRemittances").where("creator", "==", targetCreator).get();
  else snap = await db.collection("billingRemittances").get();
  return snap.docs.map(d => d.data()).sort((a, b) => String(b.remittedAt || "").localeCompare(String(a.remittedAt || "")));
});

// System admin lists every competition owner so the billing UI can pick from a dropdown.
exports.listOrganizerAccounts = authCallable(["system"], async () => {
  const snap = await db.collection("accounts").where("role", "==", "competition").get();
  const accounts = await Promise.all(snap.docs.map(async d => {
    const a = d.data();
    const tier = await getEffectiveTier(a.username);
    return { username: a.username, displayName: a.displayName || "", organizationName: a.organizationName || "", tier };
  }));
  return accounts.sort((a, b) => a.username.localeCompare(b.username));
});

// ===== 平台代收轉付 — per-order settlement model =====
// Replaces period-range remittance with per-order tracking so 已轉/未轉 is always
// exact: an order can never be wired twice (settled flag is the lock) nor missed
// (createSettlement sweeps ALL outstanding orders). Bank-transfer (ATM) money is
// NOT included — that goes straight to the organiser's own account.

// Read settlement data for one organiser (system passes creator; organiser = self),
// optionally scoped to a single competition (compId) for the organiser-facing tab.
exports.getSettlementData = authCallable(["system", "competition"], async (data, request) => {
  const creator = request.authUser.role === "system" ? (data.creator || null) : request.authUser.username;
  if (!creator) return { error: "缺少 creator" };
  const scopeComp = data.compId || "";

  const salesDoc = await db.collection("config").doc("sales").get();
  const sales = salesDoc.exists ? salesDoc.data() : {};
  const feeByTier = sales.payuniFeeByTier || {};
  const payoutCycle = sales.payoutCycle || "weekly";
  const plans = await getPlans();
  const tier = await getEffectiveTier(creator);
  const feePct = (plans[tier] && typeof plans[tier].feePct === "number") ? plans[tier].feePct : (parseFloat(feeByTier[tier]) || 0);

  // payout account snapshot
  const accSnap = await db.collection("accounts").where("username", "==", creator).limit(1).get();
  const acc = accSnap.empty ? {} : accSnap.docs[0].data();
  const payout = {
    bankCode: acc.payoutBankCode || "", bankName: acc.payoutBankName || "",
    branchCode: acc.payoutBranchCode || "", branchName: acc.payoutBranchName || "",
    accountNumber: acc.payoutAccount || "", accountName: acc.payoutName || "",
    organizationName: acc.organizationName || acc.displayName || ""
  };

  const compSnap = await db.collection("competitions").where("creator", "==", creator).get();
  const compMap = {};
  compSnap.docs.forEach(d => { compMap[d.id] = (d.data().config && d.data().config.competitionName) || d.data().name || d.id; });
  const compIds = scopeComp ? [scopeComp] : Object.keys(compMap);

  const orders = [];
  let gross = 0, feeTotal = 0, net = 0, settledNet = 0, unsettledNet = 0, unsettledGross = 0;
  let pendingCount = 0, pendingGross = 0;   // S6-1: PayUNI orders created-but-not-yet-paid (info only)
  for (const cid of compIds) {
    const paySnap = await db.collection("regPayments").where("compId", "==", cid).where("status", "==", "paid").get();
    paySnap.docs.forEach(d => {
      const p = d.data();
      const amt = parseInt(p.amount, 10) || 0;
      const fee = Math.round(amt * feePct) / 100;          // UX-003: 2-decimal handling fee
      const n = Math.round((amt - fee) * 100) / 100;
      gross += amt; feeTotal += fee; net += n;
      if (p.settled) settledNet += n; else { unsettledNet += n; unsettledGross += amt; }
      orders.push({
        orderId: p.orderId || d.id, compId: cid, compName: compMap[cid] || cid,
        teamId: p.teamId || "", teamNameCN: p.teamNameCN || "", teamNameEN: p.teamNameEN || "",
        payuniTradeNo: p.payuniTradeNo || "", paidAt: p.paidAt || "",
        amount: amt, feePct, fee, net: n,
        settled: !!p.settled, settlementId: p.settlementId || "", settledAt: p.settledAt || ""
      });
    });
    // S6-1: count (don't settle) PayUNI orders still pending payment, for an info row.
    const pendSnap = await db.collection("regPayments").where("compId", "==", cid).where("status", "==", "pending").get();
    pendSnap.docs.forEach(d => { pendingCount++; pendingGross += parseInt(d.data().amount, 10) || 0; });
  }
  orders.sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));

  // settlement batches for this creator (when scoped, only those touching this comp)
  const setSnap = await db.collection("settlements").where("creator", "==", creator).get();
  let settlements = setSnap.docs.map(d => d.data());
  if (scopeComp) {
    settlements = settlements.map(s => {
      const compOrders = (s.orders || []).filter(o => o.compId === scopeComp);
      if (!compOrders.length) return null;
      return Object.assign({}, s, {
        compOrders,
        compNet: compOrders.reduce((x, o) => x + (o.net || 0), 0),
        compOrderCount: compOrders.length
      });
    }).filter(Boolean);
  }
  settlements.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  // UX-003: surface the NT$1000 gross threshold so the admin preview matches createSettlement.
  const SETTLE_MIN = 1000;
  return {
    creator, tier, feePct, payoutCycle, payout, scope: scopeComp || null,
    summary: {
      gross: Math.round(gross * 100) / 100,
      feeTotal: Math.round(feeTotal * 100) / 100,
      net: Math.round(net * 100) / 100,
      settledNet: Math.round(settledNet * 100) / 100,
      unsettledNet: Math.round(unsettledNet * 100) / 100,
      unsettledGross,
      pendingCount, pendingGross,
      settleThreshold: SETTLE_MIN,
      canSettle: unsettledGross >= SETTLE_MIN,   // false → createSettlement will accumulate, not pay out
      orderCount: orders.length,
      settledCount: orders.filter(o => o.settled).length,
      unsettledCount: orders.filter(o => !o.settled).length
    },
    orders, settlements
  };
});

// System admin wires ALL currently-unsettled PAID PayUNI orders for a creator as one
// batch. Double-wire safe: only orders without a `settled` flag are swept in.
exports.createSettlement = authCallable(["system"], async (data, request) => {
  const { creator, note } = data;
  if (!creator) return { success: false, message: "缺少 creator" };

  const salesDoc = await db.collection("config").doc("sales").get();
  const sales = salesDoc.exists ? salesDoc.data() : {};
  const feeByTier = sales.payuniFeeByTier || {};
  const plans = await getPlans();
  const tier = await getEffectiveTier(creator);
  const feePct = (plans[tier] && typeof plans[tier].feePct === "number") ? plans[tier].feePct : (parseFloat(feeByTier[tier]) || 0);

  const compSnap = await db.collection("competitions").where("creator", "==", creator).get();
  const compMap = {};
  compSnap.docs.forEach(d => { compMap[d.id] = (d.data().config && d.data().config.competitionName) || d.data().name || d.id; });

  const targets = [];
  for (const cid of Object.keys(compMap)) {
    const paySnap = await db.collection("regPayments").where("compId", "==", cid).where("status", "==", "paid").get();
    // 帳務重構：排除已在匯款申請中(requested)或已退款的訂單，避免與新申請流程重複出帳。
    paySnap.docs.forEach(d => { const p = d.data(); if (!p.settled && p.payoutState !== "requested" && p.refundState !== "refunded") targets.push({ ref: d.ref, p, cid }); });
  }
  if (!targets.length) return { success: false, message: "沒有未結算的 PayUNI 訂單" };

  const settlementId = "STL" + Date.now();
  const now = fmtNow();
  const SETTLE_MIN = 1000;                       // UX-003 (Q1): gross threshold to settle
  const r2 = x => Math.round(x * 100) / 100;     // UX-003 (Q2): keep 2 decimals while accumulating
  let grossTotal = 0, feeTotal = 0, netTotal = 0;
  const orderSnap = targets.map(t => {
    const amt = parseInt(t.p.amount, 10) || 0;
    const fee = r2(amt * feePct / 100);          // 2-decimal handling fee, NOT pre-rounded per order
    const n = r2(amt - fee);
    grossTotal += amt; feeTotal += fee; netTotal += n;
    return {
      orderId: t.p.orderId || t.ref.id, compId: t.cid, compName: compMap[t.cid] || t.cid,
      teamId: t.p.teamId || "", teamNameCN: t.p.teamNameCN || "", teamNameEN: t.p.teamNameEN || "",
      amount: amt, fee, net: n
    };
  });
  feeTotal = r2(feeTotal); netTotal = r2(netTotal);

  // UX-003 (Q1): below the NT$1000 gross threshold, leave the orders UNSETTLED so they
  // accumulate into the next batch — nothing is marked settled, no settlement doc created.
  if (grossTotal < SETTLE_MIN) {
    return { success: false, accumulated: true, grossTotal, threshold: SETTLE_MIN, orderCount: orderSnap.length,
      message: "本批未結算總額 NT$" + grossTotal + " 未達 NT$" + SETTLE_MIN + " 結算門檻，已保留累積至下批。" };
  }

  // UX-003 (Q2): round the net to whole NT$ only here at payout time, then deduct the NT$15 wire fee.
  const wireFee = 15;
  const netRounded = Math.round(netTotal);
  const actualWire = Math.max(0, netRounded - wireFee);

  const accSnap = await db.collection("accounts").where("username", "==", creator).limit(1).get();
  const acc = accSnap.empty ? {} : accSnap.docs[0].data();

  // mark orders settled (batched writes, 400/commit)
  for (let i = 0; i < targets.length; i += 400) {
    const batch = db.batch();
    targets.slice(i, i + 400).forEach(t => batch.update(t.ref, { settled: true, settlementId, settledAt: now }));
    await batch.commit();
  }

  await db.collection("settlements").doc(settlementId).set({
    settlementId, creator, tier, feePct,
    orderCount: orderSnap.length,
    grossTotal, feeTotal, netTotal, netRounded, wireFee, actualWire,
    payout: {
      bankCode: acc.payoutBankCode || "", bankName: acc.payoutBankName || "",
      branchCode: acc.payoutBranchCode || "", branchName: acc.payoutBranchName || "",
      accountNumber: acc.payoutAccount || "", accountName: acc.payoutName || ""
    },
    orders: orderSnap,
    note: String(note || "").slice(0, 200),
    createdAt: now, createdBy: request.authUser.username
  });
  await auditLog(request.authUser.username, "平台結算匯款", creator,
    settlementId + " " + orderSnap.length + "筆 實匯NT$" + actualWire);
  return { success: true, accumulated: false, settlementId, orderCount: orderSnap.length, grossTotal, feeTotal, netTotal, netRounded, wireFee, actualWire };
});

// 帳務重構 S1：一次性遷移 — 為既有 regPayments 補 payoutState/refundState（冪等、可重跑）。
// settled===true → paid_out（沿用 settlementId/settledAt）；其餘 → available；refundState 缺 → none。
exports.migratePayoutStates = authCallable(["system"], async () => {
  const snap = await db.collection("regPayments").get();
  let scanned = 0, updated = 0, batch = db.batch(), n = 0;
  for (const d of snap.docs) {
    const p = d.data(); scanned++;
    const upd = {};
    if (p.payoutState === undefined || p.payoutState === null) {
      if (p.settled === true) {
        upd.payoutState = "paid_out";
        if (p.settlementId) upd.payoutReqId = p.settlementId;
        if (p.settledAt) upd.paidOutAt = p.settledAt;
      } else {
        upd.payoutState = "available";   // pending/paid 皆給；可提領另由 status==='paid' 把關
      }
    }
    if (p.refundState === undefined || p.refundState === null) upd.refundState = "none";
    if (Object.keys(upd).length) {
      batch.update(d.ref, upd); n++; updated++;
      if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
    }
  }
  if (n > 0) await batch.commit();
  await auditLog("system", "遷移 payoutState/refundState", "regPayments", "scanned=" + scanned + " updated=" + updated);
  return { success: true, scanned, updated };
});

// ===== 帳務重構 S2/S7：匯款申請 + 排程 =====
// 預計匯款日（YYYY-MM-DD），依平台 payoutCycle。工作天=平日（不含國定假日，依規格）。
function _payoutLastWeekdayOfMonth(y, m0) { const d = new Date(y, m0 + 1, 0); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1); return d; }
function _payoutRollWeekendFwd(d) { while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d; }
function computeScheduledPayout(cycle, now) {
  now = now || new Date();
  const pad = n => String(n).padStart(2, "0");
  const iso = x => x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (cycle === "monthly") {
    // 月付款：每月 5 日(週末順延平日)；截止=當月最後工作日 → 本月申請→次月5日，否則再次月。
    const lastWD = _payoutLastWeekdayOfMonth(d.getFullYear(), d.getMonth());
    const baseMonth = (d <= lastWD) ? d.getMonth() + 1 : d.getMonth() + 2;
    return iso(_payoutRollWeekendFwd(new Date(d.getFullYear(), baseMonth, 5)));
  }
  // 週付款：匯款=週四(4)，截止=週三23:59 → 週日~週三→本週四；週四~週六→下週四。
  const dow = d.getDay();
  const add = (dow <= 3) ? (4 - dow) : (11 - dow);
  const t = new Date(d); t.setDate(d.getDate() + add);
  return iso(t);
}
async function _ownerFeePct(creator) {
  const salesDoc = await db.collection("config").doc("sales").get();
  const sales = salesDoc.exists ? salesDoc.data() : {};
  const plans = await getPlans();
  const tier = await getEffectiveTier(creator);
  const feePct = (plans[tier] && typeof plans[tier].feePct === "number") ? plans[tier].feePct : (parseFloat((sales.payuniFeeByTier || {})[tier]) || 0);
  return { feePct, cycle: sales.payoutCycle || "weekly" };
}
async function _ownerPayoutAcct(creator) {
  const s = await db.collection("accounts").where("username", "==", creator).limit(1).get();
  const a = s.empty ? {} : s.docs[0].data();
  return { acc: a, has: !!(a.payoutAccount && a.payoutName),
    snapshot: { bankCode: a.payoutBankCode || "", bankName: a.payoutBankName || "", branchCode: a.payoutBranchCode || "", branchName: a.payoutBranchName || "", accountNumber: a.payoutAccount || "", accountName: a.payoutName || "" } };
}

// 各報名收款明細：可提領訂單 + 保留款 + 收款帳戶/週期/預計匯款日。
exports.getPayableItems = compAuthCallable("manage", async (data, request) => {
  const compId = data.compId;
  const creator = await _resolveCreator(request, compId);
  if (!creator) throw new HttpsError("not-found", "活動不存在");
  const { feePct, cycle } = await _ownerFeePct(creator);
  const compDoc = await db.collection("competitions").doc(compId).get();
  const compName = (compDoc.exists && ((compDoc.data().config || {}).competitionName || compDoc.data().name)) || compId;
  const orders = [];
  const paySnap = await db.collection("regPayments").where("compId", "==", compId).where("status", "==", "paid").get();
  paySnap.docs.forEach(d => {
    const p = d.data();
    if (p.payoutState !== "available") return;
    if (p.refundState && p.refundState !== "none") return;
    const amt = parseInt(p.amount, 10) || 0; if (amt <= 0) return;
    const fee = Math.round(amt * feePct) / 100;
    orders.push({ id: d.id, orderId: p.orderId || d.id, teamId: p.teamId || "", teamNameCN: p.teamNameCN || "", teamNameEN: p.teamNameEN || "", amount: amt, feePct, fee, net: Math.round((amt - fee) * 100) / 100, paidAt: p.paidAt || "" });
  });
  // 單一 where（compId）+ 程式內過濾，避免新 collection 需要複合索引。
  const deposits = [];
  const depSnap = await db.collection("deposits").where("compId", "==", compId).get();
  depSnap.docs.forEach(d => {
    const x = d.data(); if (x.creator !== creator || x.status !== "available") return;
    const amt = parseInt(x.retainedAmount, 10) || 0; if (amt <= 0) return;
    const fpct = Number(x.feePct || feePct); const fee = Math.round(amt * fpct) / 100;
    deposits.push({ id: d.id, sourceTeamName: x.sourceTeamName || "", retainedAmount: amt, feePct: fpct, fee, net: Math.round((amt - fee) * 100) / 100 });
  });
  // 可退刷清單（已核准的 PayUNI 退費）— 供明細「退刷」用；已匯出者標 blocked（需求 4）。
  const refundable = [];
  const rfSnap = await db.collection("refundRequests").where("compId", "==", compId).get();
  for (const rd of rfSnap.docs) {
    const rr = rd.data();
    if (rr.status !== "approved" || rr.channel !== "payuni_refund" || !rr.orderId) continue;
    const od = await db.collection("regPayments").doc(rr.orderId).get();
    if (!od.exists) continue;
    const op = od.data();
    const amt = parseInt(op.amount, 10) || 0;
    refundable.push({ reqId: rr.reqId, teamId: rr.teamId, teamNameCN: rr.teamNameCN || "", paidAmount: amt, calcRefund: rr.calcRefund || 0, retained: Math.max(0, amt - (rr.calcRefund || 0)), blocked: op.payoutState === "paid_out" });
  }
  const acct = await _ownerPayoutAcct(creator);
  const reqSnap = await db.collection("payoutRequests").where("compId", "==", compId).get();
  const requests = reqSnap.docs.map(d => d.data()).filter(r => r.creator === creator).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { compId, compName, feePct, orders, deposits, refundable, requests, hasPayoutAccount: acct.has, payout: acct.snapshot, cycle, scheduledPayoutDate: computeScheduledPayout(cycle) };
});

// 申請匯款（勾選訂單/保留款）。未設收款帳戶 → NO_PAYOUT_ACCOUNT。
exports.applyPayout = compAuthCallable("manage", async (data, request) => {
  const compId = data.compId;
  const creator = await _resolveCreator(request, compId);
  if (!creator) return { success: false, message: "活動不存在" };
  if (request.authUser.role === "system") return { success: false, message: "系統管理員為檢視模式，無法代主辦方申請匯款" };
  const orderIds = Array.isArray(data.orderIds) ? data.orderIds : [];
  const depositIds = Array.isArray(data.depositIds) ? data.depositIds : [];
  if (!orderIds.length && !depositIds.length) return { success: false, message: "請至少勾選一筆" };
  const acct = await _ownerPayoutAcct(creator);
  if (!acct.has) return { success: false, code: "NO_PAYOUT_ACCOUNT", message: "請先至『帳戶設定 → 收款帳戶』填寫收款帳戶，平台才能匯款給您。" };
  const { feePct, cycle } = await _ownerFeePct(creator);
  const compDoc = await db.collection("competitions").doc(compId).get();
  const compName = (compDoc.exists && ((compDoc.data().config || {}).competitionName || compDoc.data().name)) || compId;
  const reqRef = db.collection("payoutRequests").doc();
  const out = await db.runTransaction(async (tx) => {
    let gross = 0, feeTotal = 0, netTotal = 0; const orderRefs = [], depRefs = [], items = [];
    for (const oid of orderIds) {
      const ref = db.collection("regPayments").doc(oid); const d = await tx.get(ref);
      if (!d.exists) throw new HttpsError("failed-precondition", "訂單不存在：" + oid);
      const p = d.data();
      if (p.compId !== compId) throw new HttpsError("permission-denied", "訂單不屬此活動");
      if (p.status !== "paid" || p.payoutState !== "available" || (p.refundState && p.refundState !== "none"))
        throw new HttpsError("failed-precondition", "訂單目前不可提領（可能已申請/已匯出/退費中）");
      const amt = parseInt(p.amount, 10) || 0; if (amt <= 0) throw new HttpsError("failed-precondition", "金額為 0 無法提領");
      const fee = Math.round(amt * feePct) / 100, net = Math.round((amt - fee) * 100) / 100;
      gross += amt; feeTotal += fee; netTotal += net;
      orderRefs.push(ref); items.push({ orderId: p.orderId || oid, teamId: p.teamId || "", teamNameCN: p.teamNameCN || "", amount: amt, fee, net });
    }
    for (const did of depositIds) {
      const ref = db.collection("deposits").doc(did); const d = await tx.get(ref);
      if (!d.exists) throw new HttpsError("failed-precondition", "保留款不存在");
      const x = d.data();
      if (x.creator !== creator || x.compId !== compId) throw new HttpsError("permission-denied", "保留款不屬此活動");
      if (x.status !== "available") throw new HttpsError("failed-precondition", "保留款目前不可提領");
      const amt = parseInt(x.retainedAmount, 10) || 0; const fpct = Number(x.feePct || feePct);
      const fee = Math.round(amt * fpct) / 100, net = Math.round((amt - fee) * 100) / 100;
      gross += amt; feeTotal += fee; netTotal += net;
      depRefs.push(ref); items.push({ depositId: did, teamNameCN: x.sourceTeamName || "(保留款)", amount: amt, fee, net });
    }
    const wireFee = 15, netRounded = Math.round(netTotal), actualWire = Math.max(0, netRounded - wireFee);
    const scheduledPayoutDate = computeScheduledPayout(cycle);
    tx.set(reqRef, {
      reqId: reqRef.id, creator, compId, compName, status: "requested",
      orderIds, depositIds, items,
      grossTotal: Math.round(gross * 100) / 100, feeTotal: Math.round(feeTotal * 100) / 100, netTotal: Math.round(netTotal * 100) / 100,
      wireFee, actualWire, scheduledPayoutDate, payoutSnapshot: acct.snapshot,
      appliedAt: fmtNow(), appliedBy: request.authUser.username, decidedAt: "", decidedBy: "", decideNote: "", createdAt: fmtNow()
    });
    orderRefs.forEach(r => tx.update(r, { payoutState: "requested", payoutReqId: reqRef.id }));
    depRefs.forEach(r => tx.update(r, { status: "requested", payoutReqId: reqRef.id }));
    return { grossTotal: Math.round(gross * 100) / 100, netTotal: Math.round(netTotal * 100) / 100, actualWire, scheduledPayoutDate };
  });
  await auditLog(request.authUser.username, "申請匯款", compId, reqRef.id + " 實匯NT$" + out.actualWire);
  return { success: true, reqId: reqRef.id, ...out };
});

// 撤回匯款申請（僅 requested 可撤）。
exports.withdrawPayout = compAuthCallable("manage", async (data, request) => {
  const compId = data.compId, reqId = data.reqId;
  const creator = await _resolveCreator(request, compId);
  if (request.authUser.role === "system") return { success: false, message: "系統管理員為檢視模式，無法代主辦方撤回申請" };
  const ref = db.collection("payoutRequests").doc(reqId);
  await db.runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if (!d.exists) throw new HttpsError("not-found", "申請不存在");
    const r = d.data();
    if (r.compId !== compId || r.creator !== creator) throw new HttpsError("permission-denied", "非此活動/主辦方之申請");
    if (r.status !== "requested") throw new HttpsError("failed-precondition", "僅待審核的申請可撤回");
    (r.orderIds || []).forEach(oid => tx.update(db.collection("regPayments").doc(oid), { payoutState: "available", payoutReqId: FieldValue.delete() }));
    (r.depositIds || []).forEach(did => tx.update(db.collection("deposits").doc(did), { status: "available", payoutReqId: FieldValue.delete() }));
    tx.update(ref, { status: "withdrawn", decidedAt: fmtNow() });
  });
  await auditLog(request.authUser.username, "撤回匯款申請", compId, reqId);
  return { success: true };
});

// ===== 帳務重構 S3：系統管理員帳款管理 =====
const PAYOUT_REJECT_REASONS = {
  acct_mismatch: "收款帳戶資訊不符 / 缺漏",
  order_dispute: "訂單含爭議 / 退款處理中",
  below_threshold: "金額未達建議結算門檻",
  data_mismatch: "申請內容與紀錄不符，請重新確認",
  other: "其他"
};
// 列出匯款申請（可篩 status）。
exports.listPayoutRequests = authCallable(["system"], async (data) => {
  const status = data && data.status;
  const snap = status ? await db.collection("payoutRequests").where("status", "==", status).get()
                      : await db.collection("payoutRequests").get();
  const rows = snap.docs.map(d => d.data()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { requests: rows };
});
// 核准（requested → approved；可選步驟）。
exports.approvePayout = authCallable(["system"], async (data, request) => {
  const ref = db.collection("payoutRequests").doc(data.reqId);
  const d = await ref.get();
  if (!d.exists) return { success: false, message: "找不到申請" };
  if (d.data().status !== "requested") return { success: false, message: "僅待審核的申請可核准" };
  await ref.update({ status: "approved", decidedBy: request.authUser.username, decidedAt: fmtNow() });
  await auditLog(request.authUser.username, "核准匯款申請", data.reqId, "");
  return { success: true };
});
// 拒絕（→ rejected；訂單/保留款回 available；通知主辦方附理由）。
exports.rejectPayout = authCallable(["system"], async (data, request) => {
  const { reqId, reasonCode, reasonText } = data;
  let snap;
  await db.runTransaction(async (tx) => {
    const ref = db.collection("payoutRequests").doc(reqId);
    const d = await tx.get(ref);
    if (!d.exists) throw new HttpsError("not-found", "找不到申請");
    snap = d.data();
    if (!["requested", "approved"].includes(snap.status)) throw new HttpsError("failed-precondition", "此申請無法拒絕");
    (snap.orderIds || []).forEach(oid => tx.update(db.collection("regPayments").doc(oid), { payoutState: "available", payoutReqId: FieldValue.delete() }));
    (snap.depositIds || []).forEach(did => tx.update(db.collection("deposits").doc(did), { status: "available", payoutReqId: FieldValue.delete() }));
    tx.update(ref, { status: "rejected", rejectReasonCode: String(reasonCode || "").slice(0, 40), rejectReasonText: String(reasonText || "").slice(0, 500), decidedBy: request.authUser.username, decidedAt: fmtNow() });
  });
  await auditLog(request.authUser.username, "拒絕匯款申請", reqId, String(reasonCode || ""));
  try {
    const reasonLabel = PAYOUT_REJECT_REASONS[reasonCode] || reasonCode || "";
    const oEmail = await organiserEmail(snap.creator);
    const html = emailWrap("匯款申請未通過", `
      <p>您在活動「<b>${escMail(snap.compName || snap.compId)}</b>」的匯款申請（${escMail(reqId)}）未通過審核，相關款項已退回可申請狀態。</p>
      <p><b>原因：</b>${escMail(reasonLabel)}${reasonText ? "（" + escMail(reasonText) + "）" : ""}</p>
      <p>請確認後重新提出申請。</p>`);
    await queueMail(oEmail, "[RegMaster] 匯款申請未通過 — " + (snap.compName || ""), html);
  } catch (e) {}
  return { success: true };
});
// 註記已匯款（會計轉帳後）：→ paid；訂單/保留款 → paid_out；寫 settlements 歷史；通知主辦方。
exports.markPayoutPaid = authCallable(["system"], async (data, request) => {
  const { reqId, note } = data;
  const ref = db.collection("payoutRequests").doc(reqId);
  const r = await db.runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if (!d.exists) throw new HttpsError("not-found", "找不到申請");
    const rr = d.data();
    if (!["requested", "approved"].includes(rr.status)) throw new HttpsError("failed-precondition", "此申請已處理或無法匯款");
    (rr.orderIds || []).forEach(oid => tx.update(db.collection("regPayments").doc(oid), { payoutState: "paid_out", paidOutAt: fmtNow(), settled: true, settlementId: reqId }));
    (rr.depositIds || []).forEach(did => tx.update(db.collection("deposits").doc(did), { status: "paid_out", paidOutAt: fmtNow() }));
    tx.update(ref, { status: "paid", decidedBy: request.authUser.username, decidedAt: fmtNow(), decideNote: String(note || "").slice(0, 300) });
    return rr;
  });
  // settlements 歷史（沿用既有 collection 供查詢/PDF）
  await db.collection("settlements").doc(reqId).set({
    settlementId: reqId, creator: r.creator, compId: r.compId, compName: r.compName || "",
    orderCount: (r.orderIds || []).length + (r.depositIds || []).length,
    grossTotal: r.grossTotal, feeTotal: r.feeTotal, netTotal: r.netTotal, wireFee: r.wireFee, actualWire: r.actualWire,
    payout: r.payoutSnapshot || {}, orders: r.items || [], note: String(note || "").slice(0, 300),
    createdAt: fmtNow(), createdBy: request.authUser.username, source: "payoutRequest"
  });
  await auditLog(request.authUser.username, "註記匯款完成", reqId, "實匯NT$" + r.actualWire);
  try {
    const oEmail = await organiserEmail(r.creator);
    const html = emailWrap("款項已匯出", `
      <p>您在活動「<b>${escMail(r.compName || r.compId)}</b>」的匯款申請（${escMail(reqId)}）已完成匯款。</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:12px 0;font-size:14px;line-height:1.8">
        <b>實匯金額：</b>NT$${r.actualWire}（已扣手續費與每批 NT$15 匯費）</div>
      <p>請留意您的收款帳戶入帳。</p>`);
    await queueMail(oEmail, "[RegMaster] 款項已匯出 — " + (r.compName || ""), html);
  } catch (e) {}
  return { success: true, actualWire: r.actualWire };
});

exports.getRegPaymentStatus = callable(async (data) => {
  const { orderId } = data;
  if (!orderId) return { status: "unknown" };
  const doc = await db.collection("regPayments").doc(orderId).get();
  if (!doc.exists) return { status: "unknown" };
  return { status: doc.data().status || "pending" };
});

// ===== Scheduled Tasks (converted to callable — trigger via Cloud Scheduler HTTP or manually) =====
async function _runCheckDeadlines() {
  const snap = await db.collection("competitions").get();
  const now = new Date();
  for (const doc of snap.docs) {
    const r = doc.data();
    const cfg = r.config || {};
    // Auto close if deadline passed
    if (r.isOpen && r.deadline && now >= new Date(r.deadline)) {
      await doc.ref.update({ isOpen: false });
      await db.collection("announcements").add({ compId: doc.id, date: now.toISOString().substring(0, 10), title: "📌 報名已截止", content: "" });
    }
    // Auto open if openDate reached
    if (!r.isOpen && cfg.openDate && now >= new Date(cfg.openDate)) {
      const dl = r.deadline ? new Date(r.deadline) : null;
      if (!dl || now < dl) await doc.ref.update({ isOpen: true });
    }
  }
  return { success: true };
}
exports.checkDeadlines = authCallable(["system"], async () => _runCheckDeadlines());

// Organiser email digest (daily / weekly). Consumes notifPrefs.email.dailyDigest / .weekly.
// Skips organisers with nothing new in the window so we never send empty digests.
async function _runNotifDigest(period) {
  period = (period === "weekly") ? "weekly" : "daily";
  const prefKey = period === "weekly" ? "weekly" : "dailyDigest";
  const since = Date.now() - (period === "weekly" ? 7 : 1) * 24 * 60 * 60 * 1000;
  const prefSnap = await db.collection("notifPrefs").get();
  let sent = 0;
  for (const pd of prefSnap.docs) {
    const owner = pd.id;
    const emailPrefs = pd.data().email || {};
    const enabled = emailPrefs[prefKey] !== undefined ? !!emailPrefs[prefKey] : !!NOTIF_EMAIL_DEFAULTS[prefKey];
    if (!enabled) continue;
    const comps = await db.collection("competitions").where("creator", "==", owner).get();
    if (comps.empty) continue;
    const lines = [];
    let totalNew = 0;
    for (const c of comps.docs) {
      const cname = (c.data().config || {}).competitionName || c.data().name || c.id;
      const tSnap = await db.collection("teams").where("compId", "==", c.id).get();
      let n = 0;
      tSnap.docs.forEach(t => {
        const rt = String(t.data().registrationTime || "");
        if (rt.length >= 10 && new Date(rt.replace(" ", "T")).getTime() >= since) n++;
      });
      if (n > 0) { totalNew += n; lines.push(`${cname}：新報名 ${n} 筆`); }
    }
    if (totalNew === 0) continue;                 // nothing new → don't send an empty digest
    const aSnap = await db.collection("accounts").where("username", "==", owner).limit(1).get();
    if (aSnap.empty) continue;
    const to = aSnap.docs[0].data().email || "";
    if (!to) continue;
    const title = period === "weekly" ? "📊 每週報名摘要" : "📊 每日報名摘要";
    const span = period === "weekly" ? "過去 7 天" : "昨日";
    await queueMail(to, `[RegMaster] ${title}`,
      emailWrap(title, `<p>${span}您的活動共新增 <b>${totalNew}</b> 筆報名：</p>
        <ul>${lines.map(l => `<li>${escMail(l)}</li>`).join("")}</ul>
        <p style="color:#475569;font-size:13px">登入主辦後台查看完整數據。</p>`));
    sent++;
  }
  return { success: true, sent, period };
}
exports.sendNotifDigest = authCallable(["system"], async (data) => _runNotifDigest(data && data.period));

async function _runCheckLicenseExpirations() {
  const snap = await db.collection("licenses").where("status", "==", "已啟用").where("type", "==", "subscription").get();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (const doc of snap.docs) {
    const lic = doc.data();
    if (!lic.expiresAt || !lic.activatedBy) continue;
    
    const expDate = new Date(lic.expiresAt).getTime();
    const daysLeft = Math.floor((expDate - now) / dayMs);
    
    let notifyType = null;
    if (daysLeft <= 0 && !lic.notifiedExpired) notifyType = "expired";
    else if (daysLeft <= 30 && daysLeft > 0 && !lic.notified1M) notifyType = "1M";
    else if (daysLeft <= 90 && daysLeft > 30 && !lic.notified3M) notifyType = "3M";
    
    if (notifyType) {
      const userSnap = await db.collection("accounts").where("username", "==", lic.activatedBy).limit(1).get();
      if (!userSnap.empty) {
        const userEmail = userSnap.docs[0].data().email;
        if (userEmail) {
          let subject = "", htmlBody = "";
          if (notifyType === "expired") {
            subject = "🚨 [RegMaster] 授權已到期通知";
            htmlBody = `<p>您的訂閱授權 (${lic.code}) <b>已經到期</b>。請更新授權碼以繼續建立活動。</p>`;
            await doc.ref.update({ notifiedExpired: true, status: "已失效" });
          } else if (notifyType === "1M") {
            subject = "⏳ [RegMaster] 授權即將於 1 個月後到期";
            htmlBody = `<p>您的訂閱授權 (${lic.code}) 將於約 <b>1 個月後</b>到期，請及早安排續約確保服務不中斷。</p>`;
            await doc.ref.update({ notified1M: true });
          } else if (notifyType === "3M") {
            subject = "📅 [RegMaster] 授權即將於 3 個月後到期";
            htmlBody = `<p>您的訂閱授權 (${lic.code}) 將於約 <b>3 個月後</b>到期，特此提醒。</p>`;
            await doc.ref.update({ notified3M: true });
          }
          await db.collection("mail").add({ to: [userEmail], message: { subject, html: htmlBody, text: subject } });
        }
      }
    }
  }
  return { success: true };
}
exports.checkLicenseExpirations = authCallable(["system"], async () => _runCheckLicenseExpirations());

// ===== Scheduled jobs (Cloud Scheduler via onSchedule) — Asia/Taipei timezone =====
// Each sub-task is individually try/caught so one failure never blocks the others. maxInstances:1
// (these run rarely and don't need concurrency; keeps standing CPU footprint minimal).
exports.dailyJobs = onSchedule({ schedule: "0 8 * * *", timeZone: "Asia/Taipei", maxInstances: 1 }, async () => {
  await _runCheckDeadlines().catch(e => console.error("[dailyJobs] deadlines:", e));
  await _runCheckLicenseExpirations().catch(e => console.error("[dailyJobs] license:", e));
  await _runNotifDigest("daily").catch(e => console.error("[dailyJobs] digest:", e));
});
exports.weeklyJobs = onSchedule({ schedule: "0 8 * * 1", timeZone: "Asia/Taipei", maxInstances: 1 }, async () => {
  await _runNotifDigest("weekly").catch(e => console.error("[weeklyJobs] digest:", e));
});
// #4: every 15 min, send any campaign whose scheduledFor time has arrived.
exports.processScheduledCampaigns = onSchedule({ schedule: "*/15 * * * *", timeZone: "Asia/Taipei", maxInstances: 1 }, async () => {
  const now = Date.now();
  const snap = await db.collection("campaigns").where("status", "==", "scheduled").get();
  for (const d of snap.docs) {
    const due = d.data().scheduledFor ? new Date(d.data().scheduledFor).getTime() : 0;
    if (due && due <= now) {
      try { await _deliverCampaign(d.id, "system"); } catch (e) { console.error("[scheduledCampaign]", d.id, e); }
    }
  }
});

// ===== Feedback System =====
exports.submitFeedback = authCallable(["system","competition"], async (data, request) => {
  const { category, subject, description, stepsToReproduce, pageUrl, attachmentBase64, attachmentName, clientInfo } = data;
  if (!category || !subject || !description) return { success: false, message: "必填欄位未填寫完整" };

  const username = request.authUser.username;
  const userEmail = request.authUser.email || "";

  // Store attachment if provided (max 2MB)
  let attachmentId = "";
  let attachmentMime = "";
  if (attachmentBase64 && attachmentBase64.length > 0 && attachmentBase64.length <= 2800000) {
    const attRef = db.collection("feedbackFiles").doc();
    // Detect mime type from base64 header or file extension
    const ext = ((attachmentName || "").split(".").pop() || "").toLowerCase();
    const mimeMap = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };
    attachmentMime = mimeMap[ext] || "application/octet-stream";
    await attRef.set({ data: attachmentBase64, fileName: (attachmentName || "attachment").substring(0, 100), mimeType: attachmentMime, createdAt: fmtNow() });
    attachmentId = attRef.id;
  }

  const feedbackDoc = {
    category, subject: (subject || "").substring(0, 200),
    description: (description || "").substring(0, 5000),
    stepsToReproduce: (stepsToReproduce || "").substring(0, 2000),
    pageUrl: (pageUrl || "").substring(0, 500),
    attachmentId, attachmentName: attachmentId ? (attachmentName || "").substring(0, 100) : "", attachmentMime,
    username, email: userEmail,
    device: (clientInfo && clientInfo.device) || "", browser: (clientInfo && clientInfo.browser) || "",
    os: (clientInfo && clientInfo.os) || "", ip: (clientInfo && clientInfo.ip) || "",
    country: (clientInfo && clientInfo.country) || "", city: (clientInfo && clientInfo.city) || "",
    status: "新建", createdAt: fmtNow(),
    createdAtTS: FieldValue.serverTimestamp()
  };
  await db.collection("feedback").add(feedbackDoc);

  // Send email to system admin
  const catLabels = { bug: "🐞 系統異常", feature: "💡 功能建議", ux: "🎨 介面體驗", question: "❓ 一般提問", billing: "💳 帳號付費", other: "💬 其他" };
  const catLabel = catLabels[category] || category;
  const emailBody = `
    <p style="font-size:16px;font-weight:700;margin-top:0">📮 收到新的意見回饋</p>
    <div style="background:var(--surface2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:12px 0;font-size:14px;line-height:1.8">
      <b>類別：</b>${catLabel}<br>
      <b>主旨：</b>${(subject || "").replace(/</g, "&lt;")}<br>
      <b>提交者：</b>${username} (${userEmail})<br>
      <b>裝置：</b>${feedbackDoc.device} / ${feedbackDoc.os}<br>
      <b>瀏覽器：</b>${feedbackDoc.browser}<br>
      <b>IP：</b>${feedbackDoc.ip} (${feedbackDoc.country} ${feedbackDoc.city})<br>
      <b>頁面：</b>${feedbackDoc.pageUrl || "-"}<br>
      <b>時間：</b>${fmtNow()}
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:12px 0">
      <b>詳細描述：</b><br>
      <div style="margin-top:8px;white-space:pre-wrap;font-size:14px;color:#333">${(description || "").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>
      ${stepsToReproduce ? '<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px"><b>重現步驟：</b><br><div style="margin-top:4px;white-space:pre-wrap;font-size:14px;color:#333">' + stepsToReproduce.replace(/</g, "&lt;").replace(/\n/g, "<br>") + '</div></div>' : ''}
    </div>
    ${attachmentId ? '<div style="margin:12px 0;padding:12px;background:#f1f5f9;border-radius:8px"><b>📎 附件：</b> ' + (attachmentName || "file").replace(/</g, "&lt;") + '（請至 系統設定 → 意見回饋 查看附件）</div>' : ''}
  `;
  const htmlEmail = emailWrap('📮 意見回饋 — ' + (subject || "").substring(0, 50), emailBody);
  await db.collection("mail").add({
    to: [SYSTEM_ADMIN_EMAIL],
    message: { subject: "[RegMaster 意見回饋] " + catLabel + " — " + (subject || "").substring(0, 50), html: htmlEmail, text: "來自 " + username + " 的意見回饋: " + subject }
  });

  await auditLog(username, "意見回饋", category, subject);
  return { success: true, message: "感謝您的回饋！系統管理員將盡快處理。" };
});

exports.listFeedback = authCallable(["system"], async () => {
  const snap = await db.collection("feedback").orderBy("createdAtTS", "desc").limit(200).get();
  return snap.docs.map(d => {
    const f = d.data();
    return {
      id: d.id, category: f.category || "", subject: f.subject || "", description: f.description || "",
      stepsToReproduce: f.stepsToReproduce || "", pageUrl: f.pageUrl || "",
      username: f.username || "", email: f.email || "",
      device: f.device || "", browser: f.browser || "", os: f.os || "",
      ip: f.ip || "", country: f.country || "", city: f.city || "",
      status: f.status || "新建", createdAt: f.createdAt || "",
      attachmentId: f.attachmentId || "", attachmentName: f.attachmentName || "", attachmentMime: f.attachmentMime || ""
    };
  });
});

exports.getFeedbackFile = authCallable(["system"], async (data) => {
  const { fileId } = data;
  if (!fileId) return { success: false };
  const doc = await db.collection("feedbackFiles").doc(fileId).get();
  if (!doc.exists) return { success: false, message: "檔案不存在" };
  const f = doc.data();
  return { success: true, dataUri: "data:" + (f.mimeType || "application/octet-stream") + ";base64," + (f.data || ""), fileName: f.fileName || "file" };
});

exports.updateFeedbackStatus = authCallable(["system"], async (data) => {
  const { feedbackId, status } = data;
  if (!feedbackId || !status) return { success: false };
  await db.collection("feedback").doc(feedbackId).update({ status });
  return { success: true };
});

// ===== Financial & Visitor Analytics =====
exports.listOrders = authCallable(["system"], async (data) => {
  const dateFrom = data.dateFrom || "";
  const dateTo = data.dateTo || "";
  const [orderSnap, acctSnap] = await Promise.all([
    db.collection("orders").get(),
    db.collection("accounts").get()
  ]);
  const emailMap = {};
  acctSnap.docs.forEach(d => { const a = d.data(); emailMap[a.username] = a.email || ""; });
  const results = [];
  for (const doc of orderSnap.docs) {
    const o = doc.data();
    const oDate = (o.createdAt || "").substring(0, 10);
    if (dateFrom && oDate < dateFrom) continue;
    if (dateTo && oDate > dateTo) continue;
    results.push({
      orderId: o.orderId || doc.id, username: o.username || "", email: emailMap[o.username] || "",
      items: o.items || [], total: o.total || 0, status: o.status || "",
      createdAt: o.createdAt || "", paidAt: o.paidAt || "",
      couponCode: o.couponCode || "", couponDiscount: o.couponDiscount || 0
    });
  }
  results.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return results;
});

exports.logVisit = callable(async (data, request) => {
  const { country, city, device, page, compId } = data;
  const today = new Date().toISOString().substring(0, 10);
  // V-16: derive IP server-side (was trusting client-supplied `data.ip`, which let visitor
  // analytics + the per-IP dedup/rate-limit be spoofed).
  const safeIP = (clientIp(request) || "").substring(0, 45);
  const safePage = (page || "/").substring(0, 200);
  // Dedup: same IP + page + date only records once
  if (safeIP) {
    const exists = await db.collection("visitors")
      .where("ip", "==", safeIP).where("date", "==", today).where("page", "==", safePage)
      .limit(1).get();
    if (!exists.empty) return { success: true };
  }
  // Rate limit: max 50 visitor records per IP per day
  if (safeIP) {
    const todayCount = await db.collection("visitors")
      .where("ip", "==", safeIP).where("date", "==", today)
      .limit(50).get();
    if (todayCount.size >= 50) return { success: true };
  }
  // Validate compId: only store if format is clean AND competition actually exists
  let safeCompId = "";
  if (compId) {
    const rawId = String(compId).substring(0, 30);
    if (/^[A-Za-z0-9_-]+$/.test(rawId)) {
      const compDoc = await db.collection("competitions").doc(rawId).get();
      if (compDoc.exists) safeCompId = rawId;
    }
  }
  await db.collection("visitors").add({
    ip: safeIP,
    country: (country || "").substring(0, 50),
    city: (city || "").substring(0, 50),
    device: (device || "").substring(0, 100),
    page: safePage,
    compId: safeCompId,
    date: today,
    createdAt: FieldValue.serverTimestamp()
  });
  // Increment viewCount on the competition doc (non-fatal on failure)
  if (safeCompId) {
    try {
      await db.collection("competitions").doc(safeCompId).update({
        viewCount: FieldValue.increment(1)
      });
    } catch (_e) { /* ignore - competition may have been deleted */ }
  }
  return { success: true };
});

// CC1: Comprehensive user analytics — feeds the 5-tab dashboard in system.html.
// Returns daily / by-hour / device / tier / inactive / revenue / topEvents / security
// in a single round trip so the page renders without N callable calls per tab.
exports.getUserAnalytics = authCallable(["system"], async (data) => {
  const fromDate = String((data && data.fromDate) || "1970-01-01").slice(0, 10);
  const toDate   = String((data && data.toDate)   || "9999-12-31").slice(0, 10);

  // ---------- 流量 ----------
  const visitorSnap = await db.collection("visitors").orderBy("createdAt", "desc").limit(20000).get();
  const dailyMap = {};                    // date → { views, uniqueDevices: Set }
  const byHourOfWeek = {};                // "<dow>_<hr>" → count
  const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0, Other: 0 };
  let totalVisits = 0;
  const allDeviceKeys = new Set();
  visitorSnap.docs.forEach(d => {
    const v = d.data();
    const date = v.date || "";
    if (!date || date < fromDate || date > toDate) return;
    totalVisits++;
    if (!dailyMap[date]) dailyMap[date] = { views: 0, devices: new Set() };
    dailyMap[date].views++;
    dailyMap[date].devices.add(v.ip + "|" + (v.device || ""));
    allDeviceKeys.add(v.ip + "|" + (v.device || ""));
    // Classify device
    const ua = String(v.device || "").toLowerCase();
    if (/tablet|ipad/.test(ua)) deviceCounts.Tablet++;
    else if (/mobile|android|iphone/.test(ua)) deviceCounts.Mobile++;
    else if (/mozilla|chrome|safari|firefox|edge/.test(ua)) deviceCounts.Desktop++;
    else deviceCounts.Other++;
    // Hour of week
    if (v.createdAt && v.createdAt.toDate) {
      const dt = v.createdAt.toDate();
      const key = dt.getDay() + "_" + dt.getHours();
      byHourOfWeek[key] = (byHourOfWeek[key] || 0) + 1;
    }
  });
  const daily = Object.keys(dailyMap).sort().map(date => ({
    date, views: dailyMap[date].views, uniqueDevices: dailyMap[date].devices.size
  }));
  const uniqueDevices = allDeviceKeys.size;

  // ---------- 帳號 ----------
  const accSnap = await db.collection("accounts").get();
  const newRegMap = {};                   // date → count
  const tierCounts = { free: 0, starter: 0, pro: 0, team: 0, system: 0 };
  let totpEnabledCount = 0;
  const inactiveCounts = { d30: 0, d60: 0, d90: 0 };
  const today = new Date();
  const totalAccounts = accSnap.size;
  for (const d of accSnap.docs) {
    const a = d.data();
    const created = String(a.createdAt || "").slice(0, 10);
    if (created && created >= fromDate && created <= toDate) {
      newRegMap[created] = (newRegMap[created] || 0) + 1;
    }
    if (a.totpEnabled) totpEnabledCount++;
    // Tier classification — system role is separate
    if (a.role === "system") tierCounts.system++;
    else {
      const tier = await getEffectiveTier(a.username);
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    }
    // Inactivity: lastLoginAt stored on the doc; fall back to createdAt
    const lastLoginStr = a.lastLoginAt || a.createdAt;
    if (lastLoginStr) {
      const lastLogin = new Date(lastLoginStr);
      if (!isNaN(lastLogin.getTime())) {
        const daysSince = (today.getTime() - lastLogin.getTime()) / 86400000;
        if (daysSince >= 90) inactiveCounts.d90++;
        else if (daysSince >= 60) inactiveCounts.d60++;
        else if (daysSince >= 30) inactiveCounts.d30++;
      }
    }
  }
  const newRegistrations = Object.keys(newRegMap).sort().map(date => ({ date, count: newRegMap[date] }));

  // ---------- 收入 ----------
  // Conversion funnel — visitors (estimated by unique device fingerprints), signups, paid
  let signups = 0, paid = 0;
  accSnap.docs.forEach(d => {
    const a = d.data();
    if (a.role === 'system') return;
    const created = String(a.createdAt || "").slice(0, 10);
    if (created && created >= fromDate && created <= toDate) signups++;
  });
  // Paid count: organisers with an effective tier > free
  paid = tierCounts.starter + tierCounts.pro + tierCounts.team;
  const conversionFunnel = { visitors: uniqueDevices, signups, paid };
  // Monthly revenue from regPayments (paid status) — gross income to platform
  const revMap = {};
  const regPaySnap = await db.collection("regPayments").where("status", "==", "paid").get();
  regPaySnap.docs.forEach(d => {
    const p = d.data();
    const paidDate = String(p.paidAt || "").slice(0, 10);
    if (!paidDate || paidDate < fromDate || paidDate > toDate) return;
    const month = paidDate.slice(0, 7);
    revMap[month] = (revMap[month] || 0) + (parseInt(p.amount, 10) || 0);
  });
  // License purchases too (ordres collection)
  try {
    const orderSnap = await db.collection("orders").where("status", "==", "paid").get();
    orderSnap.docs.forEach(d => {
      const o = d.data();
      const paidDate = String(o.paidAt || "").slice(0, 10);
      if (!paidDate || paidDate < fromDate || paidDate > toDate) return;
      const month = paidDate.slice(0, 7);
      revMap[month] = (revMap[month] || 0) + (parseInt(o.total, 10) || 0);
    });
  } catch (e) { /* orders collection may not exist for new tenants */ }
  const monthlyRevenue = Object.keys(revMap).sort().map(month => ({ month, revenue: revMap[month] }));
  const mrr = monthlyRevenue.length ? monthlyRevenue[monthlyRevenue.length - 1].revenue : 0;

  // ---------- 內容 ----------
  // Top events by viewCount + registration count
  const compSnap = await db.collection("competitions").get();
  const topEvents = compSnap.docs.map(d => {
    const c = d.data();
    return { compId: d.id, name: c.name || "", views: c.viewCount || 0, regs: c.teamCount || 0 };
  }).sort((a, b) => (b.views + b.regs) - (a.views + a.regs)).slice(0, 10);

  // ---------- 安全 ----------
  const totpStats = { enabled: totpEnabledCount, disabled: totalAccounts - totpEnabledCount };
  // Login failures from audit logs — anything with action containing 失敗 OR specific "登入失敗"
  const loginFailHourOfWeek = {};
  try {
    const auditSnap = await db.collection("auditLogs")
      .orderBy("createdAt", "desc").limit(5000).get();
    auditSnap.docs.forEach(d => {
      const a = d.data();
      const action = String(a.action || "");
      if (!action.includes("失敗") && !action.toLowerCase().includes("fail")) return;
      const ts = a.createdAt;
      if (!ts || !ts.toDate) return;
      const dt = ts.toDate();
      const dateStr = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, '0') + "-" + String(dt.getDate()).padStart(2, '0');
      if (dateStr < fromDate || dateStr > toDate) return;
      const key = dt.getDay() + "_" + dt.getHours();
      loginFailHourOfWeek[key] = (loginFailHourOfWeek[key] || 0) + 1;
    });
  } catch (e) { /* tolerate audit log access issues */ }

  return {
    period: { fromDate, toDate },
    kpis: {
      totalVisits, uniqueDevices, totalAccounts, paidAccounts: paid,
      mrr, twoFactorRate: totalAccounts > 0 ? Math.round(totpEnabledCount / totalAccounts * 100) : 0
    },
    daily, byHourOfWeek, deviceCounts,
    newRegistrations, tierCounts, inactiveCounts,
    conversionFunnel, monthlyRevenue,
    topEvents,
    totpStats, loginFailHourOfWeek
  };
});

exports.getVisitorStats = authCallable(["system"], async (data) => {
  const dateFrom = data.dateFrom || "";
  const dateTo = data.dateTo || "";
  const snap = await db.collection("visitors").orderBy("createdAt", "desc").limit(5000).get();
  const byDate = {}, byCountry = {}, byIP = {}, byComp = {};
  const uniqueByDate = {};
  snap.docs.forEach(d => {
    const v = d.data();
    const date = v.date || "";
    // Date filter
    if (dateFrom && date < dateFrom) return;
    if (dateTo && date > dateTo) return;
    const ip = v.ip || "unknown";
    const country = v.country || "Unknown";
    const compId = v.compId || "";
    // Daily device count (unique IPs per day)
    if (date) {
      byDate[date] = (byDate[date] || 0) + 1;
      if (!uniqueByDate[date]) uniqueByDate[date] = new Set();
      uniqueByDate[date].add(ip);
    }
    // Country stats
    byCountry[country] = (byCountry[country] || 0) + 1;
    // IP list
    if (!byIP[ip]) byIP[ip] = { count: 0, country, city: v.city || "", lastDate: date };
    byIP[ip].count++;
    if (date > byIP[ip].lastDate) byIP[ip].lastDate = date;
    // Activity ranking
    if (compId) byComp[compId] = (byComp[compId] || 0) + 1;
  });
  // Format daily unique
  const dailyUnique = {};
  Object.keys(uniqueByDate).forEach(d => { dailyUnique[d] = uniqueByDate[d].size; });
  // Get comp names for ranking (only include existing competitions)
  const compRanking = [];
  const compIds = Object.keys(byComp);
  const compDocs = await Promise.all(compIds.map(cid => db.collection("competitions").doc(cid).get()));
  compIds.forEach((cid, i) => {
    const cdoc = compDocs[i];
    if (!cdoc || !cdoc.exists) return;
    const name = cdoc.data().name || cid;
    compRanking.push({ compId: cid, name, visits: byComp[cid] });
  });
  compRanking.sort((a, b) => b.visits - a.visits);
  // IP list (top 100)
  const ipList = Object.entries(byIP).map(([ip, d]) => ({ ip, ...d })).sort((a, b) => b.count - a.count).slice(0, 100);
  return { byDate, dailyUnique, byCountry, ipList, compRanking, totalVisits: snap.docs.length };
});

// ===== One-time Migration: sync teamCount counters for existing data =====
exports.migrateTeamCounts = authCallable(["system"], async () => {
  const compSnap = await db.collection("competitions").get();
  const teamSnap = await db.collection("teams").get();
  const tc = {};
  teamSnap.docs.forEach(d => {
    const cid = d.data().compId;
    const st = d.data().status || "";
    if (st !== "已取消") tc[cid] = (tc[cid] || 0) + 1;
  });
  let updated = 0;
  for (const doc of compSnap.docs) {
    const count = tc[doc.id] || 0;
    if ((doc.data().teamCount || 0) !== count) {
      await doc.ref.update({ teamCount: count });
      updated++;
    }
  }
  return { success: true, message: "Updated " + updated + " competitions" };
});

// ===== One-time Migration: backfill viewCount counters from visitors collection =====
exports.migrateViewCounts = authCallable(["system"], async () => {
  const compSnap = await db.collection("competitions").get();
  const visitorSnap = await db.collection("visitors").get();
  const vc = {};
  visitorSnap.docs.forEach(d => {
    const cid = d.data().compId;
    if (cid) vc[cid] = (vc[cid] || 0) + 1;
  });
  let updated = 0;
  for (const doc of compSnap.docs) {
    const count = vc[doc.id] || 0;
    if ((doc.data().viewCount || 0) !== count) {
      await doc.ref.update({ viewCount: count });
      updated++;
    }
  }
  return { success: true, message: "Updated " + updated + " competitions with viewCount" };
});

// =============================================================================
// V3 PHASE 2: Public contact inquiry + onboarding state
// =============================================================================

// ===== Public contact form (replaces Phase 1's addNotification hack) =====
// Stores inquiries in contactInquiries collection + emails SYSTEM_ADMIN_EMAIL.
// Public callable (no auth). Rate limited via simple per-IP best-effort cooldown.
exports.submitContactInquiry = callable(async (data, request) => {
  // L-1: throttle contact-form spam (5 per 10 min per IP).
  const _rl = await checkRateLimit("inq_ip_" + clientIp(request), 5, 600000);
  if (!_rl.ok) return { success: false, message: "提交過於頻繁，請稍後再試" };
  const {
    name, email, company, phone,
    category,      // "general" | "sales" | "support"
    topic,         // optional: "demo", "team-plan", "careers", "sales", "support", ""
    scale,         // "small" | "medium" | "large" | "xlarge"
    plan,          // "pro" | "team" | "undecided" | "other"
    message,
    newsletter,    // boolean
    ua, lang
  } = data || {};

  // Basic validation
  if (!name || !email || !message) return { success: false, message: "請填寫姓名、Email 與訊息" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: "Email 格式不正確" };
  if (String(message).length > 5000) return { success: false, message: "訊息過長（上限 5000 字）" };
  if (String(name).length > 100) return { success: false, message: "姓名過長" };

  // Store the inquiry
  const inquiryRef = await db.collection("contactInquiries").add({
    name: String(name).slice(0, 100),
    email: String(email).slice(0, 200),
    company: String(company || "").slice(0, 200),
    phone: String(phone || "").slice(0, 50),
    category: String(category || "general").slice(0, 20),
    topic: String(topic || "").slice(0, 50),
    scale: String(scale || "").slice(0, 20),
    plan: String(plan || "").slice(0, 20),
    message: String(message).slice(0, 5000),
    newsletter: !!newsletter,
    ua: String(ua || "").slice(0, 500),
    lang: String(lang || "zh").slice(0, 10),
    status: "new",
    createdAt: FieldValue.serverTimestamp(),
    createdAtStr: fmtNow()
  });

  // Email system admin so they see it immediately
  const subject = "[RegMaster 聯絡] " + (category || "general").toUpperCase() + " · " + name;
  const html = emailWrap("聯絡表單來信", `
    <p style="font-size:15px;margin:0 0 16px">收到一則新的聯絡訊息：</p>
    <table cellpadding="6" cellspacing="0" border="0" style="width:100%;font-size:14px;border-collapse:collapse">
      <tr><td style="color:#64748b;width:120px">分類</td><td><b>${category || "general"}</b>${topic ? " · " + topic : ""}</td></tr>
      <tr><td style="color:#64748b">姓名</td><td><b>${name}</b></td></tr>
      <tr><td style="color:#64748b">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="color:#64748b">公司 / 機構</td><td>${company || "—"}</td></tr>
      <tr><td style="color:#64748b">電話</td><td>${phone || "—"}</td></tr>
      <tr><td style="color:#64748b">活動規模</td><td>${scale || "—"}</td></tr>
      <tr><td style="color:#64748b">想諮詢方案</td><td>${plan || "—"}</td></tr>
      <tr><td style="color:#64748b">電子報</td><td>${newsletter ? "願意" : "不需要"}</td></tr>
      <tr><td style="color:#64748b">語言</td><td>${lang || "zh"}</td></tr>
      <tr><td style="color:#64748b;vertical-align:top">訊息</td><td style="white-space:pre-wrap;line-height:1.7">${String(message).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]))}</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#94a3b8">Inquiry ID: ${inquiryRef.id} · 時間：${fmtNow()}</p>
  `);
  await db.collection("mail").add({
    to: [SYSTEM_ADMIN_EMAIL],
    message: { subject, html, text: `${name} (${email}) — ${message}` }
  });
  await auditLog("guest", "聯絡表單", inquiryRef.id, `${category}/${topic}`);

  return { success: true, inquiryId: inquiryRef.id };
});

// =============================================================================
// V3 PHASE 8: Settings (notif prefs, sessions) + Super admin (orgs, health)
// =============================================================================

exports.getNotifPrefs = authCallable(["system", "competition"], async (data, request) => {
  const doc = await db.collection("notifPrefs").doc(request.authUser.username).get();
  if (!doc.exists) {
    return { prefs: {
      email: { newRegistration: true, paymentReceived: true, dailyDigest: false, weekly: true },
      sms: { critical: false },
      line: { allActivity: false }
    }};
  }
  return { prefs: doc.data() };
});

exports.saveNotifPrefs = authCallable(["system", "competition"], async (data, request) => {
  const prefs = data.prefs || {};
  await db.collection("notifPrefs").doc(request.authUser.username).set(prefs, { merge: true });
  await auditLog(request.authUser.username, "saveNotifPrefs", "", "");
  return { success: true };
});

// Sessions: in this system, sessionToken is a single field on the account doc.
// We model "sessions" as a derived list: the current session = the one whose
// token matches what the client holds. We add a sessions sub-collection later
// for true multi-session support; for now we just expose the current session.
exports.listSessions = authCallable(["system", "competition"], async (data, request) => {
  const acct = request.authUser;
  return {
    sessions: [{
      id: 'current',
      device: data.clientInfo && data.clientInfo.device || 'Unknown',
      browser: data.clientInfo && data.clientInfo.browser || 'Unknown',
      ip: data.clientInfo && data.clientInfo.ip || 'Unknown',
      lastActive: fmtNow(),
      current: true
    }]
  };
});

exports.revokeSession = authCallable(["system", "competition"], async (data, request) => {
  // Single-token model: there is exactly one valid sessionToken per account, so both 'current'
  // and 'all' are satisfied by rotating it — that instantly invalidates every device (including
  // this one). The caller is expected to clear local state and redirect to login afterwards.
  if (data.sessionId === 'current' || data.sessionId === 'all') {
    const newToken = generateSessionToken();
    const snap = await db.collection("accounts").where("username", "==", request.authUser.username).limit(1).get();
    if (!snap.empty) await snap.docs[0].ref.update({ sessionToken: newToken });
    return { success: true, loggedOut: true };
  }
  return { success: false, message: "不支援的 sessionId" };
});

// Super admin: platform health + all orgs
exports.getPlatformHealth = authCallable(["system"], async () => {
  // Real metrics from Firestore (best-effort)
  const [compSnap, teamSnap, acctSnap, licSnap] = await Promise.all([
    db.collection("competitions").get(),
    db.collection("teams").get(),
    db.collection("accounts").get(),
    db.collection("licenses").get()
  ]);
  const activeLicenses = licSnap.docs.filter(d => d.data().status === "已啟用").length;
  return {
    health: {
      api: { status: 'ok', label: 'API 服務', latencyMs: 45 },
      database: { status: 'ok', label: 'Firestore', latencyMs: 28 },
      email: { status: 'ok', label: 'Email 通道', queueDepth: 0 },
      payment: { status: 'ok', label: 'PayUni 金流', latencyMs: 120 },
      ai: { status: 'ok', label: 'AI 助理', latencyMs: 850 }
    },
    metrics: {
      totalCompetitions: compSnap.size,
      totalTeams: teamSnap.size,
      totalAccounts: acctSnap.size,
      activeLicenses,
      lastUpdated: fmtNow()
    }
  };
});

exports.listAllOrgs = authCallable(["system"], async () => {
  const acctSnap = await db.collection("accounts").get();
  const compSnap = await db.collection("competitions").get();
  const teamSnap = await db.collection("teams").get();

  const compsByCreator = {};
  compSnap.docs.forEach(d => {
    const c = d.data();
    const k = c.creator || '_orphan';
    if (!compsByCreator[k]) compsByCreator[k] = { count: 0, totalTeams: 0 };
    compsByCreator[k].count++;
    compsByCreator[k].totalTeams += (c.teamCount || 0);
  });

  const orgs = [];
  for (const d of acctSnap.docs) {
    const a = d.data();
    const stats = compsByCreator[a.username] || { count: 0, totalTeams: 0 };
    // Show the REAL current plan (from active licenses), not the stale signup intent.
    const tier = a.role === 'system' ? '' : await getEffectiveTier(a.username);
    orgs.push({
      username: a.username,
      displayName: a.displayName || '',
      email: a.email || '',
      role: a.role,
      tier: tier,                          // effective tier: free/starter/pro/team ('' for system)
      createdAt: a.createdAt || '',
      compCount: stats.count,
      totalTeams: stats.totalTeams,
      emailVerified: !!a.emailVerified,
      locked: !!(a.lockedUntil && new Date(a.lockedUntil) > new Date())
    });
  }
  orgs.sort((a, b) => b.compCount - a.compCount);
  return { orgs };
});

// =============================================================================
// V3 PHASE 7: AI Conversation history (workspace UI)
// =============================================================================

exports.listConversations = authCallable(["system", "competition"], async (data, request) => {
  const compId = data && data.compId;
  const user = request.authUser.username;
  let q = db.collection("aiConversations").where("user", "==", user);
  if (compId) q = q.where("compId", "==", compId);
  const snap = await q.get();
  const list = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return { success: true, conversations: list };
});

exports.createConversation = authCallable(["system", "competition"], async (data, request) => {
  const { compId, title } = data;
  const ref = await db.collection("aiConversations").add({
    user: request.authUser.username,
    compId: compId || '',
    title: String(title || '新對話').slice(0, 100),
    createdAt: fmtNow(),
    updatedAt: fmtNow(),
    messageCount: 0,
    lastSnippet: ''
  });
  return { success: true, id: ref.id };
});

exports.getConversation = authCallable(["system", "competition"], async (data, request) => {
  const { conversationId } = data;
  const doc = await db.collection("aiConversations").doc(conversationId).get();
  if (!doc.exists) return { success: false, message: "找不到對話" };
  const conv = doc.data();
  if (conv.user !== request.authUser.username && request.authUser.role !== 'system') {
    return { success: false, message: "權限不足" };
  }
  const msgSnap = await db.collection("aiMessages").where("conversationId", "==", conversationId).get();
  const messages = msgSnap.docs.map(d => Object.assign({ id: d.id }, d.data()))
                              .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  return { success: true, conversation: Object.assign({ id: conversationId }, conv), messages };
});

exports.appendMessage = authCallable(["system", "competition"], async (data, request) => {
  const { conversationId, role, content } = data;
  if (!['user', 'ai', 'system'].includes(role)) return { success: false, message: "role 無效" };
  const convRef = db.collection("aiConversations").doc(conversationId);
  const convDoc = await convRef.get();
  if (!convDoc.exists) return { success: false, message: "找不到對話" };
  if (convDoc.data().user !== request.authUser.username && request.authUser.role !== 'system') {
    return { success: false, message: "權限不足" };
  }
  const cleanContent = String(content || '').slice(0, 10000);
  const msgRef = await db.collection("aiMessages").add({
    conversationId, role, content: cleanContent,
    createdAt: new Date().toISOString()
  });
  await convRef.update({
    updatedAt: fmtNow(),
    messageCount: FieldValue.increment(1),
    lastSnippet: cleanContent.slice(0, 80)
  });
  return { success: true, id: msgRef.id };
});

exports.deleteConversation = authCallable(["system", "competition"], async (data, request) => {
  const { conversationId } = data;
  const doc = await db.collection("aiConversations").doc(conversationId).get();
  if (!doc.exists) return { success: false };
  if (doc.data().user !== request.authUser.username && request.authUser.role !== 'system') {
    return { success: false, message: "權限不足" };
  }
  // Delete messages in batches
  const msgSnap = await db.collection("aiMessages").where("conversationId", "==", conversationId).get();
  for (let i = 0; i < msgSnap.docs.length; i += 400) {
    const batch = db.batch();
    msgSnap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await doc.ref.delete();
  return { success: true, deletedMessages: msgSnap.size };
});

// =============================================================================
// V3 PHASE 6: Campaigns (announcements) + multi-judge scoring + check-in extras
// =============================================================================

// ---- Campaigns / EDM (multi-channel announcements) ----
// Phase 6 ships Email channel only. SMS / LINE are recorded as "scheduled"
// but actual delivery is a Phase 9+ integration.

exports.listCampaigns = compAuthCallable(async (data) => {
  const snap = await db.collection("campaigns").where("compId", "==", data.compId).get();
  return snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
                  .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
});

// Recipients for a given filter — team name + that team's recorded emails + the
// total unique email count. Used by the EDM composer's 預計收件人 panel.
exports.getCampaignRecipients = compAuthCallable(async (data) => {
  const { compId, filter } = data;
  const f = filter || "all";
  const teamSnap = await db.collection("teams").where("compId", "==", compId).get();
  const teamMap = {};
  teamSnap.docs.forEach(d => {
    const t = d.data();
    if (t.status === "已取消") return;
    if (f === "paid" && !(t.paymentStatus || "").includes("已確認")) return;
    if (f === "unpaid" && (t.paymentStatus || "").includes("已確認")) return;
    if (f === "waitlist" && !(t.status || "").startsWith("備取")) return;
    teamMap[d.id] = { teamId: t.teamId || d.id, teamName: t.teamNameCN || t.teamNameEN || "(無隊名)", emails: [] };
  });
  const memSnap = await db.collection("members").where("compId", "==", compId).get();
  const allEmails = new Set();
  memSnap.docs.forEach(d => {
    const m = d.data();
    if (teamMap[m.teamId] && m.email) {
      if (teamMap[m.teamId].emails.indexOf(m.email) === -1) teamMap[m.teamId].emails.push(m.email);
      allEmails.add(m.email);
    }
  });
  const teams = Object.keys(teamMap).map(k => teamMap[k]).filter(t => t.emails.length > 0)
                      .sort((a, b) => String(a.teamId).localeCompare(String(b.teamId)));
  return { total: allEmails.size, teamCount: teams.length, teams };
});

exports.createCampaign = compAuthCallable(async (data, request) => {
  await requireCompFeature(request, "campaigns");
  const { compId, payload } = data;
  if (!payload || !payload.subject) return { success: false, message: "缺少標題" };
  const camp = {
    compId,
    subject: String(payload.subject).slice(0, 200),
    body: String(payload.body || "").slice(0, 20000),
    channels: Array.isArray(payload.channels) ? payload.channels.filter(c => ['email','sms','line'].includes(c)) : ['email'],
    recipientFilter: payload.recipientFilter || 'all',
    status: 'draft',
    createdAt: fmtNow(),
    createdBy: request.authUser.username,
    sentAt: '',
    scheduledFor: payload.scheduledFor || '',
    stats: { recipients: 0, sent: 0, opened: 0, clicked: 0 }
  };
  const ref = await db.collection("campaigns").add(camp);
  await auditLog(request.authUser.username, "createCampaign", ref.id, payload.subject);
  return { success: true, id: ref.id };
});

exports.updateCampaign = compAuthCallable(async (data, request) => {
  const { campaignId, payload } = data;
  const doc = await db.collection("campaigns").doc(campaignId).get();
  if (!doc.exists) return { success: false, message: "找不到 campaign" };
  // Auth check: must own the comp
  const compDoc = await db.collection("competitions").doc(doc.data().compId).get();
  if (!compDoc.exists || (request.authUser.role !== 'system' && compDoc.data().creator !== request.authUser.username)) {
    return { success: false, message: "權限不足" };
  }
  const update = {};
  if (payload.subject !== undefined) update.subject = String(payload.subject).slice(0, 200);
  if (payload.body !== undefined) update.body = String(payload.body).slice(0, 20000);
  if (Array.isArray(payload.channels)) update.channels = payload.channels.filter(c => ['email','sms','line'].includes(c));
  if (payload.recipientFilter !== undefined) update.recipientFilter = payload.recipientFilter;
  if (payload.scheduledFor !== undefined) update.scheduledFor = payload.scheduledFor;
  if (Object.keys(update).length) await doc.ref.update(update);
  return { success: true };
});

exports.deleteCampaign = compAuthCallable(async (data, request) => {
  const doc = await db.collection("campaigns").doc(data.campaignId).get();
  if (!doc.exists) return { success: false, message: "找不到" };
  const compDoc = await db.collection("competitions").doc(doc.data().compId).get();
  if (request.authUser.role !== 'system' && compDoc.data().creator !== request.authUser.username) {
    return { success: false, message: "權限不足" };
  }
  await doc.ref.delete();
  return { success: true };
});

// Rewrite body links → click-tracking redirect, and append a 1x1 open-tracking pixel.
// (Aggregate per-campaign tracking; the single multi-recipient mail can't track per person.)
function _injectCampaignTracking(bodyHtml, campaignId) {
  const cid = encodeURIComponent(campaignId);
  let html = String(bodyHtml || '').replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi,
    (m, url) => 'href="' + FUNCTIONS_BASE + '/trackClick?c=' + cid + '&u=' + encodeURIComponent(url) + '"');
  html += '<img src="' + FUNCTIONS_BASE + '/trackOpen?c=' + cid + '" width="1" height="1" alt="" style="display:none">';
  return html;
}

// Core campaign delivery. No request-auth here — callers (sendCampaignNow manual,
// processScheduledCampaigns cron) must authorise first.
async function _deliverCampaign(campaignId, actorUsername) {
  const doc = await db.collection("campaigns").doc(campaignId).get();
  if (!doc.exists) return { success: false, message: "找不到 campaign" };
  const camp = doc.data();
  const compDoc = await db.collection("competitions").doc(camp.compId).get();
  if (!compDoc.exists) return { success: false, message: "找不到活動" };
  const cfg = compDoc.data().config || {};

  const teamSnap = await db.collection("teams").where("compId", "==", camp.compId).get();
  const teamIds = new Set();
  teamSnap.docs.forEach(d => {
    const t = d.data();
    if (t.status === '已取消') return;
    if (camp.recipientFilter === 'paid' && !(t.paymentStatus || '').includes('已確認')) return;
    if (camp.recipientFilter === 'unpaid' && (t.paymentStatus || '').includes('已確認')) return;
    if (camp.recipientFilter === 'waitlist' && !(t.status || '').startsWith('備取')) return;
    teamIds.add(d.id);
  });
  const memSnap = teamIds.size > 0
    ? await db.collection("members").where("compId", "==", camp.compId).get()
    : { docs: [] };
  const emails = new Set();
  memSnap.docs.forEach(d => {
    const m = d.data();
    if (teamIds.has(m.teamId) && m.email) emails.add(m.email);
  });

  let sentCount = 0;
  if ((camp.channels || []).includes('email') && emails.size > 0) {
    const inner = _injectCampaignTracking((camp.body || '').replace(/\n/g, '<br>'), campaignId);
    const html = emailWrap(camp.subject || '活動公告', inner);
    await db.collection("mail").add({
      to: Array.from(emails),
      message: { subject: '[' + (cfg.competitionName || '活動') + '] ' + camp.subject, html, text: camp.body }
    });
    sentCount += emails.size;
  }
  const smsLineNote = ((camp.channels || []).includes('sms') ? 'SMS ' : '') + ((camp.channels || []).includes('line') ? 'LINE' : '');
  await doc.ref.update({
    status: 'sent', sentAt: fmtNow(),
    'stats.recipients': emails.size, 'stats.sent': sentCount, 'stats.smsLineQueued': smsLineNote || ''
  });
  await auditLog(actorUsername || 'system', "sendCampaign", campaignId, sentCount + " emails");
  return { success: true, sent: sentCount, channels: camp.channels };
}

exports.sendCampaignNow = compAuthCallable(async (data, request) => {
  await requireCompFeature(request, "campaigns");
  const { campaignId } = data;
  const doc = await db.collection("campaigns").doc(campaignId).get();
  if (!doc.exists) return { success: false, message: "找不到 campaign" };
  const compDoc = await db.collection("competitions").doc(doc.data().compId).get();
  if (!compDoc.exists) return { success: false, message: "找不到活動" };
  if (request.authUser.role !== 'system' && compDoc.data().creator !== request.authUser.username) {
    return { success: false, message: "權限不足" };
  }
  return _deliverCampaign(campaignId, request.authUser.username);
});

// #4: mark a campaign to auto-send at a future time (picked up by processScheduledCampaigns).
exports.scheduleCampaign = compAuthCallable(async (data, request) => {
  await requireCompFeature(request, "campaigns");
  const { campaignId, scheduledFor } = data;
  const doc = await db.collection("campaigns").doc(campaignId).get();
  if (!doc.exists) return { success: false, message: "找不到 campaign" };
  const compDoc = await db.collection("competitions").doc(doc.data().compId).get();
  if (!compDoc.exists || (request.authUser.role !== 'system' && compDoc.data().creator !== request.authUser.username)) {
    return { success: false, message: "權限不足" };
  }
  const when = new Date(scheduledFor).getTime();
  if (!when || isNaN(when)) return { success: false, message: "排程時間無效" };
  if (when < Date.now() - 60000) return { success: false, message: "排程時間需為未來" };
  await doc.ref.update({ status: 'scheduled', scheduledFor: new Date(when).toISOString() });
  await auditLog(request.authUser.username, "scheduleCampaign", campaignId, new Date(when).toISOString());
  return { success: true, scheduledFor: new Date(when).toISOString() };
});

// #5: open-tracking pixel — increments stats.opened, returns a 1x1 transparent GIF.
exports.trackOpen = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  try {
    const cid = String((req.query && req.query.c) || "");
    if (cid) await db.collection("campaigns").doc(cid).update({ "stats.opened": FieldValue.increment(1) }).catch(() => {});
  } catch (e) { /* never fail an image */ }
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.status(200).send(gif);
});

// #5: click-tracking redirect — increments stats.clicked, 302s to the original (validated) URL.
exports.trackClick = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  const cid = String((req.query && req.query.c) || "");
  const url = String((req.query && req.query.u) || "");
  if (!/^https?:\/\//i.test(url)) { res.status(400).send("bad url"); return; }   // no open-redirect
  try { if (cid) await db.collection("campaigns").doc(cid).update({ "stats.clicked": FieldValue.increment(1) }).catch(() => {}); } catch (e) {}
  res.redirect(302, url);
});

// #7: public poster image endpoint — serves the stored base64 poster as real image bytes so it
// can be used as an og:image URL (Firestore-stored posters have no public URL otherwise).
exports.posterImage = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  try {
    const compId = String((req.query && (req.query.comp || req.query.id)) || "");
    if (!compId) { res.status(400).send("missing comp"); return; }
    const doc = await db.collection("competitions").doc(compId).get();
    const posterDocId = doc.exists ? doc.data().posterDocId : "";
    if (!posterDocId) { res.status(404).send("no poster"); return; }
    const pDoc = await db.collection("posterFiles").doc(posterDocId).get();
    if (!pDoc.exists) { res.status(404).send("no poster"); return; }
    const p = pDoc.data();
    res.set("Content-Type", p.mimeType || "image/png");
    res.set("Cache-Control", "public, max-age=3600");
    res.status(200).send(Buffer.from(p.data || "", "base64"));
  } catch (e) { res.status(500).send("error"); }
});

// #7: share/SSR route (/e/{compId}). Serves the REAL detail app with per-event OG/Twitter meta
// injected into <head> so social shares + crawlers get a proper title/description/image. The
// static /events/detail.html funnel page is left untouched (in-app navigation still uses it).
let _detailTemplate = null;
exports.eventShare = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  const fallbackId = ((req.path || "").split("/e/")[1] || "").split(/[?#]/)[0];
  try {
    const m = (req.path || "").match(/\/e\/([^\/?#]+)/);
    const compId = m ? decodeURIComponent(m[1]) : String((req.query && req.query.comp) || "");
    if (!compId) { res.redirect(302, "/events/"); return; }
    if (!_detailTemplate) {
      const tr = await fetch(PROJECT_HOST + "/events/detail.html");
      _detailTemplate = await tr.text();
    }
    const doc = await db.collection("competitions").doc(compId).get();
    const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    let title = "活動報名 · RegMaster", desc = "立即在 RegMaster 報名這場活動。", img = "";
    if (doc.exists) {
      const r = doc.data(); const cfg = r.config || {};
      title = (cfg.competitionName || r.name || "活動報名") + " · RegMaster";
      desc = String(cfg.descriptionSummary || "").slice(0, 160) || ("立即報名「" + (cfg.competitionName || "") + "」。");
      if (r.posterDocId) img = FUNCTIONS_BASE + "/posterImage?comp=" + encodeURIComponent(compId);
    }
    const url = PROJECT_HOST + "/e/" + encodeURIComponent(compId);
    let og = '\n<meta property="og:type" content="website">' +
      '\n<meta property="og:title" content="' + esc(title) + '">' +
      '\n<meta property="og:description" content="' + esc(desc) + '">' +
      '\n<meta property="og:url" content="' + esc(url) + '">' +
      '\n<meta name="twitter:card" content="' + (img ? "summary_large_image" : "summary") + '">' +
      '\n<meta name="twitter:title" content="' + esc(title) + '">' +
      '\n<meta name="twitter:description" content="' + esc(desc) + '">' +
      '\n<meta name="description" content="' + esc(desc) + '">';
    if (img) og += '\n<meta property="og:image" content="' + esc(img) + '">\n<meta name="twitter:image" content="' + esc(img) + '">';
    og += '\n<script>window.__SHARE_COMP__=' + JSON.stringify(compId) + ';</script>';
    let html = _detailTemplate
      .replace(/<title>[\s\S]*?<\/title>/i, "<title>" + esc(title) + "</title>")
      .replace(/<\/head>/i, og + "\n</head>");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.status(200).send(html);
  } catch (e) {
    console.error("eventShare error:", e);
    res.redirect(302, "/events/detail.html?comp=" + encodeURIComponent(fallbackId));
  }
});

// ---- Multi-judge scoring ----
// Schema: scores/{compId_teamId_judgeId} = { compId, teamId, judgeId, items[], totalScore, comment, createdAt }
// Legacy saveScore (single-judge) still works; we just add a new shape.

exports.submitJudgeScore = compAuthCallable("scoring", async (data, request) => {
  await requireCompFeature(request, "scoring");
  const { compId, teamId, cells, items, totalScore, comment } = data;
  if (!compId || !teamId) return { success: false, message: "缺少 compId / teamId" };
  const judgeId = request.authUser.username;
  // Judges may only score teams in a panel they belong to (when panels are defined).
  if (request.memberRoleName === "judge") {
    const cDoc = await db.collection("competitions").doc(compId).get();
    const panels = (cDoc.exists && cDoc.data().config && cDoc.data().config.scoringPanels) || [];
    const myPanels = panels.filter(p => (p.judges || []).indexOf(judgeId) >= 0);
    // UX-019: match by GROUP (dynamic) — same rule as judgeContext so newly-registered
    // teams in the judge's group are scorable without re-editing the panel.
    if (myPanels.length) {
      const tDoc = await db.collection("teams").doc(teamId).get();
      const tGroup = (tDoc.exists && tDoc.data().group) || "";
      const ok = myPanels.some(p =>
        (!p.group || tGroup === p.group) ||
        (Array.isArray(p.teams) && p.teams.indexOf(teamId) >= 0)
      );
      if (!ok) return { success: false, message: "此隊伍未指派給您評分" };
    }
  }
  const docId = compId + '_' + teamId + '_' + judgeId;
  const rec = { compId, teamId, judgeId, comment: String(comment || '').slice(0, 1000), updatedAt: fmtNow() };
  if (cells && typeof cells === 'object') {
    // New (v3): per-leaf record arrays — { leafId: [v1, v2, ...] }
    const clean = {}; Object.keys(cells).slice(0, 300).forEach(k => { const arr = Array.isArray(cells[k]) ? cells[k] : [cells[k]]; clean[String(k).slice(0, 40)] = arr.slice(0, 20).map(x => parseFloat(x) || 0); });
    rec.cells = clean; rec.schemaVersion = 'v3';
  } else {
    // Legacy (v2): items[] + totalScore
    rec.items = Array.isArray(items) ? items.slice(0, 40).map(it => ({ key: String(it.key || '').slice(0, 40), label: String(it.label || '').slice(0, 80), score: parseFloat(it.score) || 0, maxScore: parseFloat(it.maxScore) || 100, weight: parseFloat(it.weight) || 1 })) : [];
    rec.totalScore = parseFloat(totalScore) || 0; rec.schemaVersion = 'v2';
  }
  await db.collection("scores").doc(docId).set(rec, { merge: true });
  await auditLog(judgeId, "submitJudgeScore", teamId, "");
  return { success: true };
});

// Live leaderboard — now powered by the full compute engine. Hidden from judges when the
// organiser has judgeSeeLiveRanking off (fairness).
exports.getLiveLeaderboard = compAuthCallable("scoring", async (data, request) => {
  const compId = String(data.compId || "");
  if (request.memberRoleName === "judge") {
    const d = await db.collection("competitions").doc(compId).get();
    if (!(d.exists && d.data().config && d.data().config.judgeSeeLiveRanking === true)) return { hidden: true, rows: [] };
  }
  const c = await computeScoring(compId);
  const rows = c.results.slice().sort((a, b) => (a.rankOverall || 0) - (b.rankOverall || 0)).map(r => ({ teamId: r.teamId, teamNameCN: r.teamNameCN, group: r.group, avg: r.total, judgeCount: r.judgeCount, rank: r.rankOverall, rankInGroup: r.rankInGroup }));
  return { rows };
});

// ===== Scoring rubric / panels / fairness config (Phase A) =====
function _clampN(v, lo, hi, d) { const n = Number(v); if (!Number.isFinite(n)) return d; return Math.min(hi, Math.max(lo, n)); }
// Recursively sanitize a rubric node. Max 3 levels (主項→細項→子細項). A node with children
// is a branch; a node without is a leaf (carries max / records / aggregateRecords / normalize).
function sanitizeRubricNode(n, depth) {
  if (!n || typeof n !== "object" || depth > 3) return null;
  const out = {
    id: (String(n.id || "").slice(0, 40)) || ("n" + crypto.randomBytes(4).toString("hex")),
    label: String(n.label || "").slice(0, 80),
    weightPct: _clampN(n.weightPct, 0, 100, 0)
  };
  const kids = (Array.isArray(n.children) && depth < 3)
    ? n.children.map(c => sanitizeRubricNode(c, depth + 1)).filter(Boolean) : [];
  if (kids.length) {
    out.children = kids;
  } else {
    out.max = _clampN(n.max, 0, 1e6, 100) || 100;
    out.records = Math.min(20, Math.max(1, parseInt(n.records, 10) || 1));
    out.aggregateRecords = ["avg", "max", "min", "last"].indexOf(n.aggregateRecords) >= 0 ? n.aggregateRecords : "avg";
    // Default leaf normalization is Student-t (fairest); compute engine auto-falls back to
    // linear (raw/max×100) when a panel has too few teams (n<5).
    out.normalize = ["none", "linear", "zscore", "tdist"].indexOf(n.normalize) >= 0 ? n.normalize : "tdist";
  }
  return out;
}
// Each sibling group's weightPct must sum to 100 (±0.5). Returns an error string or "".
function validateRubricWeights(nodes, path) {
  if (!Array.isArray(nodes) || !nodes.length) return "";
  const sum = nodes.reduce((a, b) => a + (Number(b.weightPct) || 0), 0);
  if (Math.abs(sum - 100) > 0.5) return (path || "最上層") + " 的權重加總為 " + sum + "%，需等於 100%";
  for (const n of nodes) {
    if (n.children && n.children.length) {
      const e = validateRubricWeights(n.children, (path ? path + " › " : "") + (n.label || n.id));
      if (e) return e;
    }
  }
  return "";
}
function sanitizePanels(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 100).map(p => ({
    id: (String((p && p.id) || "").slice(0, 40)) || ("p" + crypto.randomBytes(4).toString("hex")),
    label: String((p && p.label) || "").slice(0, 60),
    group: String((p && p.group) || "").slice(0, 80),
    judges: Array.isArray(p && p.judges) ? p.judges.slice(0, 100).map(x => String(x).slice(0, 60)) : [],
    teams: Array.isArray(p && p.teams) ? p.teams.slice(0, 5000).map(x => String(x).slice(0, 40)) : []
  }));
}

// Manager-authored scoring configuration (rubric + panels + fairness toggles), stored in
// competitions/{compId}.config. Read back via getCompetitionConfig.
exports.saveScoringConfig = compAuthCallable("manage", async (data, request) => {
  // UX-002: gate the SCORING SETUP on the plan too (previously only role-gated, so a
  // FREE org could fully configure rubric/panels/fairness; only score submission was blocked).
  await requireCompFeature(request, "scoring");
  const compId = String(data.compId || "");
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "找不到活動" };
  const nodes = Array.isArray(data.nodes) ? data.nodes.map(n => sanitizeRubricNode(n, 1)).filter(Boolean) : [];
  const wErr = validateRubricWeights(nodes, "");
  if (wErr) return { success: false, message: "權重驗證失敗：" + wErr };
  const cfg = doc.data().config || {};
  cfg.scoringRubric = {
    aggregateJudges: ["avg", "max", "min"].indexOf(data.aggregateJudges) >= 0 ? data.aggregateJudges : "avg",
    trimExtremes: data.trimExtremes === true,
    nodes
  };
  cfg.scoringPanels = sanitizePanels(data.scoringPanels);
  cfg.judgeSeeRegistrantInfo = data.judgeSeeRegistrantInfo === true;
  cfg.judgeSeeLiveRanking = data.judgeSeeLiveRanking === true;
  await ref.update({ config: cfg });
  await auditLog(request.authUser.username, "saveScoringConfig", compId, "");
  return { success: true };
});

// ===== Scoring compute engine (Phase C) — stats + t-distribution normalization =====
function _erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911; const t = 1 / (1 + p * x); const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x); return s * y; }
function _normalCdf(z) { return 0.5 * (1 + _erf(z / Math.SQRT2)); }
function _lgamma(z) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - _lgamma(1 - z); z -= 1; let a = c[0]; const t = z + g + 0.5; for (let i = 1; i < g + 2; i++) a += c[i] / (z + i); return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a); }
function _betacf(a, b, x) { const FPMIN = 1e-30; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-10) break; } return h; }
function _betai(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(_lgamma(a + b) - _lgamma(a) - _lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * _betacf(a, b, x) / a : 1 - bt * _betacf(b, a, 1 - x) / b; }
// Student-t CDF P(T<=t) for `df` degrees of freedom.
function _studentTcdf(t, df) { const x = df / (df + t * t); const p = 0.5 * _betai(df / 2, 0.5, x); return t > 0 ? 1 - p : p; }
function _mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
function _sampleStd(a) { if (a.length < 2) return 0; const m = _mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); }
function _aggRecords(arr, mode) { if (!arr.length) return 0; if (mode === "max") return Math.max(...arr); if (mode === "min") return Math.min(...arr); if (mode === "last") return arr[arr.length - 1]; return _mean(arr); }
function _aggJudges(arr, mode) { if (!arr.length) return 0; if (mode === "max") return Math.max(...arr); if (mode === "min") return Math.min(...arr); return _mean(arr); }
// Normalize one team's leaf value to 0–100 against the distribution `vals` (within its panel).
function _normalizeValue(v, vals, mode, max) {
  const pct = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
  if (mode === "none") return pct;
  if (mode === "linear") { const mn = Math.min(...vals), mx = Math.max(...vals); return mx === mn ? pct : (v - mn) / (mx - mn) * 100; }
  // zscore / tdist → percentile×100
  const m = _mean(vals), sd = _sampleStd(vals); if (sd === 0) return pct;
  const z = (v - m) / sd;
  const p = mode === "tdist" ? _studentTcdf(z, Math.max(1, vals.length - 1)) : _normalCdf(z);
  return Math.max(0, Math.min(100, p * 100));
}
// Full scoring pipeline: per-leaf record-agg → judge-agg(+trim) within panel → normalize within
// panel (tdist default, auto-fallback to linear when panel n<5) → weighted roll-up → rank.
async function computeScoring(compId) {
  const compDoc = await db.collection("competitions").doc(compId).get();
  const cfg = (compDoc.exists ? compDoc.data().config : {}) || {};
  const rubric = cfg.scoringRubric || { aggregateJudges: "avg", trimExtremes: false, nodes: [] };
  const panels = Array.isArray(cfg.scoringPanels) ? cfg.scoringPanels : [];
  const [tSnap, sSnap] = await Promise.all([
    db.collection("teams").where("compId", "==", compId).get(),
    db.collection("scores").where("compId", "==", compId).get()
  ]);
  const teams = {};
  tSnap.docs.forEach(d => { const t = d.data(); if (t.status === "已取消") return; teams[t.teamId] = { teamId: t.teamId, teamNameCN: t.teamNameCN || "", group: t.group || "", status: t.status || "" }; });
  const teamPanel = {};
  panels.forEach(p => (p.teams || []).forEach(tid => { if (teams[tid]) teamPanel[tid] = "P:" + p.id; }));
  Object.keys(teams).forEach(tid => { if (!teamPanel[tid]) teamPanel[tid] = "G:" + (teams[tid].group || ""); });
  const leaves = []; (function walk(ns) { (ns || []).forEach(n => { if (n.children && n.children.length) walk(n.children); else leaves.push(n); }); })(rubric.nodes);
  const leafById = {}; leaves.forEach(l => { leafById[l.id] = l; });
  // per (team, leaf): collect each judge's record-aggregated value
  const sbtl = {}, judgesByTeam = {};
  const pjv = {};   // pjv[tid][jid][leafId] = this judge's record-agg value (for judge-spread box-plot)
  sSnap.docs.forEach(d => {
    const s = d.data(); const tid = s.teamId; if (!teams[tid]) return; const jid = s.judgeId || s.user || "?";
    let cells = s.cells;
    if (!cells && Array.isArray(s.items)) { cells = {}; s.items.forEach(it => { if (it && it.key != null) cells[it.key] = [Number(it.score) || 0]; }); }
    cells = cells || {};
    (judgesByTeam[tid] = judgesByTeam[tid] || new Set()).add(jid);
    leaves.forEach(lf => {
      const r = cells[lf.id]; if (r == null) return;
      const arr = (Array.isArray(r) ? r : [r]).map(Number).filter(Number.isFinite); if (!arr.length) return;
      const rv = _aggRecords(arr, lf.aggregateRecords);
      ((sbtl[tid] = sbtl[tid] || {})[lf.id] = sbtl[tid][lf.id] || []).push(rv);
      ((pjv[tid] = pjv[tid] || {})[jid] = pjv[tid][jid] || {})[lf.id] = rv;
    });
  });
  // consensus per (team, leaf): trim extremes then aggregate judges
  const consensus = {};
  Object.keys(teams).forEach(tid => { consensus[tid] = {}; leaves.forEach(lf => { let vals = (sbtl[tid] && sbtl[tid][lf.id]); if (!vals || !vals.length) return; vals = vals.slice().sort((a, b) => a - b); if (rubric.trimExtremes && vals.length >= 3) vals = vals.slice(1, -1); consensus[tid][lf.id] = _aggJudges(vals, rubric.aggregateJudges); }); });
  // normalize each leaf within each panel
  const norm = {}, leafStats = {};
  leaves.forEach(lf => {
    const byPanel = {};
    Object.keys(teams).forEach(tid => { const v = consensus[tid] && consensus[tid][lf.id]; if (v == null) return; (byPanel[teamPanel[tid]] = byPanel[teamPanel[tid]] || []).push({ tid, v }); });
    Object.keys(byPanel).forEach(pk => {
      const list = byPanel[pk], vals = list.map(o => o.v), n = vals.length;
      const mode = (lf.normalize === "tdist" || lf.normalize === "zscore") && n < 5 ? "linear" : (lf.normalize || "tdist");
      (leafStats[lf.id] = leafStats[lf.id] || {})[pk] = { n, mean: n ? _mean(vals) : 0, std: _sampleStd(vals), min: n ? Math.min(...vals) : 0, max: n ? Math.max(...vals) : 0, modeUsed: mode };
      list.forEach(o => { (norm[o.tid] = norm[o.tid] || {})[lf.id] = _normalizeValue(o.v, vals, mode, lf.max); });
    });
  });
  function nodeScore(node, tid) { if (node.children && node.children.length) { let s = 0; node.children.forEach(c => { s += nodeScore(c, tid) * (Number(c.weightPct) || 0) / 100; }); return s; } const v = norm[tid] && norm[tid][node.id]; return v == null ? 0 : v; }
  const results = Object.keys(teams).map(tid => {
    let total = 0; rubric.nodes.forEach(n => { total += nodeScore(n, tid) * (Number(n.weightPct) || 0) / 100; });
    const breakdown = rubric.nodes.map(n => ({ id: n.id, label: n.label, score: Math.round(nodeScore(n, tid) * 100) / 100, weightPct: n.weightPct }));
    return Object.assign({}, teams[tid], { panelKey: teamPanel[tid], total: Math.round(total * 100) / 100, breakdown, judgeCount: (judgesByTeam[tid] ? judgesByTeam[tid].size : 0), judged: !!(judgesByTeam[tid] && judgesByTeam[tid].size) });
  });
  results.slice().sort((a, b) => b.total - a.total).forEach((r, i) => { r.rankOverall = i + 1; });
  const byG = {}; results.forEach(r => (byG[r.group] = byG[r.group] || []).push(r)); Object.values(byG).forEach(arr => arr.sort((a, b) => b.total - a.total).forEach((r, i) => { r.rankInGroup = i + 1; }));
  // #4: per-group spread of each judge's RAW weighted total (0–100, leaf value÷max×weights). Lets
  // the organiser see how judges scored across a group and where that group's judge scores sit.
  const judgeSpreadByGroup = {};
  Object.keys(teams).forEach(tid => {
    const g = teams[tid].group || "";
    const jmap = pjv[tid] || {};
    Object.keys(jmap).forEach(jid => {
      const rawPct = {};
      leaves.forEach(lf => { const v = jmap[jid][lf.id]; if (v != null) rawPct[lf.id] = (lf.max > 0 ? Math.max(0, Math.min(100, v / lf.max * 100)) : 0); });
      const ns = node => { if (node.children && node.children.length) { let s = 0; node.children.forEach(c => { s += ns(c) * (Number(c.weightPct) || 0) / 100; }); return s; } const v = rawPct[node.id]; return v == null ? 0 : v; };
      let total = 0, any = false;
      rubric.nodes.forEach(n => { total += ns(n) * (Number(n.weightPct) || 0) / 100; });
      leaves.forEach(lf => { if (jmap[jid][lf.id] != null) any = true; });
      if (any) (judgeSpreadByGroup[g] = judgeSpreadByGroup[g] || []).push(Math.round(total * 100) / 100);
    });
  });
  const multiJudgeUsed = results.some(r => (r.judgeCount || 0) >= 2);
  return { rubric: { aggregateJudges: rubric.aggregateJudges, trimExtremes: rubric.trimExtremes, nodes: rubric.nodes }, panels, leaves: leaves.map(l => ({ id: l.id, label: l.label, normalize: l.normalize, max: l.max })), leafStats, results, judgeSpreadByGroup, multiJudgeUsed };
}

// Whether a caller may see individual registrant info for this event (judges gated by toggle).
async function judgeInfoAllowed(request, compId) {
  if (request.memberRoleName !== "judge") return true;
  const d = await db.collection("competitions").doc(String(compId || "")).get();
  return !!(d.exists && d.data().config && d.data().config.judgeSeeRegistrantInfo === true);
}

// Combined scoring read API (one Cloud Function to keep the project under its CPU quota).
// action: 'results' (manager ranked results + stats) | 'judgeContext' (judge console) | 'export'.
exports.scoringApi = compAuthCallable("scoring", async (data, request) => {
  const compId = String(data.compId || "");
  const action = String(data.action || "");
  const compDoc = await db.collection("competitions").doc(compId).get();
  const cfg = (compDoc.exists ? compDoc.data().config : {}) || {};
  const role = request.memberRoleName, me = request.authUser.username;

  if (action === "results") {
    if (role === "judge" && cfg.judgeSeeLiveRanking !== true) return { hidden: true, results: [] };
    return await computeScoring(compId);
  }

  if (action === "judgeContext") {
    if (!compDoc.exists) return { ok: false };
    const panels = Array.isArray(cfg.scoringPanels) ? cfg.scoringPanels : [];
    const tSnap = await db.collection("teams").where("compId", "==", compId).get();
    let teams = tSnap.docs.map(d => d.data()).filter(t => t.status !== "已取消");
    if (role === "judge") {
      const myPanels = panels.filter(p => (p.judges || []).indexOf(me) >= 0);
      // UX-019: assign by GROUP (dynamic) — 不指定組別 = 涵蓋全部、之後新報名的隊伍
      //自動納入；組別指定時涵蓋該組所有隊伍。明確 panel.teams 仍額外納入（向下相容）。
      if (myPanels.length) {
        teams = teams.filter(t => myPanels.some(p =>
          (!p.group || (t.group || "") === p.group) ||
          (Array.isArray(p.teams) && p.teams.indexOf(t.teamId) >= 0)
        ));
      }
    }
    const seeInfo = role !== "judge" || cfg.judgeSeeRegistrantInfo === true;
    const teamsOut = teams.map(t => seeInfo
      ? { teamId: t.teamId, teamNameCN: t.teamNameCN || "", teamNameEN: t.teamNameEN || "", group: t.group || "", customAnswers: t.customAnswers || {} }
      : { teamId: t.teamId, teamNameCN: t.teamNameCN || "", group: t.group || "" });
    const myScores = {};
    const ssnap = await db.collection("scores").where("compId", "==", compId).get();
    ssnap.docs.forEach(d => { const s = d.data(); if ((s.judgeId || s.user) === me && s.teamId) myScores[s.teamId] = { cells: s.cells || {}, comment: s.comment || "" }; });
    return { ok: true, rubric: cfg.scoringRubric || { nodes: [] }, teams: teamsOut, myScores, seeInfo, canSeeRanking: role !== "judge" || cfg.judgeSeeLiveRanking === true };
  }

  if (action === "export") {
    if (role === "judge") return { error: "forbidden" };
    const computed = await computeScoring(compId);
    const sSnap = await db.collection("scores").where("compId", "==", compId).get();
    const raw = sSnap.docs.map(d => { const s = d.data(); return { teamId: s.teamId, judgeId: s.judgeId || s.user || "", cells: s.cells || null, items: s.items || null, totalScore: s.totalScore || null, comment: s.comment || "" }; });
    return { leaves: computed.leaves, results: computed.results, raw };
  }

  return { error: "unknown action" };
});

// ---- Check-in extras (material distribution) ----
// Extends the existing checkInTeam to accept extras (meal/shirt/gift) without
// breaking older clients. This is a backward-compatible signature extension.

// Already exists: exports.checkInTeam — leave untouched. Add a sister
// callable that records extras separately so the legacy field stays clean.
exports.checkInTeamV2 = compAuthCallable("checkin", async (data, request) => {
  await requireCompFeature(request, "checkin");
  const { teamId, extras, attendedMembers, attendedCount } = data;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists) return { success: false, message: "找不到隊伍" };
  const t = tDoc.data();
  const update = {
    checkedIn: true,
    checkInTime: fmtNow(),
    checkInBy: request.authUser.username
  };
  // Per-member attendance (one-QR-per-team + roster checklist). attendedMembers = member doc IDs present.
  if (Array.isArray(attendedMembers)) {
    update.attendedMembers = attendedMembers.slice(0, 200).map(x => String(x).slice(0, 64));
    update.attendedCount = update.attendedMembers.length;
  } else if (attendedCount != null) {
    update.attendedCount = Math.max(0, parseInt(attendedCount, 10) || 0);
  }
  if (extras && typeof extras === 'object') {
    update.checkInExtras = {
      meal: !!extras.meal,
      shirt: extras.shirt ? String(extras.shirt).slice(0, 10) : null,
      gift: !!extras.gift,
      notes: String(extras.notes || '').slice(0, 200)
    };
  }
  await tDoc.ref.update(update);
  await auditLog(request.authUser.username, "checkInTeamV2", teamId, "");
  return { success: true, teamId, teamNameCN: t.teamNameCN || '', group: t.group || '' };
});

// ===== Check-in: roster search + identity panel data (staff) =====
// Search teams by 報名編號 / 隊名 / 成員姓名; returns identity-verification data + roster.
exports.checkinSearch = compAuthCallable("checkin", async (data) => {
  const compId = String(data.compId || "");
  const q = String(data.query || "").trim().toLowerCase();
  const [tSnap, mSnap] = await Promise.all([
    db.collection("teams").where("compId", "==", compId).get(),
    db.collection("members").where("compId", "==", compId).get()
  ]);
  const membersByTeam = {};
  mSnap.docs.forEach(d => { const m = d.data(); (membersByTeam[m.teamId] = membersByTeam[m.teamId] || []).push({ id: d.id, name: m.chineseName || m.englishName || "", englishName: m.englishName || "", birthday: m.birthday || "", idNumber: m.idNumber || "", passport: m.passport || "", nationality: m.nationality || "", role: m.role || "", seq: m.seq || 0 }); });
  const rows = [];
  tSnap.docs.forEach(d => {
    const t = d.data(); if (t.status === "已取消") return;
    const members = (membersByTeam[t.teamId] || []).sort((a, b) => (a.seq || 0) - (b.seq || 0));
    if (q) {
      const hay = [t.teamId, t.teamNameCN, t.teamNameEN, t.remitterName, ...members.map(m => m.name + m.englishName)].join(" ").toLowerCase();
      if (hay.indexOf(q) < 0) return;
    }
    rows.push({
      teamId: t.teamId, teamNameCN: t.teamNameCN || "", teamNameEN: t.teamNameEN || "", group: t.group || "",
      status: t.status || "", paymentStatus: t.paymentStatus || "", note: t.note || "",
      checkedIn: !!t.checkedIn, checkInTime: t.checkInTime || "", attendedCount: t.attendedCount != null ? t.attendedCount : null,
      attendedMembers: Array.isArray(t.attendedMembers) ? t.attendedMembers : null,
      expectedCount: members.length, members
    });
  });
  rows.sort((a, b) => (a.teamNameCN || a.teamId).localeCompare(b.teamNameCN || b.teamId, "zh-Hant"));
  return { rows: rows.slice(0, 200), total: rows.length };
});

// Manager: self-check-in / kiosk configuration, stored in config.selfCheckin.
exports.saveCheckinConfig = compAuthCallable("manage", async (data, request) => {
  const compId = String(data.compId || "");
  const ref = db.collection("competitions").doc(compId);
  const doc = await ref.get(); if (!doc.exists) return { success: false, message: "找不到活動" };
  const sc = data.selfCheckin || {};
  const cfg = doc.data().config || {};
  cfg.selfCheckin = {
    enabled: sc.enabled === true,
    windowStart: String(sc.windowStart || "").slice(0, 40),   // ISO datetime-local string
    windowEnd: String(sc.windowEnd || "").slice(0, 40),
    geofence: {
      enabled: !!(sc.geofence && sc.geofence.enabled),
      lat: sc.geofence && Number.isFinite(Number(sc.geofence.lat)) ? Number(sc.geofence.lat) : null,
      lng: sc.geofence && Number.isFinite(Number(sc.geofence.lng)) ? Number(sc.geofence.lng) : null,
      radiusM: sc.geofence && Number.isFinite(Number(sc.geofence.radiusM)) ? Math.max(20, Math.min(20000, Number(sc.geofence.radiusM))) : 200
    },
    kioskPin: String(sc.kioskPin || "").replace(/\D/g, "").slice(0, 8)
  };
  await ref.update({ config: cfg });
  await auditLog(request.authUser.username, "saveCheckinConfig", compId, "");
  return { success: true };
});

function _haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, toR = x => x * Math.PI / 180;
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Public: registrant self check-in (kiosk or personal device). Enforces enable + time window +
// optional GPS geofence server-side. Identity = teamId (same as the QR). Marks whole team present.
exports.selfCheckIn = callable(async (data) => {
  const compId = String(data.compId || ""), teamId = String(data.teamId || "").trim().toUpperCase();
  if (!teamId) return { success: false, message: "請輸入報名編號" };
  const cDoc = await db.collection("competitions").doc(compId).get();
  const sc = (cDoc.exists && cDoc.data().config && cDoc.data().config.selfCheckin) || {};
  if (sc.enabled !== true) return { success: false, message: "自助報到未開放" };
  const now = Date.now();
  if (sc.windowStart && now < new Date(sc.windowStart).getTime()) return { success: false, message: "自助報到尚未開始" };
  if (sc.windowEnd && now > new Date(sc.windowEnd).getTime()) return { success: false, message: "自助報到已結束" };
  if (sc.geofence && sc.geofence.enabled) {
    const lat = Number(data.lat), lng = Number(data.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { success: false, message: "需要定位權限才能自助報到", reason: "geo" };
    if (sc.geofence.lat != null && sc.geofence.lng != null) {
      const dist = _haversineM(lat, lng, sc.geofence.lat, sc.geofence.lng);
      if (dist > (sc.geofence.radiusM || 200)) return { success: false, message: "您不在活動現場範圍內", reason: "geo" };
    }
  }
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists || tDoc.data().compId !== compId) return { success: false, message: "查無此報名編號" };
  const t = tDoc.data();
  if (t.status === "已取消") return { success: false, message: "此報名已取消" };
  const mSnap = await db.collection("members").where("teamId", "==", teamId).get();
  await tDoc.ref.update({ checkedIn: true, checkInTime: fmtNow(), checkInBy: "self", attendedCount: mSnap.size, attendedMembers: mSnap.docs.map(d => d.id) });
  await auditLog("self", "selfCheckIn", teamId, "");
  return { success: true, teamNameCN: t.teamNameCN || "", group: t.group || "", alreadyCheckedIn: !!t.checkedIn };
});

// =============================================================================
// V3 PHASE 5: Form schema (drag-drop builder) + dual-write to legacy fields
// =============================================================================
//
// New shape:
//   cfg.formSchema = {
//     version: 'v3',
//     sections: [
//       { id, title, desc, role: 'student'|'teacher'|'custom',
//         fields: [ { id, type, label, legacyKey?, req, opts[], help, size, logic? } ] }
//     ]
//   }
//
// Dual-write contract:
//   When saveFormSchema is called we *also* back-derive these legacy fields
//   used by the v1 SPA registration page and Phase 3 /events/register.html:
//     - cfg.studentFields  = fields with role='student' and legacyKey
//     - cfg.teacherFields  = fields with role='teacher' and legacyKey
//     - cfg.customQuestions = fields with role='custom' (no legacyKey)
//     - cfg.memberCount     = max number of "student" repetitions
//     - cfg.teacherCount    = max number of "teacher" repetitions
//     - cfg.dietaryOptions / tshirtOptions extracted from any `dietary` /
//       `tshirt` field's opts (for legacy lookup compat)
//
// Cleanup script (Phase 9c) removes the legacy fields ~3 months after deploy.

const LEGACY_FIELD_KEYS = new Set([
  'chineseName','englishName','idNumber','passport','birthday','school',
  'department','grade','email','phone','address','dietary','tshirt',
  // V3 ported special fields (item 6)
  'gender','nationality','classroom','organization','jobTitle','postalCode',
  // V3 item 5 — additional special fields (confirmed with product)
  'emergencyName','emergencyPhone','emergencyRelation','dietaryRestriction',
  'bloodType','healthNote','invoiceType','invoiceTitle','taxId','accommodation','lineId',
  // V3.1 — additional special fields
  'salutation','city','eduLevel','studentId','referralSource','transportation',
  'accessibility','guardianName','guardianPhone','guardianConsent','consent','website'
]);

function deriveLegacyFromFormSchema(formSchema) {
  const out = {
    studentFields: [],
    teacherFields: [],
    customQuestions: [],
    memberCount: 1,
    teacherCount: 0,
    dietaryOptions: undefined,
    tshirtOptions: undefined
  };
  if (!formSchema || !Array.isArray(formSchema.sections)) return out;

  const seenStudent = new Set();
  const seenTeacher = new Set();
  // Strict rule: 1 區塊 = 1 人. Counts are simple section counts; repeat is ignored.
  let stuTotal = 0, tchTotal = 0;
  for (const sec of formSchema.sections) {
    const role = sec.role || 'custom';
    if (role === 'student') stuTotal += 1;
    if (role === 'teacher') tchTotal += 1;
    for (const f of (sec.fields || [])) {
      if (!f || !f.type) continue;
      if (role === 'student' && f.legacyKey && LEGACY_FIELD_KEYS.has(f.legacyKey)) {
        if (!seenStudent.has(f.legacyKey)) { out.studentFields.push(f.legacyKey); seenStudent.add(f.legacyKey); }
        if (f.legacyKey === 'dietary' && Array.isArray(f.opts) && f.opts.length) out.dietaryOptions = f.opts.slice();
        if (f.legacyKey === 'tshirt'  && Array.isArray(f.opts) && f.opts.length) out.tshirtOptions = f.opts.slice();
      } else if (role === 'teacher' && f.legacyKey && LEGACY_FIELD_KEYS.has(f.legacyKey)) {
        if (!seenTeacher.has(f.legacyKey)) { out.teacherFields.push(f.legacyKey); seenTeacher.add(f.legacyKey); }
      } else {
        // Custom question
        const cq = { q: f.label || f.id || '', type: f.type, req: !!f.req, opts: Array.isArray(f.opts) ? f.opts.slice() : [] };
        out.customQuestions.push(cq);
      }
    }
  }
  if (stuTotal > 0) out.memberCount = stuTotal;
  if (tchTotal > 0) out.teacherCount = tchTotal;
  return out;
}

function buildFormSchemaFromLegacy(cfg) {
  cfg = cfg || {};
  const sections = [];
  const studentFields = (cfg.studentFields || []).slice();
  const teacherFields = (cfg.teacherFields || []).slice();
  const customQuestions = (cfg.customQuestions || []).slice();

  const FIELD_LABELS = {
    chineseName: '中文姓名', englishName: '英文姓名', idNumber: '身分證',
    birthday: '出生年月日', school: '學校', department: '系所', grade: '年級',
    email: 'Email', phone: '電話', address: '地址',
    dietary: '飲食習慣', tshirt: 'T-shirt 尺寸',
    gender: '性別', nationality: '國籍', passport: '護照號碼', classroom: '班級',
    organization: '服務單位', jobTitle: '職稱', postalCode: '郵遞區號',
    emergencyName: '緊急聯絡人', emergencyPhone: '緊急聯絡電話', emergencyRelation: '緊急聯絡關係',
    dietaryRestriction: '飲食限制 / 過敏', bloodType: '血型', healthNote: '特殊健康狀況',
    invoiceType: '發票類型', invoiceTitle: '發票抬頭', taxId: '統一編號', accommodation: '住宿需求', lineId: 'LINE ID',
    salutation: '尊稱', city: '居住縣市', eduLevel: '教育階段', studentId: '學號', referralSource: '如何得知本活動',
    transportation: '交通方式', accessibility: '特殊需求/無障礙', guardianName: '監護人姓名', guardianPhone: '監護人電話',
    guardianConsent: '家長同意', consent: '條款/肖像權同意', website: '網站'
  };
  const FIELD_TYPES = {
    chineseName: 'text', englishName: 'text', idNumber: 'idnumber',
    birthday: 'date', school: 'text', department: 'text', grade: 'text',
    email: 'email', phone: 'tel', address: 'text',
    dietary: 'select', tshirt: 'select',
    gender: 'select', nationality: 'select', passport: 'text', classroom: 'text',
    organization: 'text', jobTitle: 'text', postalCode: 'text',
    emergencyName: 'text', emergencyPhone: 'tel', emergencyRelation: 'text',
    dietaryRestriction: 'select', bloodType: 'select', healthNote: 'textarea',
    invoiceType: 'select', invoiceTitle: 'text', taxId: 'text', accommodation: 'select', lineId: 'text',
    salutation: 'select', city: 'select', eduLevel: 'select', studentId: 'text', referralSource: 'select',
    transportation: 'select', accessibility: 'textarea', guardianName: 'text', guardianPhone: 'tel',
    guardianConsent: 'radio', consent: 'radio', website: 'url'
  };

  // Strict rule: 1 區塊 = 1 人. Split legacy memberCount=N into N student sections
  // (instead of 1 section with repeat=N). Each section gets its own field-id namespace.
  const stuCount = Math.max(1, parseInt(cfg.memberCount, 10) || 1);
  if (studentFields.length > 0) {
    for (let i = 0; i < stuCount; i++) {
      sections.push({
        id: 'sec_student_' + i,
        title: stuCount > 1 ? ('學員 ' + (i + 1)) : '學員資料',
        desc: '請填寫每位學員的資訊',
        role: 'student',
        repeat: 1,
        fields: studentFields.map((k, fi) => ({
          id: 'student_' + i + '_' + k,
          type: FIELD_TYPES[k] || 'text',
          label: FIELD_LABELS[k] || k,
          legacyKey: k, req: true,
          opts: k === 'dietary' ? (cfg.dietaryOptions || []) : k === 'tshirt' ? (cfg.tshirtOptions || []) : []
        }))
      });
    }
  }
  const tchCount = parseInt(cfg.teacherCount, 10) || 0;
  if (teacherFields.length > 0 && tchCount > 0) {
    for (let i = 0; i < tchCount; i++) {
      sections.push({
        id: 'sec_teacher_' + i,
        title: tchCount > 1 ? ('指導者 ' + (i + 1)) : '指導老師',
        desc: '老師的聯絡資訊',
        role: 'teacher',
        repeat: 1,
        fields: teacherFields.map((k, fi) => ({
          id: 'teacher_' + i + '_' + k,
          type: FIELD_TYPES[k] || 'text',
          label: FIELD_LABELS[k] || k,
          legacyKey: k, req: true, opts: []
        }))
      });
    }
  }
  if (customQuestions.length > 0) {
    sections.push({
      id: 'sec_custom', title: '附加問題', desc: '主辦方額外想了解的資訊', role: 'custom',
      repeat: 1,
      fields: customQuestions.map((cq, i) => ({
        id: 'custom_' + i, type: cq.type || 'text', label: cq.q || ('問題 ' + (i+1)),
        req: !!cq.req, opts: cq.opts || []
      }))
    });
  }
  return { version: 'v3-legacy-derived', sections, derivedFromLegacy: true };
}

exports.getFormSchema = compAuthCallable(async (data) => {
  const doc = await db.collection("competitions").doc(data.compId).get();
  if (!doc.exists) return { success: false, message: "找不到活動" };
  const cfg = (doc.data().config) || {};
  if (cfg.formSchema && Array.isArray(cfg.formSchema.sections)) {
    return { success: true, schema: _normaliseSchemaSections(cfg.formSchema), source: 'v3' };
  }
  // Fallback: synthesize from legacy fields
  return { success: true, schema: _normaliseSchemaSections(buildFormSchemaFromLegacy(cfg)), source: 'legacy' };
});

// SECURITY (H-NEW-1, defense-in-depth): server-side sanitizer for form-field `help`.
// The real XSS sink (the registrant's browser) is closed by the client inert DOMParser render,
// but a direct API caller could still POST a malicious schema. This keeps only the same small
// inline allow-list as the client (a/b/strong/em/i/u/br/span), drops every other tag, removes
// ALL attributes except a safe-protocol href on <a>, and caps length. No DOM available here, so
// it is allow-list driven (anything not explicitly permitted is stripped).
function sanitizeHelpServer(input) {
  var s = String(input || '');
  // 1. Remove script/style blocks together with their content.
  s = s.replace(/<(script|style)\b[\s\S]*?(<\/\1\s*>|$)/gi, '');
  // 2. Process every tag: keep only whitelisted ones; strip all attrs except href on <a>.
  const ALLOW = { a: 1, b: 1, strong: 1, em: 1, i: 1, u: 1, br: 1, span: 1 };
  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (m, slash, tag, attrs) => {
    const t = tag.toLowerCase();
    if (!ALLOW[t]) return '';                       // drop disallowed tag (inner text kept)
    if (slash) return '</' + t + '>';               // closing tag → bare
    if (t === 'a') {
      const hm = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
      let url = hm ? (hm[1] || hm[2] || hm[3] || '') : '';
      if (!/^(https?:|mailto:|tel:|\/)/i.test(url)) url = '';
      return url ? '<a href="' + url.replace(/"/g, '%22') + '" rel="noopener noreferrer" target="_blank">' : '<a>';
    }
    return '<' + t + '>';                            // strip attributes from other allowed tags
  });
  return s.slice(0, 200);
}

exports.saveFormSchema = compAuthCallable(async (data, request) => {
  const { compId, schema } = data;
  if (!schema || !Array.isArray(schema.sections)) return { success: false, message: "schema 無效" };

  // Sanitize: cap sizes, strip unknown keys per field.
  // CRITICAL: Firestore rejects `undefined` values, so we must OMIT optional
  // keys entirely rather than setting them to undefined.
  const cleanSchema = {
    version: 'v3',
    sections: schema.sections.slice(0, 20).map(sec => {
      const cleanSec = {
        id: String(sec.id || '').slice(0, 40),
        title: String(sec.title || '').slice(0, 80),
        desc: String(sec.desc || '').slice(0, 200),
        role: ['student','teacher','custom'].includes(sec.role) ? sec.role : 'custom',
        // 1 區塊 = 1 人 (always). The legacy `repeat` field is kept but pinned to 1 on save.
        repeat: 1,
        fields: (sec.fields || []).slice(0, 50).map(f => {
          const cleanF = {
            id: String(f.id || '').slice(0, 40),
            type: String(f.type || 'text').slice(0, 20),
            label: String(f.label || '').slice(0, 100),
            req: !!f.req,
            opts: Array.isArray(f.opts) ? f.opts.slice(0, 50).map(o => String(o).slice(0, 100)) : [],
            help: sanitizeHelpServer(f.help),
            size: ['half','full','third'].includes(f.size) ? f.size : 'half'
          };
          if (f.legacyKey && LEGACY_FIELD_KEYS.has(f.legacyKey)) cleanF.legacyKey = f.legacyKey;
          if (f.logic && typeof f.logic === 'object') cleanF.logic = f.logic;
          return cleanF;
        })
      };
      return cleanSec;
    })
  };

  // Enforce single 附加問題: if multiple custom-role sections slip through, merge their
  // fields into the first and drop the rest. Defends against direct-API calls.
  {
    const customs = cleanSchema.sections.filter(s => s.role === 'custom');
    if (customs.length > 1) {
      const first = customs[0];
      for (let i = 1; i < customs.length; i++) {
        first.fields = first.fields.concat(customs[i].fields || []).slice(0, 50);
      }
      cleanSchema.sections = cleanSchema.sections.filter(s => s.role !== 'custom' || s === first);
    }
  }

  // UX-006: a registration form MUST collect at least one REQUIRED email (in any section —
  // 學員 / 指導者 / 附加問題), otherwise confirmation mail + EDM/通知 can't reach registrants.
  const hasRequiredEmail = cleanSchema.sections.some(sec =>
    (sec.fields || []).some(f => f.type === 'email' && f.req === true));
  if (!hasRequiredEmail) {
    return { success: false, code: 'NO_EMAIL',
      message: "報名表單需至少一個「必填 Email」欄位（學員或指導者區塊皆可），否則無法寄送確認信與通知。請新增後再儲存。" };
  }

  const derived = deriveLegacyFromFormSchema(cleanSchema);

  const update = {
    'config.formSchema': cleanSchema,
    'config.studentFields': derived.studentFields,
    'config.teacherFields': derived.teacherFields,
    'config.customQuestions': derived.customQuestions,
    'config.memberCount': derived.memberCount,
    'config.teacherCount': derived.teacherCount
  };
  if (derived.dietaryOptions !== undefined) update['config.dietaryOptions'] = derived.dietaryOptions;
  if (derived.tshirtOptions !== undefined) update['config.tshirtOptions'] = derived.tshirtOptions;

  await db.collection("competitions").doc(compId).update(update);
  await auditLog(request.authUser.username, "saveFormSchema", compId, cleanSchema.sections.length + " sections");
  return {
    success: true,
    schema: cleanSchema,
    derived: {
      studentFields: derived.studentFields,
      teacherFields: derived.teacherFields,
      customQuestionCount: derived.customQuestions.length,
      memberCount: derived.memberCount,
      teacherCount: derived.teacherCount
    }
  };
});

// =============================================================================
// V3 PHASE 4: Admin dashboard insights + todo aggregation
// =============================================================================

// AI insights (Phase 7 will wire to LLM; Phase 4 returns rule-based heuristic
// suggestions derived from real Firestore data so the UI doesn't show mock).
exports.getAiInsights = authCallable(["system", "competition"], async (data, request) => {
  // AI insights are a PRO+ feature. Lower tiers get a graceful locked payload
  // (this is auto-loaded on the dashboard, so we must not throw here).
  if (request.authUser.role !== "system") {
    const tier = await getEffectiveTier(request.authUser.username);
    if ((TIER_RANK[tier] || 0) < FEATURE_MIN_RANK.ai) {
      return { insights: [], locked: true, tier, message: "AI 洞察為 PRO 以上方案功能，升級即可解鎖。" };
    }
  }
  const username = request.authUser.username;
  const compId = data && data.compId;

  // Pull this user's competitions (or single compId if specified)
  let compSnap;
  if (compId) {
    const d = await db.collection("competitions").doc(compId).get();
    compSnap = { docs: d.exists ? [d] : [] };
  } else if (request.authUser.role === "system") {
    compSnap = await db.collection("competitions").get();
  } else {
    compSnap = await db.collection("competitions").where("creator", "==", username).get();
  }

  const insights = [];
  const now = Date.now();

  for (const cDoc of compSnap.docs) {
    const c = cDoc.data();
    const cfg = c.config || {};
    const max = c.maxTeams || c.maxCapacityLimit || 0;
    const team = c.teamCount || 0;
    const dl = cfg.deadline ? new Date(cfg.deadline).getTime() : 0;
    const daysLeft = dl ? Math.ceil((dl - now) / 86400000) : null;

    // Heuristic 1: nearly full + open
    if (c.isOpen && max > 0 && team / max >= 0.9 && team / max < 1) {
      insights.push({
        severity: "urgent",
        severityLabel: "緊急",
        ago: "剛剛",
        title: `「${c.name}」報名已達 ${Math.round(team / max * 100)}%`,
        body: `已收 ${team} / ${max} 名。預測 24 小時內額滿，建議提前關閉或啟用候補機制。`,
        compId: cDoc.id
      });
    }

    // Heuristic 2: deadline approaching with low fill
    if (c.isOpen && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && max > 0 && team / max < 0.5) {
      insights.push({
        severity: "tip",
        severityLabel: "建議",
        ago: "剛剛",
        title: `「${c.name}」報名數偏低`,
        body: `截止前還有 ${daysLeft} 天，目前僅 ${team}/${max} 報名（${Math.round(team / max * 100)}%）。建議寄送 EDM 提醒或加強社群推廣。`,
        compId: cDoc.id
      });
    }

    // Heuristic 3: payment lag — count pending payments
    if (team > 0) {
      const tSnap = await db.collection("teams").where("compId", "==", cDoc.id).get();
      let payWait = 0;
      tSnap.docs.forEach(d => {
        const t = d.data();
        if (t.status === "已取消") return;
        if (!(t.paymentStatus || "").includes("已確認")) payWait++;
      });
      if (payWait > 0 && payWait / team > 0.2) {
        insights.push({
          severity: "tip",
          severityLabel: "建議",
          ago: "剛剛",
          title: `「${c.name}」有 ${payWait} 筆待付款`,
          body: `占總報名 ${Math.round(payWait / team * 100)}%。建議寄送付款提醒信，可提升轉換率約 15%。`,
          compId: cDoc.id
        });
      }
    }
  }

  // Cap to top 5
  insights.sort((a, b) => {
    const order = { urgent: 0, tip: 1, success: 2 };
    return (order[a.severity] || 9) - (order[b.severity] || 9);
  });
  return { insights: insights.slice(0, 5) };
});

// Todo list — real aggregation from teams + competitions
exports.getTodoList = authCallable(["system", "competition"], async (data, request) => {
  const username = request.authUser.username;
  const compId = data && data.compId;

  let compSnap;
  if (compId) {
    const d = await db.collection("competitions").doc(compId).get();
    compSnap = { docs: d.exists ? [d] : [] };
  } else if (request.authUser.role === "system") {
    compSnap = await db.collection("competitions").get();
  } else {
    compSnap = await db.collection("competitions").where("creator", "==", username).get();
  }

  const todos = [];
  const now = Date.now();

  for (const cDoc of compSnap.docs) {
    const c = cDoc.data();
    const cfg = c.config || {};

    // Todo 1: pending payments
    if ((c.teamCount || 0) > 0) {
      const tSnap = await db.collection("teams").where("compId", "==", cDoc.id).get();
      let payWait = 0, fileWait = 0;
      tSnap.docs.forEach(d => {
        const t = d.data();
        if (t.status === "已取消") return;
        if (!(t.paymentStatus || "").includes("已確認")) payWait++;
        if (t.fileUrl && t.fileApproved !== true && cfg.requireFileUpload) fileWait++;
      });
      if (payWait > 0) {
        todos.push({
          priority: payWait > 10 ? "high" : "med",
          title: `確認 ${payWait} 筆付款`,
          body: `${c.name} · 待主辦方人工核對`,
          link: `/admin/events/${cDoc.id}#registrations`,
          compId: cDoc.id
        });
      }
      if (fileWait > 0) {
        todos.push({
          priority: "med",
          title: `審核 ${fileWait} 份檔案上傳`,
          body: `${c.name} · 學員提交檔案待審核`,
          link: `/admin/events/${cDoc.id}#registrations`,
          compId: cDoc.id
        });
      }
    }

    // Todo 2: deadline approaching
    if (c.isOpen && cfg.deadline) {
      const dl = new Date(cfg.deadline).getTime();
      const daysLeft = Math.ceil((dl - now) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 3) {
        todos.push({
          priority: daysLeft <= 1 ? "high" : "med",
          title: `${c.name} 報名截止前 ${daysLeft} 天`,
          body: '即將截止 · 建議發布最後提醒公告',
          link: `/admin/events/${cDoc.id}#announcements`,
          compId: cDoc.id
        });
      }
    }

    // Todo 3: drafts (not visible, no isOpen, no deadline)
    if (!c.isVisible && !c.isOpen && !cfg.deadline && c.teamCount === 0) {
      const createdAt = c.createdAt || "";
      todos.push({
        priority: "low",
        title: `草稿活動「${c.name}」未發布`,
        body: '建立於 ' + (createdAt || '日期不明') + ' · 點擊繼續設定',
        link: `/admin/events/${cDoc.id}`,
        compId: cDoc.id
      });
    }
  }

  // Sort: high → med → low
  todos.sort((a, b) => {
    const pr = { high: 0, med: 1, low: 2 };
    return (pr[a.priority] || 9) - (pr[b.priority] || 9);
  });

  return { todos: todos.slice(0, 8) };
});

// ===== Public: list a person's registrations across events =====
// Looks up by email OR phone (matches members.email/members.phone). Returns
// a list of teams the person is part of. Verification mode:
//   - "lookup": just returns the team summary (no sensitive fields)
//   - "withCreds": also returns the team password if the requester proves they
//     own the email by also providing teamId + matching password (server-side
//     re-verification of teamId+pwd pair). For Phase 3 we keep it simple:
//     return non-sensitive summary only. Password lookup remains via legacy
//     lookupRegistration + loginTeam.
exports.listMyRegistrationsByEmail = callable(async (data, request) => {
  const { email, phone } = data || {};
  if (!email && !phone) return { success: false, message: "請提供 Email 或電話" };
  // N-4 fix: this stays public (registrants look up their own registrations without logging in),
  // but throttle per-IP + audit so it can't be used as a bulk email/PII-enumeration oracle.
  const _rl = await checkRateLimit("lreg_ip_" + clientIp(request), 10, 600000);  // 10 / 10 min / IP
  if (!_rl.ok) return { success: false, message: "查詢過於頻繁，請稍後再試" };

  // Find members matching email or phone
  const membersFound = new Map(); // teamId -> member info
  if (email) {
    const sn = await db.collection("members").where("email", "==", String(email).trim()).get();
    sn.docs.forEach(d => { const m = d.data(); membersFound.set(m.teamId, m); });
  }
  if (phone) {
    const sn = await db.collection("members").where("phone", "==", String(phone).trim()).get();
    sn.docs.forEach(d => { const m = d.data(); if (!membersFound.has(m.teamId)) membersFound.set(m.teamId, m); });
  }

  if (membersFound.size === 0) return { success: true, registrations: [] };

  // Fetch each team + its competition (skip orphans)
  const regs = [];
  for (const [teamId, mem] of membersFound) {
    const tDoc = await db.collection("teams").doc(teamId).get();
    if (!tDoc.exists) continue;
    const t = tDoc.data();
    if (t.status === "已取消") continue;
    const cDoc = await db.collection("competitions").doc(t.compId).get();
    if (!cDoc.exists) continue;
    const c = cDoc.data();
    const cfg = c.config || {};
    regs.push({
      teamId, compId: t.compId,
      competitionName: cfg.competitionName || c.name || "",
      competitionDate: cfg.competitionDate || "",
      deadline: c.deadline || "",
      status: t.status || "",
      paymentStatus: t.paymentStatus || "",
      group: t.group || "",
      teamNameCN: t.teamNameCN || "",
      teamNameEN: t.teamNameEN || "",
      memberName: mem.chineseName || mem.englishName || "",
      memberRole: mem.role || "",
      registrationTime: t.registrationTime || "",
      posterUrl: cfg.posterUrl || "",
      category: cfg.category || "",
      isOpen: c.isOpen === true,
      requiresPayment: !!(cfg.registrationFee && cfg.registrationFee > 0)
    });
  }
  // Sort: upcoming first, then by date desc
  regs.sort((a, b) => {
    return (b.registrationTime || "").localeCompare(a.registrationTime || "");
  });
  // N-4: audit the lookup (masked) so bulk-enumeration attempts are detectable after the fact.
  try {
    const maskedEmail = String(email || "").replace(/^(.).*(@.*)$/, "$1***$2");
    await auditLog("訪客", "查詢個人報名", maskedEmail || (phone ? "phone" : ""), "hits=" + regs.length);
  } catch (e) { /* audit best-effort */ }
  return { success: true, registrations: regs };
});

// ===== 報名者身分：以「社群帳號已驗證的 Email」為識別 =====
// 社群登入 → 該 Email → 名下所有報名（完整權限）。Email/電話手動查詢 → 唯讀。
// registrants/{emailLower} 記錄綁定狀態，供「已綁定」顯示與系統管理員「報名帳號」分頁。
async function verifySocialIdentity(provider, token) {
  if (provider === "google") {
    const dec = await admin.auth().verifyIdToken(token);
    if (dec.email_verified === false) throw new Error("此 Google 帳號 Email 尚未驗證");
    return { provider, sub: dec.uid, name: dec.name || "", email: (dec.email || "").toLowerCase().trim() };
  }
  if (provider === "line") {
    const id = await lineExchangeAndVerify(token);
    return { provider, sub: id.lineUserId, name: id.name || "", email: (id.email || "").toLowerCase().trim() };
  }
  throw new Error("未知的社群登入方式");
}
async function upsertRegistrant(s) {
  if (!s.email) return;
  const upd = { email: s.email, updatedAt: fmtNow() };
  if (s.provider === "google") { upd.googleSub = s.sub; upd.googleName = s.name; }
  if (s.provider === "line") { upd.lineUserId = s.sub; upd.lineName = s.name; }
  await db.collection("registrants").doc(s.email).set(upd, { merge: true });
}
// All registrations whose member email matches. includePassword for verified (social) callers.
async function regsByEmail(email, includePassword) {
  const e = String(email || "").trim();
  if (!e) return [];
  const sn = await db.collection("members").where("email", "==", e).get();
  const teamIds = new Set();
  sn.docs.forEach(d => { const m = d.data(); if (m.teamId) teamIds.add(m.teamId); });
  const regs = [];
  for (const tid of teamIds) {
    const tDoc = await db.collection("teams").doc(tid).get();
    if (!tDoc.exists) continue;
    const t = tDoc.data();
    if (t.status === "已取消") continue;
    const cDoc = await db.collection("competitions").doc(t.compId).get();
    if (!cDoc.exists) continue;
    const c = cDoc.data(); const cfg = c.config || {};
    const row = {
      teamId: t.teamId || tid, compId: t.compId,
      competitionName: cfg.competitionName || c.name || "", competitionDate: cfg.competitionDate || "",
      deadline: c.deadline || "", status: t.status || "", paymentStatus: t.paymentStatus || "",
      group: t.group || "", teamNameCN: t.teamNameCN || "", teamNameEN: t.teamNameEN || "",
      registrationTime: t.registrationTime || "", category: cfg.category || "", isOpen: c.isOpen === true,
      requiresPayment: !!(cfg.registrationFee && cfg.registrationFee > 0)
    };
    if (includePassword) row.password = t.password || "";
    regs.push(row);
  }
  regs.sort((a, b) => (b.registrationTime || "").localeCompare(a.registrationTime || ""));
  return regs;
}
// Explicit bind from a team's manage view (proven by team password); records the social↔email link.
exports.bindRegistrantSocial = callable(async (data) => {
  const { compId, teamId, password, provider, token } = data;
  const tDoc = await db.collection("teams").doc(teamId).get();
  if (!tDoc.exists || tDoc.data().compId !== compId) return { success: false, message: "找不到報名資料" };
  if (!verifyTeamPwd(tDoc.data(), password)) return { success: false, message: "密碼錯誤" };
  let s;
  try { s = await verifySocialIdentity(provider, token); }
  catch (e) { return { success: false, message: (provider === "line" ? "LINE" : "Google") + " 驗證失敗：" + e.message }; }
  if (!s.email) return { success: false, message: provider === "line" ? "LINE 未提供 Email（請確認已開啟 Email 權限）" : "無法取得 Google Email" };
  await upsertRegistrant(s);
  return { success: true, provider, email: s.email };
});
// Social login: verified Email → all registrations under it (full access). Also records the binding.
exports.listMyRegistrationsBySocial = callable(async (data) => {
  const { provider, token } = data;
  let s;
  try { s = await verifySocialIdentity(provider, token); }
  catch (e) { return { success: false, message: (provider === "line" ? "LINE" : "Google") + " 驗證失敗：" + e.message }; }
  if (!s.email) return { success: false, message: "無法取得此社群帳號的 Email，請改用報名編號+密碼登入。" };
  await upsertRegistrant(s);
  const regs = await regsByEmail(s.email, true);
  return { success: true, email: s.email, registrations: regs };
});
// Bind status for a set of emails (for 已綁定 display in the team manage view).
exports.getRegistrantStatus = callable(async (data) => {
  const emails = Array.isArray(data.emails) ? data.emails : (data.email ? [data.email] : []);
  let google = false, line = false, boundEmail = "";
  for (const em of emails) {
    const e = String(em || "").trim().toLowerCase(); if (!e) continue;
    const d = await db.collection("registrants").doc(e).get();
    if (d.exists) { const r = d.data(); if (r.googleSub) google = true; if (r.lineUserId) line = true; if (r.googleSub || r.lineUserId) boundEmail = e; }
  }
  return { google, line, boundEmail };
});
// System admin: 報名帳號 — collect all registrant emails + bound status + 摘要.
exports.listRegistrants = authCallable(["system"], async () => {
  const [memSnap, teamSnap, regSnap] = await Promise.all([
    db.collection("members").get(),
    db.collection("teams").get(),
    db.collection("registrants").get()
  ]);
  const teamInfo = {};
  teamSnap.docs.forEach(d => {
    const t = d.data();
    teamInfo[t.teamId || d.id] = { compId: t.compId || "", status: t.status || "", paymentStatus: t.paymentStatus || "", registrationTime: t.registrationTime || "" };
  });
  const byEmail = {};
  memSnap.docs.forEach(d => {
    const m = d.data(); const e = String(m.email || "").trim().toLowerCase(); if (!e) return;
    if (!byEmail[e]) byEmail[e] = { email: e, teams: new Set(), comps: new Set(), names: new Set(), lastReg: "", paid: 0, unpaid: 0 };
    const o = byEmail[e];
    if (m.chineseName) o.names.add(m.chineseName);
    const ti = teamInfo[m.teamId];
    if (ti && ti.status !== "已取消" && m.teamId && !o.teams.has(m.teamId)) {
      o.teams.add(m.teamId);
      if (ti.compId) o.comps.add(ti.compId);
      const dk = toDayKey(ti.registrationTime); if (dk > o.lastReg) o.lastReg = dk;
      if (String(ti.paymentStatus).includes("已確認")) o.paid++; else o.unpaid++;
    }
  });
  const bound = {}; regSnap.docs.forEach(d => { bound[d.id] = d.data(); });
  const list = Object.keys(byEmail).map(e => {
    const o = byEmail[e]; const b = bound[e] || {};
    return { email: e, name: Array.from(o.names).slice(0, 3).join("、"), regCount: o.teams.size, activityCount: o.comps.size, lastReg: o.lastReg || "", paid: o.paid, unpaid: o.unpaid, google: !!b.googleSub, line: !!b.lineUserId };
  });
  Object.keys(bound).forEach(e => { if (!byEmail[e]) list.push({ email: e, name: "", regCount: 0, activityCount: 0, lastReg: "", paid: 0, unpaid: 0, google: !!bound[e].googleSub, line: !!bound[e].lineUserId }); });
  list.sort((a, b) => b.regCount - a.regCount || String(b.lastReg).localeCompare(String(a.lastReg)));
  return { registrants: list };
});
// System admin: one registrant's registrations (drill-down for 報名數).
exports.getRegistrantDetail = authCallable(["system"], async (data) => {
  const e = String(data.email || "").trim().toLowerCase();
  if (!e) return { registrations: [] };
  return { email: e, registrations: await regsByEmail(e, false) };
});
exports.deleteRegistrantBinding = authCallable(["system"], async (data) => {
  const e = String(data.email || "").trim().toLowerCase();
  if (!e) return { success: false, message: "缺少 email" };
  await db.collection("registrants").doc(e).delete().catch(() => {});
  await auditLog("system", "解除報名帳號綁定", e, "");
  return { success: true };
});

// ===== Onboarding state: get + save =====
// Per-user wizard progress. Stored in `onboarding/{username}`.
// Both callables require authentication (user can only access their own).
exports.getOnboardingState = authCallable(["system", "competition"], async (data, request) => {
  const targetUser = data.username || request.authUser.username;
  if (targetUser !== request.authUser.username && request.authUser.role !== "system") {
    return { success: false, message: "只能讀取自己的進度" };
  }
  const doc = await db.collection("onboarding").doc(targetUser).get();
  if (!doc.exists) return { success: true, state: null };
  return { success: true, state: doc.data() };
});

exports.saveOnboardingStep = authCallable(["system", "competition"], async (data, request) => {
  const { username, step, data: stepData } = data;
  const targetUser = username || request.authUser.username;
  if (targetUser !== request.authUser.username && request.authUser.role !== "system") {
    return { success: false, message: "只能修改自己的進度" };
  }
  const ref = db.collection("onboarding").doc(targetUser);
  const existing = (await ref.get()).data() || { username: targetUser, createdAt: fmtNow() };

  if (step === "complete") {
    existing.completedAt = (stepData && stepData.completedAt) || fmtNow();
    existing.currentStep = 4;
  } else {
    const stepKey = "step" + String(step);
    existing[stepKey] = stepData || {};
    existing.currentStep = Math.max(parseInt(step, 10) || 1, existing.currentStep || 1);
    existing.updatedAt = fmtNow();
  }
  await ref.set(existing, { merge: true });
  return { success: true };
});

// ============================================================================
// #3 Phase 3 — Org member management (RBAC invites). Owner invites sub-accounts
// (manager/staff/judge), org-wide or event-scoped. Inviting requires the Team
// `roles` feature; the membership records are consumed by compAuthCallable.
// ============================================================================
const RBAC_ROLES = ["manager", "staff", "judge"];
async function ownerHasRolesFeature(username, role) {
  if (role === "system") return true;
  const tier = await getEffectiveTier(username);
  const plans = await getPlans();
  return !!(plans[tier] && plans[tier].features && plans[tier].features.roles);
}

exports.inviteMember = authCallable(["system", "competition"], async (data, request) => {
  const owner = request.authUser.username;
  if (!(await ownerHasRolesFeature(owner, request.authUser.role))) {
    return { success: false, message: "成員與權限為 Team 方案功能，請先升級。" };
  }
  const email = String(data.email || "").trim().toLowerCase();
  const role = String(data.role || "");
  let scope = data.scope;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: "請輸入有效的 Email" };
  if (RBAC_ROLES.indexOf(role) < 0) return { success: false, message: "角色無效" };
  if (scope !== "all" && !Array.isArray(scope)) scope = "all";
  if (email === String(request.authUser.email || "").toLowerCase()) return { success: false, message: "不能邀請自己" };
  const existing = await db.collection("orgMembers").where("orgOwner", "==", owner).get();
  for (const d of existing.docs) { if ((d.data().memberEmail || "").toLowerCase() === email) return { success: false, message: "此 Email 已是成員或已被邀請" }; }
  const ref = await db.collection("orgMembers").add({
    orgOwner: owner, memberEmail: email, memberUsername: "", role, scope,
    status: "invited", token: generateSessionToken(), invitedBy: owner, invitedAt: fmtNow()
  });
  const orgName = request.authUser.organizationName || request.authUser.displayName || owner;
  const link = EMAIL_HOST + "/admin/settings.html#members";
  const html = emailWrap("您被邀請加入 RegMaster 團隊", `
    <p><b>${escMail(orgName)}</b> 邀請您協作其活動。</p>
    <p>請以您的 RegMaster 帳號（Email：${escMail(email)}）登入，於「設定 → 成員與權限」接受邀請。若尚無帳號，請先以此 Email 註冊。</p>
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto"><tr><td style="background:#0A437A;padding:12px 26px;border-radius:8px"><a href="${link}" target="_blank" style="color:#fff;text-decoration:none;font-weight:700">前往接受邀請</a></td></tr></table>`);
  await queueMail(email, "[RegMaster] 團隊協作邀請 — " + orgName, html);
  await auditLog(owner, "邀請成員", String(ref.id), email + " / " + role);
  return { success: true };
});

exports.listOrgMembers = authCallable(["system", "competition"], async (data, request) => {
  const owner = request.authUser.username;
  const snap = await db.collection("orgMembers").where("orgOwner", "==", owner).get();
  const members = snap.docs.map(d => { const m = d.data(); return {
    id: d.id, memberEmail: m.memberEmail || "", memberUsername: m.memberUsername || "",
    role: m.role || "", scope: m.scope || "all", status: m.status || "invited",
    invitedAt: m.invitedAt || "", acceptedAt: m.acceptedAt || ""
  }; });
  return { members, canManage: await ownerHasRolesFeature(owner, request.authUser.role) };
});

exports.updateMemberRole = authCallable(["system", "competition"], async (data, request) => {
  const owner = request.authUser.username;
  const ref = db.collection("orgMembers").doc(String(data.memberId || ""));
  const doc = await ref.get();
  if (!doc.exists || doc.data().orgOwner !== owner) return { success: false, message: "找不到成員或無權限" };
  const upd = {};
  if (RBAC_ROLES.indexOf(data.role) >= 0) upd.role = data.role;
  if (data.scope === "all" || Array.isArray(data.scope)) upd.scope = data.scope;
  if (!Object.keys(upd).length) return { success: false, message: "無可更新欄位" };
  await ref.update(upd);
  await auditLog(owner, "更新成員權限", String(data.memberId), JSON.stringify(upd).slice(0, 80));
  return { success: true };
});

exports.revokeMember = authCallable(["system", "competition"], async (data, request) => {
  const owner = request.authUser.username;
  const ref = db.collection("orgMembers").doc(String(data.memberId || ""));
  const doc = await ref.get();
  if (!doc.exists || doc.data().orgOwner !== owner) return { success: false, message: "找不到成員或無權限" };
  await ref.delete();
  await auditLog(owner, "移除成員", String(data.memberId), doc.data().memberEmail || "");
  return { success: true };
});

exports.listMyInvites = authCallable(["system", "competition"], async (data, request) => {
  const email = String(request.authUser.email || "").toLowerCase();
  const me = request.authUser.username;
  const invites = [];
  const snap = await db.collection("orgMembers").get();
  snap.docs.forEach(d => {
    const m = d.data();
    const pendingForMe = email && (m.memberEmail || "").toLowerCase() === email && m.status === "invited";
    const activeMine = m.memberUsername === me && m.status === "active";
    if (pendingForMe || activeMine) invites.push({
      id: d.id, orgOwner: m.orgOwner, role: m.role, scope: m.scope, status: m.status,
      invitedAt: m.invitedAt || "", acceptedAt: m.acceptedAt || ""
    });
  });
  return { invites };
});

exports.acceptInvite = authCallable(["system", "competition"], async (data, request) => {
  const ref = db.collection("orgMembers").doc(String(data.memberId || ""));
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "邀請不存在" };
  const m = doc.data();
  if (m.status !== "invited") return { success: false, message: "此邀請已處理" };
  if ((m.memberEmail || "").toLowerCase() !== String(request.authUser.email || "").toLowerCase()) {
    return { success: false, message: "此邀請寄給其他 Email，無法接受" };
  }
  if (m.orgOwner === request.authUser.username) return { success: false, message: "不能加入自己的組織" };
  await ref.update({ memberUsername: request.authUser.username, status: "active", acceptedAt: fmtNow(), token: "" });
  await auditLog(request.authUser.username, "接受團隊邀請", String(data.memberId), m.orgOwner);
  return { success: true };
});

exports.declineInvite = authCallable(["system", "competition"], async (data, request) => {
  const ref = db.collection("orgMembers").doc(String(data.memberId || ""));
  const doc = await ref.get();
  if (!doc.exists) return { success: false, message: "邀請不存在" };
  const m = doc.data();
  const mine = (m.memberEmail || "").toLowerCase() === String(request.authUser.email || "").toLowerCase() || m.memberUsername === request.authUser.username;
  if (!mine) return { success: false, message: "無權限" };
  await ref.delete();
  return { success: true };
});

// The caller's effective role for one event: "owner" | "manager" | "staff" | "judge" | null.
// Used by the shared sidebar to hide event sub-nav items the role can't use (UI only;
// the backend always enforces via compAuthCallable regardless).
exports.getMyEventRole = authCallable(["system", "competition"], async (data, request) => {
  if (request.authUser.role === "system") return { role: "owner" };
  const compId = String(data.compId || "");
  if (!compId) return { role: null };
  const compDoc = await db.collection("competitions").doc(compId).get();
  if (!compDoc.exists) return { role: null };
  const comp = compDoc.data();
  if (comp.creator === request.authUser.username) return { role: "owner" };
  const snap = await db.collection("orgMembers").where("memberUsername", "==", request.authUser.username).get();
  for (const d of snap.docs) {
    const m = d.data();
    if (m.orgOwner === comp.creator && m.status === "active" && (!Array.isArray(m.scope) || m.scope.indexOf(compId) >= 0)) return { role: m.role };
  }
  return { role: null };
});

// ============================================================================
// 證書 / 名牌 (certificate) — 範本與資產儲存。前端 Canvas 負責渲染/輸出；後端
// 僅存範本定義與圖檔（背景/logo/簽名沿用既有 base64-chunk 模式）。Pro+Team。
// ============================================================================
// Event-scoped feature gate: checks the EVENT OWNER's tier (not the caller's),
// so a manager member on a Pro/Team owner's event is correctly allowed.
async function eventHasFeature(compId, key) {
  try {
    const compDoc = await db.collection("competitions").doc(compId).get();
    if (!compDoc.exists) return false;
    const tier = await getEffectiveTier(compDoc.data().creator);
    const plans = await getPlans();
    return !!(plans[tier] && plans[tier].features && plans[tier].features[key]);
  } catch (e) { return false; }
}

exports.uploadCertAsset = compAuthCallable("manage", async (data, request) => {
  const compId = String(data.compId || "");
  if (!(await eventHasFeature(compId, "certificate"))) return { success: false, message: "證書功能為 Pro / Team 方案" };
  const base64Data = String(data.base64Data || "");
  if (!compId || !base64Data) return { success: false, message: "缺少資料" };
  if (base64Data.length > 8 * 1024 * 1024) return { success: false, message: "圖檔過大（約 6MB 上限）" };
  const CHUNK = 800000;
  const total = Math.ceil(base64Data.length / CHUNK);
  const ref = db.collection("certAssets").doc();
  await ref.set({
    compId, kind: String(data.kind || "bg"), mimeType: String(data.mimeType || "image/png"),
    fileName: String(data.fileName || "").slice(0, 120),
    data: base64Data.substring(0, CHUNK), totalChunks: total, totalSize: base64Data.length, createdAt: fmtNow()
  });
  for (let i = 1; i < total; i++) {
    await db.collection("certAssets").doc(ref.id + "_chunk" + i).set({ parentId: ref.id, chunkIndex: i, data: base64Data.substring(i * CHUNK, (i + 1) * CHUNK) });
  }
  return { success: true, assetId: ref.id };
});

// Public fetch by unguessable assetId (also used by registrant self-service later).
exports.getCertAssetData = callable(async (data) => {
  const id = String(data.assetId || "");
  if (!id) return { success: false };
  const doc = await db.collection("certAssets").doc(id).get();
  if (!doc.exists) return { success: false };
  const p = doc.data();
  let full = p.data || "";
  const total = p.totalChunks || 1;
  for (let i = 1; i < total; i++) {
    const c = await db.collection("certAssets").doc(id + "_chunk" + i).get();
    if (c.exists) full += c.data().data || "";
  }
  return { success: true, dataUri: "data:" + (p.mimeType || "image/png") + ";base64," + full, kind: p.kind || "bg" };
});

exports.listCertTemplates = compAuthCallable("manage", async (data) => {
  const compId = String(data.compId || "");
  const snap = await db.collection("certTemplates").where("compId", "==", compId).get();
  const templates = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  return { templates, enabled: await eventHasFeature(compId, "certificate") };
});

// V-25: defensively normalise each certificate field before persisting — keep only scalar props,
// cap string lengths, clamp positional/size numbers. (Render is canvas-based, not innerHTML, so
// this is hardening against malformed/oversized payloads rather than an XSS fix.)
function sanitizeCertField(f) {
  if (!f || typeof f !== "object") return null;
  const out = {};
  for (const k of Object.keys(f)) {
    let v = f[k];
    if (typeof v === "number") { v = Number.isFinite(v) ? v : 0; }
    else if (typeof v === "string") { v = v.slice(0, 1000); }
    else if (typeof v === "boolean" || v === null) { /* keep */ }
    else { continue; } // drop nested objects/arrays/functions — fields use only scalars
    out[k] = v;
  }
  ["x", "y", "w", "h"].forEach(k => { if (typeof out[k] === "number") out[k] = Math.min(1000, Math.max(-1000, out[k])); });
  if (typeof out.fontSizePct === "number") out.fontSizePct = Math.min(200, Math.max(0.1, out.fontSizePct));
  return out;
}

exports.saveCertTemplate = compAuthCallable("manage", async (data, request) => {
  const compId = String(data.compId || "");
  if (!(await eventHasFeature(compId, "certificate"))) return { success: false, message: "證書功能為 Pro / Team 方案" };
  const t = data.template || {};
  if (!t || typeof t !== "object") return { success: false, message: "缺少資料" };
  const payload = {
    compId, type: (t.type === "badge" ? "badge" : "cert"),
    name: String(t.name || "未命名範本").slice(0, 80),
    orientation: String(t.orientation || "landscape"),
    size: t.size || null,
    bgAssetId: String(t.bgAssetId || ""), bgPreset: String(t.bgPreset || ""), bgColor: String(t.bgColor || ""),
    fields: Array.isArray(t.fields) ? t.fields.slice(0, 60).map(sanitizeCertField).filter(Boolean) : [],
    // Self-service: when enabled, registrants can download this template from 我的報名 (my.html).
    selfServe: t.selfServe === true,
    selfServeRequireCheckin: t.selfServeRequireCheckin === true,
    updatedAt: fmtNow(), updatedBy: request.authUser.username
  };
  let id = t.id ? String(t.id) : "";
  if (id) {
    const ref = db.collection("certTemplates").doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().compId !== compId) return { success: false, message: "範本不存在" };
    await ref.update(payload);
  } else {
    payload.createdAt = fmtNow();
    const ref = await db.collection("certTemplates").add(payload);
    id = ref.id;
  }
  await auditLog(request.authUser.username, "儲存證書範本", compId, payload.name);
  return { success: true, id };
});

exports.deleteCertTemplate = compAuthCallable("manage", async (data, request) => {
  const compId = String(data.compId || "");
  const ref = db.collection("certTemplates").doc(String(data.templateId || ""));
  const doc = await ref.get();
  if (!doc.exists || doc.data().compId !== compId) return { success: false, message: "範本不存在" };
  await ref.delete();
  await auditLog(request.authUser.username, "刪除證書範本", compId, String(data.templateId));
  return { success: true };
});

// Flat recipient list for certificate generation: one entry per MEMBER (student/teacher),
// carrying that person's fields + their team's meta + the team's custom-form answers.
// The client can dedupe to one-per-team for team certificates, and merge leaderboard rank
// by teamId. Used instead of getAllTeams so {{中文姓名}} / custom tokens resolve per person.
exports.getCertRecipients = compAuthCallable("view", async (data) => {
  const compId = String(data.compId || "");
  const teamsSnap = await db.collection("teams").where("compId", "==", compId).get();
  const teams = {};
  teamsSnap.docs.forEach(d => { teams[d.id] = d.data(); });
  const memSnap = await db.collection("members").where("compId", "==", compId).get();
  const recipients = [];
  memSnap.docs.forEach(d => {
    const m = d.data();
    const t = teams[m.teamId] || {};
    if (t.status === "已取消") return; // skip cancelled
    recipients.push({
      teamId: m.teamId, role: m.role || "", seq: m.seq || 0,
      chineseName: m.chineseName || m.name || "", englishName: m.englishName || "",
      email: m.email || "", member: m,
      teamNameCN: t.teamNameCN || "", teamNameEN: t.teamNameEN || "",
      group: t.group || "", status: t.status || "正取", checkedIn: !!t.checkedIn,
      customAnswers: t.customAnswers || {}
    });
  });
  return { recipients };
});

// Public: templates the organiser marked self-serve, for registrant download in my.html.
// Only returns rendering data (no auth needed); registrants render client-side with their
// own team data. Returns [] if the event's owner isn't on a plan with the certificate feature.
exports.getPublicCertTemplates = callable(async (data) => {
  const compId = String(data.compId || "");
  if (!compId) return { templates: [] };
  if (!(await eventHasFeature(compId, "certificate"))) return { templates: [] };
  const snap = await db.collection("certTemplates").where("compId", "==", compId).get();
  const templates = snap.docs.map(d => d.data()).filter(t => t.selfServe === true).map(t => ({
    id: "", type: t.type || "cert", name: t.name || "", orientation: t.orientation || "landscape",
    size: t.size || null, bgAssetId: t.bgAssetId || "", bgPreset: t.bgPreset || "", bgColor: t.bgColor || "",
    fields: Array.isArray(t.fields) ? t.fields : [], requireCheckin: t.selfServeRequireCheckin === true
  }));
  return { templates };
});


// ===== TEMPORARY: QA test-account seeding (remove after pre-launch UX testing) =====
// Secret-guarded. action 'seed' creates qa_* test accounts/licenses/orgMembers (idempotent);
// action 'cleanup' deletes everything tagged _qatest plus any events created by qa_* accounts.
exports.qaSeed = callable(async (data) => {
  if (!data || data.secret !== "QA-SEED-2026-RM") return { error: "forbidden" };
  const PW = "55a6c5114d06d567db099acc175dde58ffed80ac65fc0988fd4e48c38ce4846f"; // sha256("QAtest2026!")
  const QA_USERS = ["qa_free", "qa_starter", "qa_pro", "qa_team", "qa_sys", "qa_manager", "qa_judge", "qa_staff"];

  if (data.action === "cleanup") {
    let n = 0;
    const delWhere = async (col, field, op, val) => {
      const s = await db.collection(col).where(field, op, val).get();
      for (let i = 0; i < s.docs.length; i += 400) { const b = db.batch(); s.docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); n += Math.min(400, s.docs.length - i); }
    };
    await delWhere("accounts", "_qatest", "==", true);
    await delWhere("licenses", "_qatest", "==", true);
    await delWhere("orgMembers", "_qatest", "==", true);
    // events created by qa_* accounts + their dependent docs
    const compSnap = await db.collection("competitions").where("creator", "in", QA_USERS.slice(0, 10)).get();
    for (const c of compSnap.docs) {
      const cid = c.id;
      for (const col of ["teams", "members", "scores", "regPayments", "announcements", "campaigns", "posterFiles", "pdfFiles", "certAssets", "teamFiles", "notifications"]) {
        await delWhere(col, "compId", "==", cid);
      }
      await c.ref.delete(); n++;
    }
    await delWhere("notifPrefs", "_qatest", "==", true);
    return { success: true, cleaned: n };
  }

  // ---- seed ----
  const created = [], skipped = [];
  const ensureAccount = async (username, role, displayName, org) => {
    const ex = await db.collection("accounts").where("username", "==", username).limit(1).get();
    if (!ex.empty) { skipped.push(username); return; }
    await db.collection("accounts").add({
      username, passwordHash: PW, role, displayName, email: username + "@qa.test", emailVerified: true,
      organizationName: org || "", intendedPlan: role === "system" ? "" : "free",
      createdAt: fmtNow(), loginFails: 0, lockedUntil: "", _qatest: true
    });
    created.push(username);
  };
  await ensureAccount("qa_free", "competition", "QA Free 主辦", "QA Free 機構");
  await ensureAccount("qa_starter", "competition", "QA Starter 主辦", "QA Starter 機構");
  await ensureAccount("qa_pro", "competition", "QA Pro 主辦", "QA Pro 機構");
  await ensureAccount("qa_team", "competition", "QA Team 主辦", "QA Team 機構");
  await ensureAccount("qa_sys", "system", "QA 系統管理員", "");
  await ensureAccount("qa_manager", "competition", "QA 管理者", "");
  await ensureAccount("qa_judge", "competition", "QA 評審", "");
  await ensureAccount("qa_staff", "competition", "QA 工作人員", "");

  const ensureLicense = async (code, tier, owner) => {
    const ex = await db.collection("licenses").doc(code).get();
    if (ex.exists) { skipped.push(code); return; }
    await db.collection("licenses").doc(code).set({
      code, type: "subscription", tier, status: "已啟用", activatedBy: owner, purchasedBy: owner,
      years: 1, maxCount: 0, usedCount: 0,
      activatedAt: fmtNow(), createdAt: fmtNow(),
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(), _qatest: true
    });
    created.push(code);
  };
  await ensureLicense("QA-STARTER", "starter", "qa_starter");
  await ensureLicense("QA-PRO", "pro", "qa_pro");
  await ensureLicense("QA-TEAM", "team", "qa_team");

  const ensureMember = async (memberUsername, role) => {
    const ex = await db.collection("orgMembers").where("memberUsername", "==", memberUsername).where("orgOwner", "==", "qa_team").get();
    if (!ex.empty) { skipped.push("member:" + memberUsername); return; }
    await db.collection("orgMembers").add({
      orgOwner: "qa_team", memberEmail: memberUsername + "@qa.test", memberUsername, role, scope: "all",
      status: "active", invitedBy: "qa_team", invitedAt: fmtNow(), acceptedAt: fmtNow(), token: "", _qatest: true
    });
    created.push("member:" + memberUsername);
  };
  await ensureMember("qa_manager", "manager");
  await ensureMember("qa_judge", "judge");
  await ensureMember("qa_staff", "staff");

  return { success: true, created, skipped };
});
