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

  // Quick translate helper. Falls back: requested lang → zh → key itself.
  window.L = function (key, lang) {
    var L = lang || window.LANG || 'zh';
    var dict = window.I18N[L] || window.I18N.zh;
    return dict[key] || window.I18N.zh[key] || key;
  };
})();
