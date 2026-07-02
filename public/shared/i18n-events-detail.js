// =============================================================================
// RegMaster · I18N (shared/i18n-events-detail.js)
// =============================================================================
// Page-scoped translations for public/events/detail.html. Registers into the
// shared window.I18N dictionary built by /shared/i18n.js. All new keys are
// prefixed with "ed". Nav/footer keys are reused from i18n.js and NOT redefined
// here.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- page title -----
    edPageTitle: '活動詳情 · RegMaster',

    // ----- nav / crumbs -----
    edCrumbExplore: '探索活動',
    edCrumbLoading: '載入中⋯⋯',
    edNavMy: '我的報名',
    edNavLogin: '主辦方登入',

    // ----- loading / error states -----
    edLoading: '載入活動資料⋯⋯',
    edErrTitle: '無法載入活動',
    edErrMsg: '找不到此活動，或活動已下架。',
    edErrBack: '回到活動列表',
    edErrNoId: '網址未指定活動編號。',
    edErrNetwork: '網路錯誤',

    // ----- hero -----
    edHostLabel: '主辦單位',
    edFactDate: '日期',
    edFactCategory: '類別',
    edFactCapacity: '名額',
    edFactDeadline: '截止',
    edCtaTitle: '準備報名',
    edCtaSub: '即將開始⋯⋯',
    edProgressLabel: '已報名',
    edCdDays: '天', edCdHours: '時', edCdMins: '分', edCdSecs: '秒',
    edRegisterBtn: '立即報名 →',
    edLookupBtn: '查詢已報名',

    // ----- tabs -----
    edTabAbout: '活動介紹',
    edTabAnn: '公告',
    edTabPoster: '海報',
    edTabRules: '規章',

    // ----- sections -----
    edAboutH2: '關於這場活動',
    edAnnH2Prefix: '公告',
    edAnnCountZero: '0 則',
    edAnnEmpty: '目前沒有公告。',
    edPosterH2: '活動海報',
    edPosterEmpty: '主辦方尚未上傳海報。',
    edRulesH2: '規章與規則',
    edRulesEmpty: '主辦方尚未上傳規章文件。',

    // ----- side cards -----
    edShareH4: '分享活動',
    edShareCopy: '📋 複製連結',
    edShareMobileBtn: '📤 分享活動',
    edSharePrefillTemplate: '{title}｜{date}｜立刻報名 → {url}',
    edPdfH4: '下載規章',
    edPdfTitle: '活動規章 PDF',
    edPdfHint: '點擊開啟',
    edAiH4: '💬 AI 活動小幫手',
    edAiP: '關於本活動的問題（時間、組別、費用、規章…）都可以直接詢問 AI。',
    edAiOpenBtn: '開啟 AI 對話',
    edHelpH4: '需要協助',
    edHelpP: '活動相關問題請直接洽詢主辦方。其他平台問題請<a href="/contact.html?topic=support" style="color:var(--acc);font-weight:500">聯絡客服</a>。',

    // ----- AI chat panel -----
    edAiPanelAria: '活動 AI 對話',
    edAiPanelTitle: 'AI 活動小幫手',
    edAiPanelSub: '僅回答本活動相關問題',
    edAiPanelClose: '關閉',
    edAiGreeting: '您好！我是 AI 小幫手，本活動的時間、組別、費用、規章內容都可以詢問我。請輸入您的問題。',
    edAiInputPlaceholder: '請輸入問題⋯⋯（按 Enter 送出）',
    edAiSendBtn: '送出',
    edAiCooldown: '請稍候再提問⋯',
    edAiThinking: '⏳ AI 思考中⋯',
    edAiFailAnswer: 'AI 暫時無法回答，請稍後再試。',
    edAiFailConnect: 'AI 暫時無法連線，請稍後再試。',

    // ----- dynamic: tags / facts -----
    edTagOpen: '🎟 報名中',
    edTagClosed: '已截止',
    edTagNotOpen: '未開放報名',
    edCtaManualNote: '報名後由主辦方審核錄取，錄取將以 Email 通知',
    edCtaNotOpenTitle: '尚未開放報名',
    edCtaNotOpenSub: '主辦方尚未開放報名，請稍後再回來查看。',
    edRegisteredNotOpen: '尚未開放',
    edTagSoon: '🔜 即將開放',
    edTagDaysLeft: '⚡ 剩 {n} 天',
    edUntitled: '(未命名活動)',
    edHostFallback: '活動主辦方',
    edHostMetaPrefix: '活動編號 ',
    edSessionFallback: '梯次',
    edDateTBA: '日期待公告',
    edDateTBASmall: '待公告',
    edCategoryDefault: '一般活動',
    edRegisteredSuffix: ' 已報名',
    edCapacityFull: '% 已滿',
    edNoCapacityLimit: '未設名額上限',
    edDeadlineTBA: '待公告',
    edPosterAlt: '活動海報',
    edPosterLoadFail: '海報載入失敗',

    // ----- dynamic: CTA -----
    edCtaOpen: '可報名',
    edCtaDeadlinePrefix: '報名截止：',
    edCtaAnytime: '隨時可報名',
    edCtaClosedTitle: '報名已截止',
    edCtaSoonTitle: '即將開放',
    edCtaSoonSub: '開放時間：',
    edCtaClosedSub: '若有疑問請洽詢主辦方',
    edRegisteredNow: '立即報名 →',
    edRegisteredClosed: '報名已截止',
    edRegisteredSoon: '即將開放',

    // ----- dynamic: description / rules -----
    edDescEmpty: '主辦方尚未填寫詳細介紹。',
    edAnnSuffix: ' 則',
    edRulesHasPdf: '本活動有正式規章 PDF。請於右側下載閱讀。',
    edRulesDownloadBtn: '下載規章 PDF →',

    // ----- dynamic: share -----
    edCopied: '✓ 已複製',

    // ----- dynamic: LINE bound toast -----
    edLineBound: '✓ 已綁定 LINE 帳號',

    // ----- modal: lookup / manage -----
    edModalTitle: '查詢 / 管理我的報名',
    edModalIntro: '輸入報名成功後取得的<b>報名編號</b>與<b>密碼</b>登入。',
    edModalTeamPh: '報名編號（例 {id}-T...）',
    edModalPwdPh: '密碼',
    edModalLoginBtn: '登入',
    edModalForgot: '忘記密碼？',
    edModalSocialDivider: '或用已綁定的社群帳號',
    edModalLoginG: '用 Google 登入',
    edModalLoginL: '用 LINE 登入',
    edModalSocialHint: '社群登入會列出你名下所有報名（曾在此綁定者），可直接選擇修改或退費。',

    // ----- modal: forgot password -----
    edForgotIntro: '輸入<b>報名編號</b>，系統會將「密碼重設連結」寄到報名時填寫的 Email；點擊連結即可自行設定新密碼（連結 60 分鐘內有效）。',
    edForgotTeamPh: '報名編號（例 {id}-T...）',
    edForgotSendBtn: '寄出密碼重設連結',
    edForgotNeedId: '請輸入報名編號',
    edForgotSending: '寄送中⋯',
    edForgotSent: '若此報名編號存在，重設連結已寄出，請查收信箱。',
    edForgotSendFail: '寄送失敗',

    // ----- modal: login errors / status -----
    edLoginGoogleNotLoaded: 'Google 元件未載入，請重新整理',
    edLoginGoogleIng: 'Google 登入中⋯',
    edLoginGoogleNoBind: '此 Google 帳號尚未綁定任何報名，請先用報名編號+密碼登入並綁定。',
    edLoginFail: '登入失敗',
    edLoginGoogleFail: 'Google 登入失敗',
    edLoginNeedBoth: '請輸入報名編號與密碼',
    edLoginIng: '登入中⋯',

    // ----- manage view -----
    edTeamIdLabel: '報名編號：',
    edGroupLabel: '組別：',
    edStatusLabel: '狀態：',
    edStatusDefault: '正取',
    edPayLabelInline: '　付款：',
    edPayDefault: '待確認',
    edGoPayBtn: '前往付款 →',
    edEditRegBtn: '修改報名資料',
    edRefundBtn: '申請退費',
    edBindHint: '綁定社群帳號，下次免輸入報名編號／密碼即可查詢報名：',
    edBindG: '綁定 Google',
    edBindL: '綁定 LINE',
    edBoundPrefix: '✓ 已綁定 ',
    edBindGoogleIng: 'Google 授權中⋯',
    edBindGoogleOkPrefix: '✓ 已綁定 Google（',
    edBindGoogleOkSuffix: '），日後可用 Google 登入查詢全部報名',
    edBindFail: '綁定失敗',
    edBindGoogleFail: 'Google 綁定失敗',

    // ----- refund -----
    edRefundQuerying: '查詢可退金額中⋯',
    edRefundQueryFail: '查詢失敗',
    edRefundProcessing: '您已有退費申請處理中，請耐心等候主辦方。',
    edRefundWhyPast: '活動已開始或結束，線上退費已關閉',
    edRefundWhyNoDate: '本活動未設定活動日期',
    edRefundWhyNoPolicy: '主辦方尚未設定退費政策',
    edRefundWhySuffix: '，請直接聯繫主辦方辦理退費。',
    edRefundDistPrefix: '距活動 ',
    edRefundDays: ' 天',
    edRefundCanGet: '，可退 ',
    edRefundEquals: '% ＝ ',
    edRefundAcctPh: '退款帳戶（銀行/分行/帳號/戶名）',
    edRefundReasonPh: '退費原因（可選）',
    edRefundSendBtn: '送出退費申請',
    edRefundNeedAcct: '請填寫退款帳戶',
    edRefundSending: '送出中⋯',
    edRefundDonePrefix: '✓ 退費申請已送出（應退 ',
    edRefundDoneMid: '% ＝ NT$',
    edRefundDoneSuffix: '），待主辦方審核退款。',
    edRefundSendFail: '送出失敗'
  };

  var E = {
    // ----- page title -----
    edPageTitle: 'Event Details · RegMaster',

    // ----- nav / crumbs -----
    edCrumbExplore: 'Explore',
    edCrumbLoading: 'Loading…',
    edNavMy: 'My Registrations',
    edNavLogin: 'Organizer Login',

    // ----- loading / error states -----
    edLoading: 'Loading event…',
    edErrTitle: 'Unable to load event',
    edErrMsg: 'This event could not be found, or it has been taken down.',
    edErrBack: 'Back to events',
    edErrNoId: 'No event ID specified in the URL.',
    edErrNetwork: 'Network error',

    // ----- hero -----
    edHostLabel: 'Organizer',
    edFactDate: 'Date',
    edFactCategory: 'Category',
    edFactCapacity: 'Capacity',
    edFactDeadline: 'Deadline',
    edCtaTitle: 'Get ready to register',
    edCtaSub: 'Starting soon…',
    edProgressLabel: 'Registered',
    edCdDays: 'DAYS', edCdHours: 'HOURS', edCdMins: 'MINS', edCdSecs: 'SECS',
    edRegisterBtn: 'Register now →',
    edLookupBtn: 'Look up registration',

    // ----- tabs -----
    edTabAbout: 'About',
    edTabAnn: 'Announcements',
    edTabPoster: 'Poster',
    edTabRules: 'Rules',

    // ----- sections -----
    edAboutH2: 'About this event',
    edAnnH2Prefix: 'Announcements',
    edAnnCountZero: '0',
    edAnnEmpty: 'No announcements yet.',
    edPosterH2: 'Event poster',
    edPosterEmpty: 'The organizer has not uploaded a poster yet.',
    edRulesH2: 'Rules & regulations',
    edRulesEmpty: 'The organizer has not uploaded a rules document yet.',

    // ----- side cards -----
    edShareH4: 'Share event',
    edShareCopy: '📋 Copy link',
    edShareMobileBtn: '📤 Share event',
    edSharePrefillTemplate: '{title} | {date} | Sign up → {url}',
    edPdfH4: 'Download rules',
    edPdfTitle: 'Event rules PDF',
    edPdfHint: 'Click to open',
    edAiH4: '💬 AI Event Assistant',
    edAiP: 'Ask the AI anything about this event — dates, divisions, fees, rules and more.',
    edAiOpenBtn: 'Open AI chat',
    edHelpH4: 'Need help',
    edHelpP: 'For questions about the event, please contact the organizer directly. For other platform issues, please <a href="/contact.html?topic=support" style="color:var(--acc);font-weight:500">contact support</a>.',

    // ----- AI chat panel -----
    edAiPanelAria: 'Event AI chat',
    edAiPanelTitle: 'AI Event Assistant',
    edAiPanelSub: 'Answers questions about this event only',
    edAiPanelClose: 'Close',
    edAiGreeting: 'Hi! I\'m the AI assistant. Feel free to ask me about this event\'s dates, divisions, fees or rules. Just type your question.',
    edAiInputPlaceholder: 'Type your question… (press Enter to send)',
    edAiSendBtn: 'Send',
    edAiCooldown: 'Please wait a moment before asking again…',
    edAiThinking: '⏳ AI is thinking…',
    edAiFailAnswer: 'The AI can\'t answer right now. Please try again later.',
    edAiFailConnect: 'The AI can\'t connect right now. Please try again later.',

    // ----- dynamic: tags / facts -----
    edTagOpen: '🎟 Open',
    edTagClosed: 'Closed',
    edTagNotOpen: 'Not open',
    edCtaManualNote: 'Acceptance is reviewed by the organizer after sign-up; you will be notified by email',
    edCtaNotOpenTitle: 'Registration not open yet',
    edCtaNotOpenSub: 'The organiser has not opened registration yet. Please check back later.',
    edRegisteredNotOpen: 'Not open yet',
    edTagSoon: '🔜 Opening soon',
    edTagDaysLeft: '⚡ {n} days left',
    edUntitled: '(Untitled event)',
    edHostFallback: 'Event organizer',
    edHostMetaPrefix: 'Event ID ',
    edSessionFallback: 'Session',
    edDateTBA: 'Date to be announced',
    edDateTBASmall: 'To be announced',
    edCategoryDefault: 'General event',
    edRegisteredSuffix: ' registered',
    edCapacityFull: '% full',
    edNoCapacityLimit: 'No capacity limit',
    edDeadlineTBA: 'To be announced',
    edPosterAlt: 'Event poster',
    edPosterLoadFail: 'Failed to load poster',

    // ----- dynamic: CTA -----
    edCtaOpen: 'Open for registration',
    edCtaDeadlinePrefix: 'Closes: ',
    edCtaAnytime: 'Register anytime',
    edCtaClosedTitle: 'Registration closed',
    edCtaSoonTitle: 'Opening soon',
    edCtaSoonSub: 'Opens at: ',
    edCtaClosedSub: 'If you have questions, please contact the organizer',
    edRegisteredNow: 'Register now →',
    edRegisteredClosed: 'Registration closed',
    edRegisteredSoon: 'Opening soon',

    // ----- dynamic: description / rules -----
    edDescEmpty: 'The organizer has not added a detailed description yet.',
    edAnnSuffix: '',
    edRulesHasPdf: 'This event has an official rules PDF. Please download it on the right to read.',
    edRulesDownloadBtn: 'Download rules PDF →',

    // ----- dynamic: share -----
    edCopied: '✓ Copied',

    // ----- dynamic: LINE bound toast -----
    edLineBound: '✓ LINE account linked',

    // ----- modal: lookup / manage -----
    edModalTitle: 'Look up / manage my registration',
    edModalIntro: 'Log in with the <b>registration ID</b> and <b>password</b> you received after registering.',
    edModalTeamPh: 'Registration ID (e.g. {id}-T...)',
    edModalPwdPh: 'Password',
    edModalLoginBtn: 'Login',
    edModalForgot: 'Forgot password?',
    edModalSocialDivider: 'Or use a linked social account',
    edModalLoginG: 'Sign in with Google',
    edModalLoginL: 'Sign in with LINE',
    edModalSocialHint: 'Social login lists all registrations under your name (those linked here before), so you can edit or request a refund directly.',

    // ----- modal: forgot password -----
    edForgotIntro: 'Enter your <b>registration ID</b> and we\'ll send a password reset link to the email used at registration. Click the link to set a new password yourself (the link is valid for 60 minutes).',
    edForgotTeamPh: 'Registration ID (e.g. {id}-T...)',
    edForgotSendBtn: 'Send password reset link',
    edForgotNeedId: 'Please enter your registration ID',
    edForgotSending: 'Sending…',
    edForgotSent: 'If this registration ID exists, a reset link has been sent. Please check your inbox.',
    edForgotSendFail: 'Failed to send',

    // ----- modal: login errors / status -----
    edLoginGoogleNotLoaded: 'Google component not loaded — please refresh',
    edLoginGoogleIng: 'Signing in with Google…',
    edLoginGoogleNoBind: 'This Google account is not linked to any registration. Please first log in with your registration ID + password and link it.',
    edLoginFail: 'Login failed',
    edLoginGoogleFail: 'Google login failed',
    edLoginNeedBoth: 'Please enter your registration ID and password',
    edLoginIng: 'Logging in…',

    // ----- manage view -----
    edTeamIdLabel: 'Registration ID: ',
    edGroupLabel: 'Division: ',
    edStatusLabel: 'Status: ',
    edStatusDefault: 'Accepted',
    edPayLabelInline: '　Payment: ',
    edPayDefault: 'Pending',
    edGoPayBtn: 'Go to payment →',
    edEditRegBtn: 'Edit registration',
    edRefundBtn: 'Request refund',
    edBindHint: 'Link a social account so next time you can look up your registration without entering your ID / password:',
    edBindG: 'Link Google',
    edBindL: 'Link LINE',
    edBoundPrefix: '✓ Linked ',
    edBindGoogleIng: 'Authorizing with Google…',
    edBindGoogleOkPrefix: '✓ Linked Google (',
    edBindGoogleOkSuffix: '). You can now use Google login to look up all your registrations',
    edBindFail: 'Failed to link',
    edBindGoogleFail: 'Failed to link Google',

    // ----- refund -----
    edRefundQuerying: 'Checking refundable amount…',
    edRefundQueryFail: 'Query failed',
    edRefundProcessing: 'You already have a refund request being processed. Please wait for the organizer.',
    edRefundWhyPast: 'The event has started or ended, so online refunds are closed',
    edRefundWhyNoDate: 'This event has no event date set',
    edRefundWhyNoPolicy: 'The organizer has not set a refund policy yet',
    edRefundWhySuffix: '. Please contact the organizer directly to arrange a refund.',
    edRefundDistPrefix: 'Event in ',
    edRefundDays: ' days',
    edRefundCanGet: ', refundable ',
    edRefundEquals: '% = ',
    edRefundAcctPh: 'Refund account (bank / branch / account no. / account name)',
    edRefundReasonPh: 'Reason for refund (optional)',
    edRefundSendBtn: 'Submit refund request',
    edRefundNeedAcct: 'Please fill in the refund account',
    edRefundSending: 'Submitting…',
    edRefundDonePrefix: '✓ Refund request submitted (refundable ',
    edRefundDoneMid: '% = NT$',
    edRefundDoneSuffix: '), pending the organizer\'s review and refund.',
    edRefundSendFail: 'Failed to submit'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
