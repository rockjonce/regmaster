// =============================================================================
// RegMaster · I18N Dictionary (shared/i18n.js)
// =============================================================================
// zh / en translations. Extracted from public/index.html (line ~1269).
//
// The legacy SPA (public/index.html) keeps its own inline copy temporarily.
// New v3 multi-page files load this file to get the shared dictionary.
//
// Usage:
//   <script src="/shared/i18n.js"></script>
//   var label = window.L('register');  // returns "報名" or "Register"
//
// Globals exposed:
//   window.I18N - the dictionary object { zh: {...}, en: {...} }
//   window.L(key, lang?) - translate key (defaults to window.LANG)
// =============================================================================

(function () {
  window.I18N = {
    zh: {
      sysTitle: 'RegMaster', homeTitle: 'RegMaster 線上報名平台', homeSub: '一站式活動報名、管理、金流解決方案', noComp: '目前沒有活動', noCompSub: '活動開放後將在此顯示',
      hf1: '線上報名', hf2: '金流整合', hf3: '即時統計', hf4: 'QR 報到', hf5: 'AI 助理',
      heroAi: '內建 AI 活動助理 — 智慧分析規章、自動配色、即時問答',
      manage: '活動管理者登入', back: '返回', desc: '活動說明', rules: '活動規則/規章', viewRules: '查看規則/規章 PDF', announcements: '公告欄',
      register: '報名', loginEdit: '登入修改', lookup: '查詢報名', search: '查詢', teamId: '報名編號', password: '密碼',
      login: '登入', closed: '報名尚未開放', prev: '上一步', next: '下一步', regSuccess: '報名成功！', teamIdLabel: '報名編號',
      pwdLabel: '登入密碼', keepPwd: '請務必記住編號與密碼！', backHome: '返回首頁', addCal: '加入行事曆', logout: '登出',
      adminLogin: '活動管理者登入', account: '帳號', aiTitle: 'AI 助理', aiHello: '您好！有問題嗎？', send: '發送',
      myComps: '我的活動', create: '建立新活動', accounts: '帳號管理', aiKey: 'AI Key', logs: '操作日誌', open: '開放',
      closed2: '關閉', teams: '報名數', views: '瀏覽數', accepted: '正取', waitlist: '備取', pendingPay: '待付款', teamList: '報名列表',
      templates: '範本', import2: '匯入', reconcile: '對帳', scores: '成績', export2: '匯出', save: '儲存',
      name: '名稱', group: '組別', openTime: '開放時間', deadline: '截止時間', compDate: '活動日期', maxTeams: '最大組數',
      teamSettings: '隊伍設定', cnName: '中文隊名', enName: '英文隊名', stuCount: '學員數', tchCount: '教練/家長/指導老師 人數',
      stuFields: '學員欄位', tchFields: '教練/家長/指導老師 欄位', payment: '付款', transfer: '匯款', creditCard: '信用卡',
      fileUpload: '檔案上傳', requirePdf: '要求上傳PDF', descLabel: '說明', poster: '海報', shareLink: '分享連結',
      regSwitch: '報名開關', basic: '基本設定', copy: '複製', confirm2: '確認', delete2: '刪除', detail: '詳細',
      sendAll: '發送通知給所有人', status: '狀態', payStatus: '付款狀態', file: '檔案', actions: '操作',
      batchImport: '批次匯入', reconcilePay: '匯款對帳', scoreEntry: '成績登錄', exportCsv: '匯出CSV', immediately: '即日起',
      allowWaitlist: '允許備取', ageLimit: '年齡限制', announcements2: '公告', addAnn: '新增', rules2: '規則',
      analyze: '分析', aiAnalyze: 'AI 分析規則自動填入', aiColor: 'AI配色',
      catAll: '全部類別', catSeminar: '研討會', catCamp: '夏令營', catWorkshop: '工作坊', catExhibition: '展覽會', catCompetition: '競賽', catTraining: '教育訓練',
      dateAll: '全部日期', dateOpen: '報名開放', dateDeadline: '報名截止', dateComp: '活動日期', clearFilter: '清除',
      customQs: '其他資訊', pleaseSelect: '請選擇', need: '需要'
    },
    en: {
      sysTitle: 'RegMaster', homeTitle: 'RegMaster Online Registration', homeSub: 'All-in-one event registration & management solution', noComp: 'No events yet', noCompSub: 'Events will appear here once available',
      hf1: 'Registration', hf2: 'Payment', hf3: 'Analytics', hf4: 'QR Check-in', hf5: 'AI Assistant',
      heroAi: 'Built-in AI Event Assistant — Smart analysis, auto-styling, instant Q&A',
      manage: 'Admin Login', back: 'Back', desc: 'Description', rules: 'Rules & Regulations', viewRules: 'View Rules/Regulations PDF', announcements: 'Announcements',
      register: 'Register', loginEdit: 'Login / Edit', lookup: 'Look Up', search: 'Search', teamId: 'Registration ID', password: 'Password',
      login: 'Login', closed: 'Registration not open', prev: 'Previous', next: 'Next', regSuccess: 'Success!', teamIdLabel: 'Registration ID',
      pwdLabel: 'Password', keepPwd: 'Keep your ID and password safe!', backHome: 'Home', addCal: 'Add to Calendar', logout: 'Logout',
      adminLogin: 'Admin Login', account: 'Account', aiTitle: 'AI Assistant', aiHello: 'Hello! How can I help?', send: 'Send',
      myComps: 'My Events', create: 'Create Event', accounts: 'Accounts', aiKey: 'AI Key', logs: 'Audit Logs', open: 'Open',
      closed2: 'Closed', teams: 'Teams', views: 'Views', accepted: 'Accepted', waitlist: 'Waitlist', pendingPay: 'Pending', teamList: 'List',
      templates: 'Templates', import2: 'Import', reconcile: 'Reconcile', scores: 'Scores', export2: 'Export', save: 'Save',
      name: 'Name', group: 'Group', openTime: 'Open Date', deadline: 'Deadline', compDate: 'Event Date', maxTeams: 'Max Teams',
      teamSettings: 'Team Settings', cnName: 'Chinese Name', enName: 'English Name', stuCount: 'Participants', tchCount: 'Coaches / Parents / Instructors',
      stuFields: 'Participant Fields', tchFields: 'Coach / Parent / Instructor Fields', payment: 'Payment', transfer: 'Transfer', creditCard: 'Credit Card',
      fileUpload: 'File Upload', requirePdf: 'Require PDF', descLabel: 'Description', poster: 'Poster', shareLink: 'Share Link',
      regSwitch: 'Registration', basic: 'Basic', copy: 'Copy', confirm2: 'Confirm', delete2: 'Delete', detail: 'Detail',
      sendAll: 'Send to All', status: 'Status', payStatus: 'Payment', file: 'File', actions: 'Actions',
      batchImport: 'Batch Import', reconcilePay: 'Payment Reconcile', scoreEntry: 'Scores', exportCsv: 'Export CSV', immediately: 'Immediately',
      allowWaitlist: 'Allow Waitlist', ageLimit: 'Age Limit', announcements2: 'Announcements', addAnn: 'Add', rules2: 'Rules',
      analyze: 'Analyze', aiAnalyze: 'AI Analyze Rules', aiColor: 'AI Colors',
      catAll: 'All Categories', catSeminar: 'Seminar', catCamp: 'Camp', catWorkshop: 'Workshop', catExhibition: 'Exhibition', catCompetition: 'Competition', catTraining: 'Training',
      dateAll: 'All Dates', dateOpen: 'Registration Open', dateDeadline: 'Deadline', dateComp: 'Event Date', clearFilter: 'Clear',
      customQs: 'Additional Info', pleaseSelect: 'Select', need: 'Required'
    }
  };

  // ---------------------------------------------------------------------------
  // v3 public-site dictionary (merged into the legacy dict above).
  // Keys are page-scoped by prefix. Values for inline-markup nodes are stored as
  // HTML and applied via [data-i18n-html]. Style: natural, fluent marketing EN.
  // ---------------------------------------------------------------------------
  var ADD = {
    zh: {
      // ----- shared nav -----
      brandName: 'RegMaster', navExplore: '探索活動', navPricing: '方案', navFeatures: '功能',
      navAbout: '關於', navContact: '聯絡', navMy: '我的報名', navLogin: '主辦方登入', navTrial: '免費開始',
      dtIndex: 'RegMaster — 為認真辦活動的人，打造的報名系統', dtPricing: '方案定價 · RegMaster', dtFeatures: '產品功能 · RegMaster', dtEventDetail: '活動詳情 · RegMaster', dtEventsIndex: '探索活動 · RegMaster',
      // ----- shared footer -----
      ftTagline: '為認真辦活動的人，打造的線上報名系統。', ftColProduct: '產品', ftColCompany: '公司', ftColSupport: '支援',
      ftFeatures: '功能', ftPricing: '方案定價', ftExplore: '探索活動', ftAbout: '關於我們', ftPrivacy: '隱私權政策',
      ftTerms: '服務條款', ftManual: '說明文件', ftTutorials: '教學中心', ftContact: '聯絡我們', ftSupport: '客戶支援',
      ftCopyright: '© 2026 RegMaster · 廣天國際有限公司', ftCopyrightPre: '© 2026 RegMaster · ', ftCompany: '廣天國際有限公司', ftCompliance: 'SSL 加密傳輸 · 個資法合規',
      // ----- hero -----
      heroBadge: 'v3 · AI 智慧助理已上線',
      heroTitleFull: '<span class="tc">為認真辦活動的人</span><br>打造的 <em>報名系統</em>。',
      heroLead: 'RegMaster 是一套讓主辦方在 10 分鐘內就能上線的線上報名平台。從表單設計、報名審核、金流串接，到證書產生、即時統計 —— 一個後台搞定。',
      ctaFreeStart: '免費開始 →', ctaSeeFeatures: '看產品功能', ctaTrialMeta: '無需信用卡 · <b>Free</b> 終生免費',
      statEvents: '報名・收費・評分・證書', statRegs: '線上金流・自動對帳', statMinUnit: '分鐘', statLaunch: '活動快速上線', statSla: '全程加密・資料保護', statAllInOneNum: '一站式',
      // ----- logos -----
      logosLabel: '適用於各類主辦單位', lgUni: '大專院校', lgGov: '政府機關', lgAssoc: '公協會',
      lgResearch: '研究機構', lgCorp: '企業內訓', lgCamp: '補教與營隊',
      // ----- bento -----
      bentoH2: '把所有麻煩，<br>都交給 RegMaster。',
      bentoSub: '無論你辦的是程式競賽、夏令營，還是大型研討會 —— RegMaster 都把報名 → 收款 → 名單 → 證書串成一條暢通的流水線。',
      bentoAiH3: 'AI 助理為你回答報名者問題',
      bentoAiP: '內建 AI 智慧助理，自動讀懂活動規則並回應報名者。深夜的問題也能秒回，主辦方睡得更安穩。',
      chatU1: '▸ 我是高三學生可以報名嗎？', chatA1: '本活動年齡限制為 18 歲以上，但有開放「青少年組」歡迎報名！',
      chatU2: '▸ 比賽當天交通方式？', chatA2: '建議搭乘捷運至忠孝復興站 2 號出口...',
      bentoFormH3: '拖放式表單設計器', bentoFormP: '16 種欄位類型 · 條件邏輯 · 多階段 · 中英雙語',
      formName: '姓名', formSchool: '學校 / 機構', formDiet: '飲食習慣',
      bentoStatH3: '即時統計儀表板', bentoStatP: '報名趨勢、組別分布、來源追蹤 —— 不再等到結束才知道發生什麼事。',
      bentoPayH3: '金流串接', bentoPayP: '信用卡、ATM 轉帳 —— 一鍵啟用（其他付款方式依 PayUNI 商店設定）。',
      bentoEmailH3: '批次 Email / 證書', bentoEmailP: '變數套版、AI 擬稿，500 封一次寄。',
      bentoQrH3: 'QR Code 報到', bentoQrP: '手機掃一下，到場狀態自動同步。',
      // ----- dashboard mock -----
      dbMenu: '主選單', dbDashboard: '儀表板', dbMyEvents: '我的活動', dbRegList: '報名名單', dbCreate: '建立活動',
      dbTools: '工具', dbRecon: '金流對帳', dbCert: '證書 / 名牌', dbAI: 'AI 助理',
      dbEventName: '春季校園程式競賽 2026', dbVenue: '某科技大學', dbOpen: '報名中', dbExport: '匯出 CSV',
      dbKpi1: '總報名數', dbKpi2: '已收費', dbKpi3: '已審核', dbKpi4: '轉換率',
      dbToday: '↑ 18 今日', dbWeek: '+ $36k 今週', dbReviewed: '90%', dbConv: '↓ 3% 上週',
      dbTrend: '報名趨勢', db7: '7天', db30: '30天', db90: '90天',
      // ----- how it works -----
      howH2: '三步上線。<br>一晚搞定。',
      step1Num: '01 / 設定', step1H3: '選擇模板，填好基本資料',
      step1P: '競賽、夏令營、研討會、售票 —— 我們有 9 種預設模板，自動帶入欄位、收費方案、Email 範本。',
      step2Num: '02 / 公開', step2H3: '分享你的活動連結',
      step2P: '每場活動都有獨立網址。內建 SEO meta、社群預覽圖，直接分享到 LINE、FB、Email 都漂亮。',
      step3Num: '03 / 收件', step3H3: '名單 / 收款 / 報到全自動',
      step3P: '報名一筆進來，立刻收到 LINE 通知。導出 CSV、產證書、QR 報到 —— 全部不用 Excel。',
      // ----- use cases -----
      usesH2: '每種活動<br>都有適合的姿勢。',
      useCodeH4: '校園 / 各式競賽', useCodeP: '多階段賽制、組別管理、即時計分、多評審評分 —— 從程式競賽、學科競賽到體育賽會都能 cover。',
      useCodeQ: '競賽報名：報名表單、收費與候補一站式管理，分享連結即可開始收件。',
      useCampH4: '夏令營 / 冬令營', useCampP: '梯次選擇、住宿分房、家長同意書、緊急聯絡人 —— 一次 cover 兒童活動的所有合規。',
      useCampQ: '營隊報名：家長同意書、退費條款範本內建，行政流程自動化。',
      useEventH4: '企業 / 研討會', useEventP: '多票種、早鳥優惠、統編收集、出席證明 —— 從研討會到員工旅遊都搞得定。',
      useEventQ: '企業活動：大量報名與財務對帳，報表匯出清楚易核。',
      useGovH4: '政府 / 協會徵件', useGovP: '身分驗證、檔案上傳、評審分配、公文寄送 —— 公部門級的合規流程。',
      useGovQ: '公開徵件：投稿收件、評審排程與結果公告一條龍。',
      // ----- pricing teaser -----
      ptH2: '從免費開始，<br>用得越多越划算。',
      ptSub: '透明定價、免費版也能收費（每筆 5% 手續費）。價格與功能以實際方案設定為準，<a href="/pricing.html" style="color:inherit;text-decoration:underline">看完整比較</a>。',
      planFreeName: '免費版 Free', planFreeTag: '適合測試或只辦小型活動',
      planStarterName: '入門版 Starter', planStarterTag: '適合單次活動、小型主辦方',
      planProName: '專業版 Pro', planProTag: '學校 / 中型機構 · 完整功能',
      planTeamName: '團隊版 Team', planTeamTag: '大型機構 · 政府單位',
      priceForever: '/永久免費', priceYear: '/年', pfNoCard: '無需信用卡', pfNoTax: '未含稅', badgePopular: 'Most Popular',
      feActive1: '<b>1</b> 個進行中活動', feReg60: '每活動 <b>60</b> 筆報名', feFee5: '金流手續費 <b>5%</b>', feOnlinePay: '線上金流收款',
      feActive3: '<b>3</b> 個進行中活動', feReg300: '每活動 <b>300</b> 筆報名', feFee3: '金流手續費 <b>3%</b>',
      feOnlineExport: '線上金流收款 · 匯出報表', feScoreQrAi: '評分 · QR 報到 · 活動 AI 助理',
      feActive15: '<b>15</b> 個進行中活動', feReg1500: '每活動 <b>1,500</b> 筆報名', feFee2: '金流手續費 <b>2%</b>',
      feScoreMulti: '評分 · 多評審 · 團隊成員權限 · 公告群發', feQrAiAdmin: 'QR 報到 · 活動 AI 助理 · 主辦後台 AI 助理',
      feActiveUnlim: '<b>無限</b> 進行中活動', feRegUnlim: '<b>無限</b> 報名名額', feFee1: '金流手續費 <b>1%</b>',
      btnUseFree: '開始使用', btnUpStarter: '升級 Starter', btnUpPro: '升級 Pro →', btnChooseTeam: '選擇 Team →',
      btnTrialStarter: '免費試用 14 天', btnTrialPro: '免費試用 14 天 →',
      // ----- plan-card features / unit templates ({n} = number) -----
      pfPayment: '線上金流收款', pfCsv: '匯出報表', pfScoring: '評分', pfMultiJudge: '多評審評分 + 團隊成員權限', pfCampaigns: '公告群發',
      prTipScoring: '評分：由主辦或工作人員為每隊輸入一份成績（覆寫式），適合單一評審或小組統一登錄。',
      prTipMulti: '多評審評分：每位評審各自登入、獨立對同一隊伍打分，系統自動彙整各評審分數、計算平均並產生即時排行榜；可搭配「團隊成員權限」邀請多個評審角色帳號。',
      pfCheckin: 'QR 報到', pfWaitlist: '允許候補', pfEventAi: '活動 AI 助理', pfAdminAi: '主辦後台 AI 助理', pfCert: '名牌 / 證書',
      tActive: '<b>{n}</b> 個進行中活動', tActive1: '<b>{n}</b> 個進行中活動', tReg: '每活動 <b>{n}</b> 筆報名', tFee: '金流手續費 <b>{n}%</b>', uUnlimited: '無限',
      // ----- faq -----
      faqH2: '常見問題',
      faqQ1: 'RegMaster 跟 Google Form 有什麼不一樣？',
      faqA1: 'Google Form 適合內部問卷，但無法收費、無法寄通知、無法做名單管理。RegMaster 是專門為「對外的活動報名」設計：金流串接、自動發信、即時統計、QR 報到、證書產生 —— 你需要的全套功能都在後台一個地方，不用串 5 個工具。',
      faqQ2: '免費版真的能用來辦活動嗎？',
      faqA2: '可以。免費版包含完整的表單設計、報名審核、Email 通知，甚至能收費（每筆收 5% 手續費）。如果你一年只辦 1–2 場小型活動，免費版完全夠用。',
      faqQ3: '金流怎麼結算？多久撥款？',
      faqA3: '我們串接 PayUNI 線上金流，支援信用卡與 ATM 轉帳（其他付款方式依 PayUNI 商店設定而定）。平台代收後依轉帳週期撥款至你綁定的收款帳戶；銀行轉帳則由報名者直接匯入主辦方帳戶。報名者可於表單填寫統一編號，自動電子發票寄送功能即將推出。',
      faqQ4: '可以遷移既有的報名資料嗎？',
      faqA4: '可以。我們提供 CSV / Excel 匯入工具，並有專人協助大型遷移（500+ 筆）。你既有的 Google Form、Excel 名單、Typeform 都能無縫轉入 RegMaster。',
      faqQ5: '資料安全嗎？符合個資法嗎？',
      faqA5: '系統建置於 Google Cloud / Firebase，全程採 HTTPS（TLS）加密傳輸，並設有存取控制與權限管理。我們遵循個人資料保護法之規範處理資料；詳見<a href="/privacy.html">隱私權政策</a>。',
      faqQ6: '可以開立統編發票嗎？',
      faqA6: '報名者可在表單填寫統一編號，資料會一併匯出供你開立發票。🚧 系統自動開立與寄送電子發票功能即將推出；在此之前請依統編資料自行或來信客服協助開立。',
      // ----- closing cta -----
      ctaH2: '10 分鐘後，<br>你的活動就<em>上線了</em>。',
      ctaLead: '不需要信用卡 · 不需要工程師 · 不需要客服打擾你。<br>用熱忱去辦活動，剩下的交給 RegMaster。',
      ctaFree2: '免費開始 →', ctaExplore: '探索活動',
      // ----- shared admin shell (admin-nav.js) -----
      anBrandSubSystem: '系統管理員', anBrandSubOrg: '主辦後台', anRoleSystem: '系統管理員', anRoleOrg: '主辦方',
      anGrpOverview: '概覽', anDashboard: '儀表板', anAllEvents: '所有活動', anAi: 'AI 助理',
      anGrpThisEvent: '本活動', anEvtOverview: '總覽', anEvtSettings: '設定', anEvtForm: '表單設計', anEvtReg: '報名管理', anEvtNotice: '通知', anEvtBilling: '帳務', anEvtScoring: '評分', anEvtCheckin: '報到', anEvtCert: '證書 / 名牌',
      anGrpManage: '管理', anLicense: '方案與授權', anLogs: '操作紀錄', anSettings: '設定',
      anGrpSysadmin: '系統管理', anSysSettings: '系統設定', anAudit: '操作日誌',
      anUsageCur: '目前方案', anUsageFreeText: '免費方案', anUsageFreeHint: '免費方案 — 升級解鎖更多', anUpgrade: '升級方案 →', anLogout: '登出', anFeatLocked: '此功能需升級方案才能使用，前往方案與授權？',
      anUntil: '至 ', anLangTitle: '切換語言 / Switch language'
    },
    en: {
      // ----- shared nav -----
      brandName: 'RegMaster', navExplore: 'Explore', navPricing: 'Pricing', navFeatures: 'Features',
      navAbout: 'About', navContact: 'Contact', navMy: 'My Registrations', navLogin: 'Organizer Login', navTrial: 'Start Free',
      dtIndex: 'RegMaster — the registration system for people serious about events', dtPricing: 'Pricing · RegMaster', dtFeatures: 'Features · RegMaster', dtEventDetail: 'Event details · RegMaster', dtEventsIndex: 'Explore events · RegMaster',
      // ----- shared footer -----
      ftTagline: 'The online registration platform built for people who take their events seriously.', ftColProduct: 'Product', ftColCompany: 'Company', ftColSupport: 'Support',
      ftFeatures: 'Features', ftPricing: 'Pricing', ftExplore: 'Explore Events', ftAbout: 'About Us', ftPrivacy: 'Privacy Policy',
      ftTerms: 'Terms of Service', ftManual: 'Documentation', ftTutorials: 'Learning Center', ftContact: 'Contact Us', ftSupport: 'Customer Support',
      ftCopyright: '© 2026 RegMaster · Kuang-Tien International Co., Ltd.', ftCopyrightPre: '© 2026 RegMaster · ', ftCompany: 'Kuang-Tien International Co., Ltd.', ftCompliance: 'SSL encrypted · PDPA compliant',
      // ----- hero -----
      heroBadge: 'v3 · AI Assistant now live',
      heroTitleFull: '<span class="tc">The registration system</span><br>built for <em>serious organizers</em>.',
      heroLead: 'RegMaster is an online registration platform that gets your event live in 10 minutes. From form design, application review and payments to certificate generation and real-time analytics — it all runs from one dashboard.',
      ctaFreeStart: 'Start free →', ctaSeeFeatures: 'See features', ctaTrialMeta: 'No credit card · <b>Free</b> forever',
      statEvents: 'Register · Pay · Score · Certify', statRegs: 'Online payments & reconciliation', statMinUnit: 'min', statLaunch: 'to launch an event', statSla: 'End-to-end encryption', statAllInOneNum: 'All-in-one',
      // ----- logos -----
      logosLabel: 'Trusted by organizers of every kind', lgUni: 'Universities', lgGov: 'Government', lgAssoc: 'Associations',
      lgResearch: 'Research Institutes', lgCorp: 'Corporate Training', lgCamp: 'Tutoring & Camps',
      // ----- bento -----
      bentoH2: 'Leave all the hassle<br>to RegMaster.',
      bentoSub: 'Whether you run a coding contest, a summer camp or a large conference, RegMaster turns registration → payment → roster → certificates into one seamless pipeline.',
      bentoAiH3: 'An AI assistant that answers registrants for you',
      bentoAiP: 'A built-in AI assistant reads your event rules and replies to registrants automatically — even late-night questions get instant answers, so you can rest easy.',
      chatU1: "▸ I'm a high-school senior — can I register?", chatA1: 'This event is for ages 18 and up, but we have a Youth Division — you\'re welcome to join!',
      chatU2: '▸ How do I get there on event day?', chatA2: 'We recommend taking the MRT to Zhongxiao Fuxing Station, Exit 2...',
      bentoFormH3: 'Drag-and-drop form builder', bentoFormP: '16 field types · conditional logic · multi-step · bilingual',
      formName: 'Name', formSchool: 'School / Org', formDiet: 'Dietary',
      bentoStatH3: 'Real-time analytics dashboard', bentoStatP: 'Registration trends, group breakdowns, source tracking — no more waiting until it\'s over to see what happened.',
      bentoPayH3: 'Built-in payments', bentoPayP: 'Credit card and ATM transfer — enable in one click (other methods depend on your PayUNI merchant settings).',
      bentoEmailH3: 'Bulk email & certificates', bentoEmailP: 'Merge fields, AI-drafted copy, 500 sent in one go.',
      bentoQrH3: 'QR code check-in', bentoQrP: 'One scan on a phone and attendance syncs automatically.',
      // ----- dashboard mock -----
      dbMenu: 'Menu', dbDashboard: 'Dashboard', dbMyEvents: 'My Events', dbRegList: 'Registrations', dbCreate: 'Create Event',
      dbTools: 'Tools', dbRecon: 'Reconciliation', dbCert: 'Certificates', dbAI: 'AI Assistant',
      dbEventName: 'Spring Campus Coding Contest 2026', dbVenue: 'A University of Technology', dbOpen: 'Open', dbExport: 'Export CSV',
      dbKpi1: 'Total', dbKpi2: 'Collected', dbKpi3: 'Reviewed', dbKpi4: 'Conversion',
      dbToday: '↑ 18 today', dbWeek: '+ $36k this wk', dbReviewed: '90%', dbConv: '↓ 3% last wk',
      dbTrend: 'Registration Trend', db7: '7d', db30: '30d', db90: '90d',
      // ----- how it works -----
      howH2: 'Three steps to live.<br>Done in one evening.',
      step1Num: '01 / Set up', step1H3: 'Pick a template, fill in the basics',
      step1P: 'Contests, camps, conferences, ticketing — nine ready-made templates auto-fill your fields, pricing plans and email templates.',
      step2Num: '02 / Publish', step2H3: 'Share your event link',
      step2P: 'Every event gets its own URL with built-in SEO meta and social preview images — it looks great shared on LINE, Facebook or email.',
      step3Num: '03 / Collect', step3H3: 'Rosters, payments and check-in — all automatic',
      step3P: 'The moment a registration comes in, you get a LINE notification. Export CSV, generate certificates, QR check-in — no Excel required.',
      // ----- use cases -----
      usesH2: 'Every kind of event,<br>handled the right way.',
      useCodeH4: 'Campus & competitions', useCodeP: 'Multi-stage formats, group management, live scoring and multi-judge — from coding contests to academic and sports competitions, all covered.',
      useCodeQ: 'Competitions: registration, payment and waitlist in one place — share a link and start collecting entries.',
      useCampH4: 'Summer & winter camps', useCampP: 'Session selection, room assignments, parental consent, emergency contacts — every compliance need for children\'s programs in one place.',
      useCampQ: 'Camps: built-in consent-form and refund-policy templates automate the admin work.',
      useEventH4: 'Corporate & conferences', useEventP: 'Multiple ticket types, early-bird pricing, tax-ID collection, attendance certificates — from conferences to company trips.',
      useEventQ: 'Corporate events: large sign-ups with clear, exportable financial reconciliation.',
      useGovH4: 'Government & open calls', useGovP: 'Identity verification, file uploads, reviewer assignment, official correspondence — public-sector-grade compliance.',
      useGovQ: 'Open calls: submission intake, judge scheduling and results announcements end to end.',
      // ----- pricing teaser -----
      ptH2: 'Start free,<br>better value the more you use it.',
      ptSub: 'Transparent pricing — even the Free plan can collect payments (5% per transaction). Actual prices and features follow your plan settings; <a href="/pricing.html" style="color:inherit;text-decoration:underline">see the full comparison</a>.',
      planFreeName: 'Free', planFreeTag: 'For testing or small one-off events',
      planStarterName: 'Starter', planStarterTag: 'For single events and small organizers',
      planProName: 'Pro', planProTag: 'Schools & mid-size orgs · full features',
      planTeamName: 'Team', planTeamTag: 'Large organizations & government',
      priceForever: '/forever free', priceYear: '/yr', pfNoCard: 'No credit card', pfNoTax: 'excl. tax', badgePopular: 'Most Popular',
      feActive1: '<b>1</b> active event', feReg60: '<b>60</b> registrations per event', feFee5: '<b>5%</b> transaction fee', feOnlinePay: 'Online payment collection',
      feActive3: '<b>3</b> active events', feReg300: '<b>300</b> registrations per event', feFee3: '<b>3%</b> transaction fee',
      feOnlineExport: 'Online payments · report export', feScoreQrAi: 'Scoring · QR check-in · event AI assistant',
      feActive15: '<b>15</b> active events', feReg1500: '<b>1,500</b> registrations per event', feFee2: '<b>2%</b> transaction fee',
      feScoreMulti: 'Scoring · multi-judge · team member roles · broadcast notices', feQrAiAdmin: 'QR check-in · event AI · organizer-console AI',
      feActiveUnlim: '<b>Unlimited</b> active events', feRegUnlim: '<b>Unlimited</b> registrations', feFee1: '<b>1%</b> transaction fee',
      btnUseFree: 'Get started', btnUpStarter: 'Upgrade to Starter', btnUpPro: 'Upgrade to Pro →', btnChooseTeam: 'Choose Team →',
      btnTrialStarter: 'Start 14-day free trial', btnTrialPro: 'Start 14-day free trial →',
      // ----- plan-card features / unit templates ({n} = number) -----
      pfPayment: 'Online payments', pfCsv: 'Report export', pfScoring: 'Scoring', pfMultiJudge: 'Multi-judge + team member roles', pfCampaigns: 'Broadcast notices',
      prTipScoring: 'Scoring: the organizer or staff enters one score per team (overwrite-style) — ideal when a single judge or panel records final scores together.',
      prTipMulti: 'Multi-judge scoring: each judge signs in and scores the same team independently; the system aggregates all judges\' scores, computes the average and produces a live leaderboard. Pairs with team member roles so you can invite multiple judge accounts.',
      pfCheckin: 'QR check-in', pfWaitlist: 'Waitlist', pfEventAi: 'Event AI assistant', pfAdminAi: 'Organizer-console AI', pfCert: 'Badges & certificates',
      tActive: '<b>{n}</b> active events', tActive1: '<b>{n}</b> active event', tReg: '<b>{n}</b> registrations per event', tFee: '<b>{n}%</b> transaction fee', uUnlimited: 'Unlimited',
      // ----- faq -----
      faqH2: 'Frequently asked questions',
      faqQ1: 'How is RegMaster different from Google Forms?',
      faqA1: 'Google Forms is fine for internal surveys, but it can\'t collect payments, send notifications or manage rosters. RegMaster is purpose-built for public event registration: payment integration, automated emails, real-time analytics, QR check-in and certificate generation — everything you need in one console, instead of stitching together five different tools.',
      faqQ2: 'Can the Free plan really run a real event?',
      faqA2: 'Yes. The Free plan includes full form design, application review and email notifications — and it can even collect payments (5% per transaction). If you only run one or two small events a year, Free is more than enough.',
      faqQ3: 'How are payments settled, and how soon are they paid out?',
      faqA3: 'We integrate PayUNI online payments, supporting credit card and ATM transfer (other methods depend on your PayUNI merchant settings). The platform collects then pays out to your linked account on the payout cycle; bank transfers go directly to the organizer\'s account. Registrants can enter a business tax ID on the form — automatic e-invoice delivery is coming soon.',
      faqQ4: 'Can I migrate my existing registration data?',
      faqA4: 'Yes. We provide CSV / Excel import tools, with hands-on help for large migrations (500+ records). Your existing Google Forms, Excel rosters and Typeform data all transfer seamlessly into RegMaster.',
      faqQ5: 'Is my data secure? Is it PDPA compliant?',
      faqA5: 'The system runs on Google Cloud / Firebase with HTTPS (TLS) encryption end to end, plus access control and permission management. We handle data in line with Taiwan\'s Personal Data Protection Act; see our <a href="/privacy.html">Privacy Policy</a> for details.',
      faqQ6: 'Can you issue invoices with a business tax ID?',
      faqA6: 'Registrants can enter a business tax ID on the form, and it\'s included in your exports for issuing invoices. 🚧 Automatic e-invoice issuance and delivery is coming soon; until then, please issue invoices yourself using the tax-ID data or contact support.',
      // ----- closing cta -----
      ctaH2: 'In 10 minutes,<br>your event is <em>live</em>.',
      ctaLead: 'No credit card · no engineers · no sales calls to bother you.<br>Bring the passion for your event; leave the rest to RegMaster.',
      ctaFree2: 'Start free →', ctaExplore: 'Explore events',
      // ----- shared admin shell (admin-nav.js) -----
      anBrandSubSystem: 'System Admin', anBrandSubOrg: 'Organizer Console', anRoleSystem: 'System Admin', anRoleOrg: 'Organizer',
      anGrpOverview: 'Overview', anDashboard: 'Dashboard', anAllEvents: 'All Events', anAi: 'AI Assistant',
      anGrpThisEvent: 'This Event', anEvtOverview: 'Overview', anEvtSettings: 'Settings', anEvtForm: 'Form Builder', anEvtReg: 'Registrations', anEvtNotice: 'Notices', anEvtBilling: 'Billing', anEvtScoring: 'Scoring', anEvtCheckin: 'Check-in', anEvtCert: 'Certificates / Badges',
      anGrpManage: 'Manage', anLicense: 'Plans & Licenses', anLogs: 'Activity Log', anSettings: 'Settings',
      anGrpSysadmin: 'System Admin', anSysSettings: 'System Settings', anAudit: 'Audit Log',
      anUsageCur: 'Current plan', anUsageFreeText: 'Free plan', anUsageFreeHint: 'Free plan — upgrade to unlock more', anUpgrade: 'Upgrade →', anLogout: 'Log out', anFeatLocked: 'This feature requires a plan upgrade. Go to Plans & Licensing?',
      anUntil: 'Until ', anLangTitle: '切換語言 / Switch language'
    }
  };
  Object.keys(ADD.zh).forEach(function (k) { if (!(k in window.I18N.zh)) window.I18N.zh[k] = ADD.zh[k]; });
  Object.keys(ADD.en).forEach(function (k) { if (!(k in window.I18N.en)) window.I18N.en[k] = ADD.en[k]; });

  // Quick translate helper. Falls back: requested lang → zh → key itself.
  window.L = function (key, lang) {
    var L = lang || window.LANG || 'zh';
    var dict = window.I18N[L] || window.I18N.zh;
    return dict[key] || window.I18N.zh[key] || key;
  };

  // ---------------------------------------------------------------------------
  // System status / enum value localizer.
  // The backend stores certain values in Chinese (registration status, payment
  // status, payment method). Those stored strings are used in comparisons and
  // must NOT change. Use window.LS(value) at RENDER time to get a display label
  // in the active language; the stored value is untouched. Unknown values pass
  // through unchanged. Handles the dynamic "備取N" (waitlist #N) form.
  // ---------------------------------------------------------------------------
  var STATUS_MAP = {
    '正取':   { zh: '正取',   en: 'Accepted' },
    '審核中': { zh: '審核中', en: 'Pending review' },
    '已取消': { zh: '已取消', en: 'Cancelled' },
    '待審核': { zh: '待審核', en: 'Under review' },
    '待確認': { zh: '待確認', en: 'Pending' },
    '已確認': { zh: '已確認', en: 'Confirmed' },
    '待付款': { zh: '待付款', en: 'Unpaid' },
    '已付款': { zh: '已付款', en: 'Paid' },
    '未付款': { zh: '未付款', en: 'Unpaid' },
    '已退費': { zh: '已退費', en: 'Refunded' },
    '免費':   { zh: '免費',   en: 'Free' },
    '信用卡': { zh: '信用卡', en: 'Credit card' },
    'ATM':    { zh: 'ATM',    en: 'ATM' },
    '超商':   { zh: '超商',   en: 'Convenience store' },
    '超商代碼': { zh: '超商代碼', en: 'Convenience-store code' },
    '銀行轉帳': { zh: '銀行轉帳', en: 'Bank transfer' },
    '匯款':   { zh: '匯款',   en: 'Bank transfer' },
    '轉帳':   { zh: '轉帳',   en: 'Bank transfer' },
    'LINE Pay': { zh: 'LINE Pay', en: 'LINE Pay' },
    '線上付款': { zh: '線上付款', en: 'Online payment' },
    '折抵':   { zh: '折抵',   en: 'Discount' },
    // Raw paymentMethod codes stored on team docs / config.paymentMethods
    'payuni': { zh: '信用卡（PayUNI）', en: 'Credit card (PayUNI)' },
    'atm':    { zh: '銀行轉帳',         en: 'Bank transfer' },
    'onlinePayment': { zh: '信用卡（PayUNI）',  en: 'Credit card (PayUNI)' },
    'discount': { zh: '折扣全免',       en: 'Free (discount)' }
  };
  window.LS = function (val, lang) {
    var L = lang || window.LANG || 'zh';
    if (val == null) return val;
    var s = String(val);
    var m = s.match(/^備取\s*(\d*)$/); // waitlist, optional number
    if (m) return L === 'en' ? ('Waitlist' + (m[1] ? (' #' + m[1]) : '')) : s;
    var e = STATUS_MAP[s];
    return e ? (L === 'en' ? e.en : e.zh) : s;
  };

  // ---------------------------------------------------------------------------
  // Form OPTION value localizer. Built-in registration-form option lists store
  // their Chinese string as BOTH the <option> value and visible text, and that
  // value is what gets submitted / compared. window.LO(value) returns a display
  // label for the active language WITHOUT changing the stored value — use it for
  // the option's visible TEXT only (keep value="<original Chinese>").
  //   • Explicit map below covers the built-in enumerations.
  //   • Bilingual "中文 English" entries (e.g. country list "台灣 Taiwan") return
  //     the English portion in en mode automatically.
  //   • Organiser-defined options (dietary/tshirt) and unknown values pass through
  //     unchanged (so user-generated content is never altered).
  // ---------------------------------------------------------------------------
  var OPTIONS_MAP = {
    // gender (student)
    '男生': 'Male', '女生': 'Female', '男': 'Male', '女': 'Female',
    // salutation
    '先生': 'Mr.', '小姐': 'Ms.', '女士': 'Madam', '太太': 'Mrs.', '老師': 'Teacher', '教授': 'Professor', '博士': 'Dr.', '醫師': 'Doctor',
    // Taiwan cities / counties
    '台北市': 'Taipei City', '新北市': 'New Taipei City', '桃園市': 'Taoyuan City', '台中市': 'Taichung City',
    '台南市': 'Tainan City', '高雄市': 'Kaohsiung City', '基隆市': 'Keelung City', '新竹市': 'Hsinchu City', '嘉義市': 'Chiayi City',
    '新竹縣': 'Hsinchu County', '苗栗縣': 'Miaoli County', '彰化縣': 'Changhua County', '南投縣': 'Nantou County',
    '雲林縣': 'Yunlin County', '嘉義縣': 'Chiayi County', '屏東縣': 'Pingtung County', '宜蘭縣': 'Yilan County',
    '花蓮縣': 'Hualien County', '台東縣': 'Taitung County', '澎湖縣': 'Penghu County', '金門縣': 'Kinmen County', '連江縣': 'Lienchiang County',
    // education level
    '國小': 'Elementary school', '國中': 'Junior high school', '高中職': 'Senior / vocational high school', '五專': 'Junior college (5-year)',
    '大學': 'University', '碩士': "Master's", '博士後': 'Postdoctoral', '社會人士': 'Working professional',
    // referral source
    '親友介紹': 'Friend / family referral', '社群媒體(FB‧IG)': 'Social media (FB / IG)', '官方網站': 'Official website',
    '電子報': 'Newsletter', '學校公告': 'School announcement',
    // transportation
    '自行前往': 'Travelling on my own', '搭乘接駁車': 'Shuttle bus', '大眾運輸': 'Public transport',
    // consent
    '同意': 'Agree', '不同意': 'Disagree',
    // dietary restriction
    '一般': 'No restriction', '蛋奶素': 'Lacto-ovo vegetarian', '全素': 'Vegan', '不吃牛': 'No beef', '清真 (Halal)': 'Halal',
    '海鮮過敏': 'Seafood allergy', '堅果過敏': 'Nut allergy', '麩質過敏': 'Gluten allergy',
    // accommodation
    '需要': 'Required', '不需要': 'Not required',
    // invoice type
    '二聯式': 'Duplicate (B2C)', '三聯式': 'Triplicate (B2B)',
    // misc / shared
    '其他': 'Other',
    // phone country-code dropdown labels (country part only; the value is the dial code)
    '台灣': 'Taiwan', '中國': 'China', '香港': 'Hong Kong', '澳門': 'Macau', '日本': 'Japan', '韓國': 'South Korea',
    '新加坡': 'Singapore', '馬來西亞': 'Malaysia', '泰國': 'Thailand', '越南': 'Vietnam', '菲律賓': 'Philippines', '印尼': 'Indonesia',
    '印度': 'India', '澳洲': 'Australia', '紐西蘭': 'New Zealand', '美國 / 加拿大': 'USA / Canada', '英國': 'United Kingdom',
    '法國': 'France', '德國': 'Germany', '義大利': 'Italy', '西班牙': 'Spain', '葡萄牙': 'Portugal', '荷蘭': 'Netherlands',
    '比利時': 'Belgium', '瑞士': 'Switzerland', '奧地利': 'Austria', '瑞典': 'Sweden', '挪威': 'Norway', '丹麥': 'Denmark',
    '芬蘭': 'Finland', '愛爾蘭': 'Ireland', '波蘭': 'Poland', '捷克': 'Czech Republic', '希臘': 'Greece', '俄羅斯': 'Russia',
    '土耳其': 'Turkey', '以色列': 'Israel', '阿聯酋': 'UAE', '沙烏地': 'Saudi Arabia', '埃及': 'Egypt', '南非': 'South Africa',
    '奈及利亞': 'Nigeria', '肯亞': 'Kenya', '墨西哥': 'Mexico', '巴西': 'Brazil', '阿根廷': 'Argentina', '智利': 'Chile',
    '哥倫比亞': 'Colombia', '秘魯': 'Peru'
  };
  window.LO = function (val, lang) {
    var L = lang || window.LANG || 'zh';
    if (val == null) return val;
    var s = String(val);
    if (L !== 'en') return s; // Chinese mode: show the original value verbatim
    if (OPTIONS_MAP[s]) return OPTIONS_MAP[s];
    // Bilingual "中文 English" pair → English portion (covers the country list).
    var m = s.match(/^[㐀-鿿][㐀-鿿·]*\s+([A-Za-z].*)$/);
    if (m) return m[1];
    return s; // unknown / organiser-defined → unchanged
  };

  // ---------------------------------------------------------------------------
  // Built-in registration FIELD LABEL localizer. The standard field labels
  // (中文姓名, 性別, 緊急聯絡關係 …) are built-in defaults; organiser-customised
  // labels are data and must be left as typed. window.LF() can be called either
  // with a field KEY (LF('gender', currentLabel)) or with a label STRING
  // (LF('性別')). In English it returns the built-in English label; if the
  // organiser changed the label away from the built-in default, the custom label
  // is returned unchanged. In Chinese it returns the original.
  // ---------------------------------------------------------------------------
  var FIELD_LABEL_MAP = {
    chineseName: { zh: '中文姓名', en: 'Chinese name' }, englishName: { zh: '英文姓名', en: 'English name' },
    idNumber: { zh: '身分證', en: 'National ID' }, birthday: { zh: '出生年月日', en: 'Date of birth' },
    school: { zh: '學校', en: 'School' }, department: { zh: '系所', en: 'Department' }, grade: { zh: '年級', en: 'Grade / Year' },
    email: { zh: 'Email', en: 'Email' }, phone: { zh: '電話', en: 'Phone' }, address: { zh: '地址', en: 'Address' },
    dietary: { zh: '飲食習慣', en: 'Dietary preference' }, tshirt: { zh: 'T-shirt 尺寸', en: 'T-shirt size' },
    gender: { zh: '性別', en: 'Gender' }, nationality: { zh: '國籍', en: 'Nationality' }, passport: { zh: '護照號碼', en: 'Passport number' },
    classroom: { zh: '班級', en: 'Class' }, organization: { zh: '服務單位', en: 'Organization' }, jobTitle: { zh: '職稱', en: 'Job title' },
    postalCode: { zh: '郵遞區號', en: 'Postal code' }, emergencyName: { zh: '緊急聯絡人', en: 'Emergency contact' },
    emergencyPhone: { zh: '緊急聯絡電話', en: 'Emergency contact phone' }, emergencyRelation: { zh: '緊急聯絡關係', en: 'Relationship to emergency contact' },
    dietaryRestriction: { zh: '飲食限制 / 過敏', en: 'Dietary restriction / allergy' }, bloodType: { zh: '血型', en: 'Blood type' },
    healthNote: { zh: '特殊健康狀況', en: 'Special health conditions' }, invoiceType: { zh: '發票類型', en: 'Invoice type' },
    invoiceTitle: { zh: '發票抬頭', en: 'Invoice title' }, taxId: { zh: '統一編號', en: 'Business tax ID' },
    accommodation: { zh: '住宿需求', en: 'Accommodation needed' }, lineId: { zh: 'LINE ID', en: 'LINE ID' },
    salutation: { zh: '尊稱', en: 'Salutation' }, city: { zh: '居住縣市', en: 'City of residence' }, eduLevel: { zh: '教育階段', en: 'Education level' },
    studentId: { zh: '學號', en: 'Student ID' }, referralSource: { zh: '如何得知本活動', en: 'How you heard about this event' },
    transportation: { zh: '交通方式', en: 'Transportation' }, accessibility: { zh: '特殊需求/無障礙', en: 'Special / accessibility needs' },
    guardianName: { zh: '監護人姓名', en: 'Guardian name' }, guardianPhone: { zh: '監護人電話', en: 'Guardian phone' },
    guardianConsent: { zh: '家長同意', en: 'Parental consent' }, consent: { zh: '條款/肖像權同意', en: 'Terms / portrait-rights consent' },
    website: { zh: '網站', en: 'Website' }
  };
  var FIELD_LABEL_ZH = {};
  Object.keys(FIELD_LABEL_MAP).forEach(function (k) { FIELD_LABEL_ZH[FIELD_LABEL_MAP[k].zh] = FIELD_LABEL_MAP[k].en; });
  window.LF = function (keyOrLabel, fallback, lang) {
    var L = lang || window.LANG || 'zh';
    var lbl = (fallback != null ? fallback : keyOrLabel);
    if (L !== 'en') return lbl; // Chinese: show as-is
    var e = FIELD_LABEL_MAP[keyOrLabel];
    if (e) return (fallback == null || fallback === e.zh) ? e.en : fallback; // built-in key
    if (FIELD_LABEL_ZH[lbl]) return FIELD_LABEL_ZH[lbl]; // reverse-lookup by zh label
    return lbl; // organiser-defined / unknown
  };

  // ---------------------------------------------------------------------------
  // Applier: walk the DOM and translate elements tagged with data-i18n*.
  //   data-i18n           → textContent
  //   data-i18n-html      → innerHTML (for nodes containing <br>/<em>/<b>/<a>)
  //   data-i18n-placeholder → placeholder attribute
  //   data-i18n-title     → title attribute
  //   data-i18n-aria      → aria-label attribute
  // Falls back to the element's existing content when a key is missing, so
  // partially-tagged pages degrade gracefully.
  // ---------------------------------------------------------------------------
  function applyI18n(root) {
    var lang = window.LANG || 'zh';
    var scope = root || document;
    function has(key) {
      var d = window.I18N[lang] || window.I18N.zh;
      return (key in d) || (key in window.I18N.zh);
    }
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n'); if (has(k)) el.textContent = window.L(k, lang);
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html'); if (has(k)) el.innerHTML = window.L(k, lang);
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-placeholder'); if (has(k)) el.setAttribute('placeholder', window.L(k, lang));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-title'); if (has(k)) el.setAttribute('title', window.L(k, lang));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria'); if (has(k)) el.setAttribute('aria-label', window.L(k, lang));
    });
  }
  window.applyI18n = applyI18n;

  // Auto-wire: apply once the DOM is ready, and re-apply whenever language changes.
  function boot() {
    applyI18n();
    if (window.AppState && typeof window.AppState.on === 'function') {
      window.AppState.on('lang-changed', function () { applyI18n(); });
    }
  }
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
