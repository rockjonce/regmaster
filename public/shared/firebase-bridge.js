// =============================================================================
// RegMaster · Firebase Bridge (shared/firebase-bridge.js)
// =============================================================================
// Provides the google.script.run compatibility shim that all callable APIs
// route through. Extracted from public/index.html (lines 17-196) so the same
// transport layer can be reused across multi-page v3 pages.
//
// Dependencies (loaded before this file):
//   <script src="/__/firebase/10.7.1/firebase-app-compat.js"></script>
//   <script src="/__/firebase/10.7.1/firebase-functions-compat.js"></script>
//   <script src="/__/firebase/init.js"></script>
//
// Globals it expects (optional, falls back gracefully if missing):
//   window.ME        - current session ({username, sessionToken})
//   window.LANG      - "zh" | "en"
//   window.I18N      - { zh: {...}, en: {...} } translation dictionary
//   window.toast(msg, type) - notification function (optional)
//   window.loading(bool)    - loading indicator (optional)
//   window.openM(modalId)   - modal opener (optional)
//   window.$(id)            - document.getElementById shorthand (optional)
//   window.delCookie(name)  - cookie remover (optional)
//
// Exports (added to window):
//   window._fn             - firebase.functions() handle
//   window._argMap         - positional-arg → named-arg mapping for callables
//   window._callFn(name, args) - low-level callable invoker
//   window.google.script.run - GAS-compatible runner
// =============================================================================

