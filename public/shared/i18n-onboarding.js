// =============================================================================
// RegMaster · I18N additions for onboarding.html (shared/i18n-onboarding.js)
// =============================================================================
// Page-scoped keys (prefix: ob*). Loaded AFTER /shared/i18n.js so window.I18N
// already exists. Reuses shared keys (brandName, nav*, ft*) where present.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- page title / nav -----
    obDocTitle: '新手引導 · RegMaster',
    obSkip: '略過設定 →',

    // ----- steps rail -----
    obRailEyebrow: 'SETUP YOUR WORKSPACE',
    obRail1Title: '歡迎', obRail1Desc: '確認帳號狀態與方案', obRail1Est: '~ 30 秒',
    obRail2Title: '建立組織', obRail2Desc: '組織名稱與類型', obRail2Est: '~ 2 分鐘',
    obRail3Title: '邀請夥伴', obRail3Desc: '邀請夥伴一起管理（可略過）', obRail3Est: '~ 1 分鐘',
    obRail4Title: '完成', obRail4Desc: '準備建立第一場活動', obRail4Est: '~ 30 秒',

    // ----- step 1: welcome -----
    obStep1Eyebrow: 'STEP 01',
    obStep1Title: '歡迎來到 RegMaster 👋',
    obStep1Lead: '花 5 分鐘把工作區設定好，之後辦活動就會非常輕鬆。<br>所有步驟都可以稍後在「設定」頁修改。',
    obStep1Tip: '<strong id="welcomeName">您好！</strong>您的帳號已啟用，並獲得一組 <strong>免費單次活動授權碼</strong>（已寄至註冊信箱）。完成設定後，您就能建立第一場活動。',
    obStep1Check1Pre: '帳號已開通 · ',
    obStep1Check2Pre: '方案：',
    obStep1Check3: 'Free 版永久免費，需要時再升級',
    obStep1Meta: '步驟 1 / 4',
    obStep1Next: '繼續 →',

    // ----- step 2: organization -----
    obStep2Eyebrow: 'STEP 02',
    obStep2Title: '來認識你的組織',
    obStep2Lead: '這些資訊會出現在報名頁、發票、Email 通知裡。可隨時於設定頁修改。',
    obOrgTypeLabel: '組織類型 *',
    obOrgCompanyTitle: '公司 / 企業', obOrgCompanyDesc: '需要開立發票',
    obOrgSchoolTitle: '學校 / 學術單位', obOrgSchoolDesc: '享教育價優惠',
    obOrgNgoTitle: '非營利 / 社群', obOrgNgoDesc: '免費或低價方案',
    obOrgTip: '<strong>學校 / 學術單位</strong>可享 Pro 方案 30% 折扣，並支援以機構信箱付款。系所名稱建議填寫完整全名以利對帳。',
    obOrgNameLabel: '組織全名 *',
    obOrgNamePh: '例如：某某大學 資訊工程系 / 某某協會',
    obOrgNameENLabel: '英文名稱',
    obOrgTaxIdLabel: '統一編號',
    obOrgTaxIdPh: '8 碼統編',
    obOrgRegionLabel: '主要使用地區',
    obRegionTW: '🇹🇼 台灣', obRegionHK: '🇭🇰 香港', obRegionJP: '🇯🇵 日本', obRegionSG: '🇸🇬 新加坡',
    obEventTypeLabel: '辦活動的常見類型 ',
    obEventTypeHint: '（多選，幫助我們推薦範本）',
    obTagInputPh: '例：程式競賽、研討會（Enter 新增）',
    obRoleLabel: '你在組織中的角色',
    obRoleOwnerTitle: '主要負責人 · Owner', obRoleOwnerDesc: '能管理所有活動、計費與成員',
    obRolePmTitle: '專案經理 · PM', obRolePmDesc: '負責特定活動的設定與營運',
    obRoleOpsTitle: '客服 / 報到人員', obRoleOpsDesc: '協助處理報名與現場服務',
    obRoleFinanceTitle: '財務 / 會計', obRoleFinanceDesc: '處理發票、退款與對帳',
    obStep2Meta: '步驟 2 / 4 · 已完成 <strong>50%</strong>',
    obPrev: '← 上一步',
    obStep2Next: '繼續 →',

    // ----- step 3: invite -----
    obStep3Eyebrow: 'STEP 03',
    obStep3Title: '邀請夥伴一起管理',
    obStep3Lead: '活動很少一個人能完成。邀請夥伴，分權限管理。可稍後再加。',
    obInviteEmailPh: '夥伴的 Email',
    obInviteRolePm: '專案經理', obInviteRoleOps: '客服 / 報到', obInviteRoleFinance: '財務',
    obAddInvite: '＋ 加入',
    obStep3Tip: '夥伴會收到邀請信，註冊後自動加入你的組織。免費版可邀請 1 位，Pro 版可邀請 3 位。<strong>本步驟可略過</strong>，未來在「設定 → 成員管理」可隨時新增。',
    obStep3Meta: '步驟 3 / 4 · 已完成 <strong>75%</strong>',
    obStep3SkipBtn: '略過',
    obStep3Next: '繼續 →',

    // ----- step 4: complete -----
    obStep4Title: '設定完成！',
    obStep4Sub: '準備好建立你的第一場活動了嗎？',
    obStep4Check1: '帳號已開通並驗證',
    obStep4Check2: '組織資訊已建立',
    obStep4Check3: 'Free 方案已啟用',
    obStep4Check4: '可立即建立第一場活動',
    obStep4Tip: '需要協助？可隨時於 AI 助理對話框提問，或來信 <strong>support@calculator.com.tw</strong>，我們很樂意協助你上手。',
    obStep4Meta: '步驟 4 / 4 · 100% 完成',
    obStep4Cta: '建立第一場活動 →',

    // ----- dynamic JS strings -----
    obPlanTrial: '免費版 Free', obPlanFree: '免費版 Free', obPlanStarter: '入門版 Starter',
    obPlanPro: '專業版 Pro', obPlanTeam: '團隊版 Team',
    obWelcomeGreet: '您好', obWelcomeHost: '主辦人', obWelcomeBang: '！',
    obEmailFallback: '已驗證信箱',
    obErrOrgNameRequired: '請填寫組織全名',
    obErrInvalidEmail: 'Email 格式不正確',
    obErrDupEmail: '已加入過這個 Email'
  };

  var E = {
    // ----- page title / nav -----
    obDocTitle: 'Onboarding · RegMaster',
    obSkip: 'Skip setup →',

    // ----- steps rail -----
    obRailEyebrow: 'SETUP YOUR WORKSPACE',
    obRail1Title: 'Welcome', obRail1Desc: 'Confirm your account and plan', obRail1Est: '~ 30 sec',
    obRail2Title: 'Create organization', obRail2Desc: 'Organization name and type', obRail2Est: '~ 2 min',
    obRail3Title: 'Invite teammates', obRail3Desc: 'Invite teammates to help manage (optional)', obRail3Est: '~ 1 min',
    obRail4Title: 'Done', obRail4Desc: 'Ready to create your first event', obRail4Est: '~ 30 sec',

    // ----- step 1: welcome -----
    obStep1Eyebrow: 'STEP 01',
    obStep1Title: 'Welcome to RegMaster 👋',
    obStep1Lead: 'Spend 5 minutes setting up your workspace and running events later will be a breeze.<br>You can change any of these steps later under Settings.',
    obStep1Tip: '<strong id="welcomeName">Hello!</strong>Your account is active and you\'ve received a <strong>free single-event license code</strong> (sent to your registered email). Once setup is done, you can create your first event.',
    obStep1Check1Pre: 'Account activated · ',
    obStep1Check2Pre: 'Plan: ',
    obStep1Check3: 'Free is free forever — upgrade whenever you need to',
    obStep1Meta: 'Step 1 / 4',
    obStep1Next: 'Continue →',

    // ----- step 2: organization -----
    obStep2Eyebrow: 'STEP 02',
    obStep2Title: 'Tell us about your organization',
    obStep2Lead: 'This information appears on registration pages, invoices and email notifications. You can change it anytime under Settings.',
    obOrgTypeLabel: 'Organization type *',
    obOrgCompanyTitle: 'Company / Business', obOrgCompanyDesc: 'Needs to issue invoices',
    obOrgSchoolTitle: 'School / Academic', obOrgSchoolDesc: 'Eligible for education pricing',
    obOrgNgoTitle: 'Nonprofit / Community', obOrgNgoDesc: 'Free or low-cost plans',
    obOrgTip: '<strong>Schools and academic institutions</strong> get 30% off the Pro plan and can pay using an institutional email. We recommend entering the full department name to make reconciliation easier.',
    obOrgNameLabel: 'Full organization name *',
    obOrgNamePh: 'e.g. ABC University, Dept. of Computer Science / ABC Association',
    obOrgNameENLabel: 'English name',
    obOrgTaxIdLabel: 'Business tax ID',
    obOrgTaxIdPh: '8-digit tax ID',
    obOrgRegionLabel: 'Primary region',
    obRegionTW: '🇹🇼 Taiwan', obRegionHK: '🇭🇰 Hong Kong', obRegionJP: '🇯🇵 Japan', obRegionSG: '🇸🇬 Singapore',
    obEventTypeLabel: 'Common event types you run ',
    obEventTypeHint: '(multi-select, helps us recommend templates)',
    obTagInputPh: 'e.g. coding contest, conference (press Enter to add)',
    obRoleLabel: 'Your role in the organization',
    obRoleOwnerTitle: 'Primary owner · Owner', obRoleOwnerDesc: 'Manage all events, billing and members',
    obRolePmTitle: 'Project manager · PM', obRolePmDesc: 'Run setup and operations for specific events',
    obRoleOpsTitle: 'Support / Check-in staff', obRoleOpsDesc: 'Help with registrations and on-site service',
    obRoleFinanceTitle: 'Finance / Accounting', obRoleFinanceDesc: 'Handle invoices, refunds and reconciliation',
    obStep2Meta: 'Step 2 / 4 · <strong>50%</strong> complete',
    obPrev: '← Back',
    obStep2Next: 'Continue →',

    // ----- step 3: invite -----
    obStep3Eyebrow: 'STEP 03',
    obStep3Title: 'Invite teammates to help manage',
    obStep3Lead: 'Events are rarely a one-person job. Invite teammates and manage by role. You can add more later.',
    obInviteEmailPh: 'Teammate\'s email',
    obInviteRolePm: 'Project Manager', obInviteRoleOps: 'Support / Check-in', obInviteRoleFinance: 'Finance',
    obAddInvite: '＋ Add',
    obStep3Tip: 'Teammates receive an invitation email and automatically join your organization after signing up. The Free plan allows 1 invite, Pro allows 3. <strong>This step is optional</strong> — you can add members anytime under Settings → Member Management.',
    obStep3Meta: 'Step 3 / 4 · <strong>75%</strong> complete',
    obStep3SkipBtn: 'Skip',
    obStep3Next: 'Continue →',

    // ----- step 4: complete -----
    obStep4Title: 'Setup complete!',
    obStep4Sub: 'Ready to create your first event?',
    obStep4Check1: 'Account activated and verified',
    obStep4Check2: 'Organization information created',
    obStep4Check3: 'Free plan activated',
    obStep4Check4: 'Ready to create your first event',
    obStep4Tip: 'Need help? Ask the AI assistant anytime, or email us at <strong>support@calculator.com.tw</strong> — we\'re happy to help you get started.',
    obStep4Meta: 'Step 4 / 4 · 100% complete',
    obStep4Cta: 'Create your first event →',

    // ----- dynamic JS strings -----
    obPlanTrial: 'Free', obPlanFree: 'Free', obPlanStarter: 'Starter',
    obPlanPro: 'Pro', obPlanTeam: 'Team',
    obWelcomeGreet: 'Hello', obWelcomeHost: 'Organizer', obWelcomeBang: '!',
    obEmailFallback: 'verified email',
    obErrOrgNameRequired: 'Please enter your full organization name',
    obErrInvalidEmail: 'Invalid email format',
    obErrDupEmail: 'This email has already been added'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