(function () {
  if (typeof firebase === 'undefined') {
    console.error('[firebase-bridge] firebase SDK not loaded before this script.');
    return;
  }

  // ---------------------------------------------------------------------------
  // EMULATOR AUTO-DETECT (BLOCKER B1 fix)
  // ---------------------------------------------------------------------------
  // Without this, all callables / Firestore reads from a v3 page running under
  // `firebase emulators:start` hit the PRODUCTION project — risky because:
  //   1. Local QA reads real Firestore data (privacy)
  //   2. Local QA could write to real Firestore (data corruption)
  //   3. Cloud Functions are not the local emulator copy, so any backend
  //      change being tested is silently ignored.
  //
  // In production deploy, location.hostname will be 'regmaster-pro.web.app'
  // (or a custom domain), so the if-block is a no-op. Safe and self-disabling.
  //
  // Ports match firebase.json emulators config (functions:5001, firestore:8085,
  // auth:9099). If you change those, update here too.
  // ---------------------------------------------------------------------------
  var _isLocalhost = (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  if (_isLocalhost) {
    try {
      if (firebase.functions) firebase.functions().useEmulator('127.0.0.1', 5001);
    } catch (e) { console.warn('[firebase-bridge] useEmulator(functions) failed:', e.message); }
    try {
      if (firebase.firestore) firebase.firestore().useEmulator('127.0.0.1', 8085);
    } catch (e) { console.warn('[firebase-bridge] useEmulator(firestore) failed:', e.message); }
    try {
      if (firebase.auth) firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
    } catch (e) { /* auth emulator may not be running; OK to ignore */ }
    console.log('[firebase-bridge] 🟢 Connected to LOCAL emulators (functions:5001, firestore:8085).');
  }

  var _fn = firebase.functions();
  window._fn = _fn;

  // ---------------------------------------------------------------------------
  // Positional-arg → named-arg mapping for all 95+ callables.
  // Order MUST match the call sites in the legacy SPA.
  // ---------------------------------------------------------------------------
  var _argMap = {
    loginAccount:["username","password","_clientInfo"],
    loginWithGoogle:["idToken"],
    loginVerifyTotp:["username","password","code"],
    getTotpStatus:[],
    generateTotpSecret:[],
    enableTotp:["code"],
    disableTotp:["code"],
    createAccount:["username","password","role","displayName","email"],
    deleteAccount:["username"],
    changePassword:["username","oldPassword","newPassword"],
    getMyProfile:[],
    updateProfile:["displayName","email","phone"],
    deleteOwnAccount:[],
    saveGeminiKeys:["keys"],
    getNotifications:["role","username"],
    markNotificationRead:["nid"],
    markAllNotificationsRead:["role","username"],
    getAuditLogs:["limit"],
    clearAuditLogs:[],
    checkInTeam:["teamId","user"],
    duplicateCompetition:["compId","newName","creator"],
    getPosterData:["compId"],
    getPdfData:["docId"],
    getSalesConfig:[],
    saveSalesConfig:["config"],
    createCoupon:["code","type","value","maxUses","expiresAt"],
    listCoupons:[],
    deleteCoupon:["id"],
    validateCoupon:["code"],
    createPayuniOrder:["items","couponCode","username"],
    getOrderStatus:["orderId"],
    createRegistrationPayment:["compId","teamId","discountCode"],
    validateDiscountCode:["compId","teamId","code"],
    createDiscountCode:["compId","code","type","value","maxUses","expiresAt","note"],
    listDiscountCodes:["compId"],
    deleteDiscountCode:["compId","code"],
    getRegPaymentStatus:["orderId"],
    productionReset:["confirmCode"],
    clearExpiredLicenses:[],
    uploadPosterImage:["compId","base64Data","fileName","mimeType"],
    listCompetitions:["role","username"],
    createCompetition:["name","category","eventType","creator"],
    getCompetitionConfig:["compId"],
    saveCompetitionConfig:["compId","config"],
    setRegistrationOpen:["compId","isOpen"],
    deleteCompetition:["compId"],
    getRegistrationBundle:["compId"],
    getShareLink:["compId"],
    addAnnouncement:["compId","date","title","content"],
    getAnnouncements:["compId"],
    deleteAnnouncement:["compId","docId"],
    submitRegistration:["compId","fd"],
    loginTeam:["compId","teamId","password"],
    updateRegistration:["compId","teamId","pwd","fd"],
    lookupRegistration:["compId","keyword"],
    checkDuplicates:["compId","teamNameCN","idNumbers","passports","editTeamId"],
    getDashboardStats:["compId"],
    getAllTeams:["compId"],
    getTeamDetail:["teamId"],
    confirmPayment:["teamId","user"],
    updateTeamStatus:["teamId","newStatus","user"],
    deleteTeam:["teamId"],
    exportTeamsCSV:["compId"],
    reconcilePayments:["compId","accountSuffix"],
    saveEmailTemplate:["compId","name","subject","body"],
    getEmailTemplates:["compId"],
    deleteEmailTemplate:["compId","name"],
    sendNotificationToTeam:["compId","teamId","subject","body"],
    sendNotificationToAll:["compId","subject","body"],
    saveScore:["compId","teamId","item","score","rank","comment","user"],
    getScores:["compId"],
    askCompetitionAI:["compId","question"],
    askAdminAI:["question","compId"],
    uploadRulesPdf:["compId","base64Data","fileName"],
    uploadTeamFile:["compId","teamId","base64Data","fileName"],
    getTeamFileData:["teamId"],
    analyzePosterColors:["compId","posterUrl"],
    analyzeRulesWithAI:["compId"],
    aiConvertInlineHTML:["compId","htmlContent","fieldName"],
    deletePosterImage:["compId"],
    deleteRulesPdf:["compId"],
    createLicense:["tier","years"],
    deleteLicense:["code"],
    activateLicense:["code","username"],
    getLicenseStatus:["username"],
    consumeLicense:["username"],
    batchImportTeams:["compId","csvText"],
    listLicenses:[],
    listCompetitionsPublic:[],
    listAccounts:[],
    getGeminiKeys:[],
    rebuildKnowledgeBase:[],
    getKnowledgeBaseStatus:[],
    addNotification:["compId","question"],
    requestAccount:["username","password","displayName","email","phone","intendedPlan"],
    verifyAccount:["username","otp"],
    resetAdminPassword:["email"],
    sendSystemEmail:["targetEmail","subject","content","user"],
    migrateTeamCounts:[],
    migrateViewCounts:[],
    setCapacityLimit:["compId","maxCapacityLimit","capacityLimitUnlocked"],
    logVisit:["ip","country","city","device","page","compId"],
    listOrders:[],
    getVisitorStats:[],
    submitFeedback:["category","subject","description","stepsToReproduce","pageUrl","attachmentBase64","attachmentName","clientInfo"],
    listFeedback:[],
    updateFeedbackStatus:["feedbackId","status"],
    getFeedbackFile:["fileId"],

    // V3 Phase 2 additions
    submitContactInquiry:[],   // takes single object arg with form fields
    getOnboardingState:["username"],
    saveOnboardingStep:["username","step","data"],

    // V3 Phase 3 additions
    listMyRegistrationsByEmail:["email","phone"],

    // V3 Phase 4 additions
    getAiInsights:["compId"],
    getTodoList:["compId"],

    // V3 Phase 5 additions
    getFormSchema:["compId"],
    saveFormSchema:["compId","schema"],

    // V3 Phase 6 additions
    listCampaigns:["compId"],
    createCampaign:["compId","payload"],
    updateCampaign:["campaignId","payload"],
    deleteCampaign:["campaignId"],
    sendCampaignNow:["campaignId"],
    submitJudgeScore:["compId","teamId","items","totalScore","comment"],
    getLiveLeaderboard:["compId"],
    checkInTeamV2:["teamId","extras"],

    // V3 Phase 7 additions
    listConversations:["compId"],
    createConversation:["compId","title"],
    getConversation:["conversationId"],
    appendMessage:["conversationId","role","content"],
    deleteConversation:["conversationId"],

    // V3 Phase 8 additions
    getNotifPrefs:[],
    saveNotifPrefs:["prefs"],
    listSessions:["clientInfo"],
    revokeSession:["sessionId"],
    getPlatformHealth:[],
    listAllOrgs:[]
  };
  window._argMap = _argMap;

  // ---------------------------------------------------------------------------
  // Low-level callable invoker. Maps positional args to the named payload the
  // Cloud Function expects, auto-injects session auth, returns a Promise.
  // ---------------------------------------------------------------------------
  function _callFn(name, args) {
    var map = _argMap[name];
    var payload = {};
    if (map && map.length > 0) {
      for (var i = 0; i < map.length; i++) { payload[map[i]] = args[i]; }
    } else if (args.length === 1 && typeof args[0] === "object") {
      payload = args[0];
    } else if (args.length > 0) {
      for (var j = 0; j < args.length; j++) { payload["arg" + j] = args[j]; }
    }
    // Auto-inject auth credentials for authenticated endpoints
    var ME = window.ME;
    if (ME && ME.sessionToken) {
      payload._auth = { username: ME.username, token: ME.sessionToken };
    }
    return _fn.httpsCallable(name)(payload).then(function (r) { return r.data; });
  }
  window._callFn = _callFn;

  // ---------------------------------------------------------------------------
  // google.script.run compatibility shim
  // ---------------------------------------------------------------------------
  window.google = window.google || { script: { run: null } };

  function makeRunner() {
    var _ok = null;
    var _fail = null;
    var handler = {
      get: function (target, prop) {
        if (prop === "withSuccessHandler") {
          return function (cb) { _ok = cb; return new Proxy({}, handler); };
        }
        if (prop === "withFailureHandler") {
          return function (cb) { _fail = cb; return new Proxy({}, handler); };
        }
        // Actual function call
        return function () {
          var a = [];
          for (var i = 0; i < arguments.length; i++) a.push(arguments[i]);
          var ok = _ok;
          var fail = _fail;
          _callFn(prop, a).then(function (r) {
            if (ok) ok(r);
          }).catch(function (e) {
            // Auto-detect session expired and redirect to login
            var msg = (e && e.message) || '';
            if (msg.indexOf('登入已失效') !== -1 ||
                msg.indexOf('Session expired') !== -1 ||
                msg.indexOf('Authentication required') !== -1 ||
                msg.indexOf('請先登入') !== -1) {
              try { if (window.loading) window.loading(false); } catch (x) {}
              window.ME = null;
              try { if (window.delCookie) window.delCookie('regmaster_session'); } catch (x) {}
              try { localStorage.removeItem('regmaster_me'); } catch (x) {}
              if (typeof window.openM === 'function') {
                // Legacy SPA: re-open the in-page login modal.
                try {
                  var I18N = window.I18N || { zh: {}, en: {} };
                  var LANG = window.LANG || 'zh';
                  if (window.$) {
                    var btn = window.$('adminBtn');
                    if (btn) btn.textContent = '🔑 ' + ((I18N[LANG] || I18N.zh).manage || '管理');
                    var bell = window.$('bellWrap');
                    if (bell) bell.style.display = 'none';
                  }
                } catch (x) {}
                if (window.toast) {
                  window.toast(window.LANG === 'en' ? 'Session expired, please login again' : '登入已過期，請重新登入', 'error');
                }
                setTimeout(function () { try { window.openM('mLogin'); } catch (x) {} }, 600);
              } else {
                // V3 multi-page: there is no in-page login modal, so hard-redirect
                // to the login page for re-auth. (Previously this branch did
                // nothing, leaving callers' promises unresolved → infinite spinner.)
                var _next = encodeURIComponent(location.pathname + location.search);
                location.replace('/login.html?next=' + _next + '&expired=1');
              }
              // Still notify the caller so any pending UI promise can settle.
              if (fail) { try { fail(e); } catch (x) {} }
              return;
            }
            if (fail) fail(e);
            else {
              console.error("CF error:", prop, e);
              try { if (window.loading) window.loading(false); } catch (x) {}
              try { if (window.toast) window.toast(msg || ("Error: " + prop), "error"); } catch (x) {}
            }
          });
        };
      }
    };
    return new Proxy({}, handler);
  }

  window.google.script.run = new Proxy({}, {
    get: function (target, prop) {
      if (prop === "withSuccessHandler") {
        var runner = makeRunner();
        return function (cb) { return runner.withSuccessHandler(cb); };
      }
      if (prop === "withFailureHandler") {
        var runner2 = makeRunner();
        return function (cb) { return runner2.withFailureHandler(cb); };
      }
      // Direct call without handlers
      return function () {
        var a = [];
        for (var i = 0; i < arguments.length; i++) a.push(arguments[i]);
        _callFn(prop, a).catch(function (e) { console.error(prop, e); });
      };
    }
  });
})();
