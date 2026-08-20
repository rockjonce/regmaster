// =============================================================================
// RegMaster · I18N keys for /events/register.html (rg* namespace)
// =============================================================================
// Page-scoped translations for the multi-step registration form. Merged into the
// shared window.I18N dictionary (built by /shared/i18n.js). Reuses shared nav/footer
// keys (brandName, navExplore, …, ft*) — those are NOT redefined here.
//
// Keys cover: static wizard chrome (step titles/labels, field labels, buttons,
// option lists, consent/policy text) AND dynamic strings built in JS (validation
// errors, dynamically-injected member-card field labels, payment cards, review
// rows, success page, alerts). zh values are EXACT copies of the original page;
// en values are fluent translations.
//
// Organiser-defined content (custom-question text, group/session names, fee item
// labels, bank info, etc.) is user-generated data and is intentionally left
// untranslated.
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- page chrome / crumbs -----
    rgPageTitle: '報名 · RegMaster',
    rgSecure: 'SSL 安全傳輸',
    rgCrumbEvents: '探索活動',
    rgCrumbDetail: '活動詳情',
    rgCrumbHere: '報名',
    rgLoading: '載入活動資料⋯⋯',
    rgErrTitle: '無法開始報名',
    rgBackToList: '回到活動列表',

    // ----- step indicator labels -----
    rgStep1Label: '組別 / 場次',
    rgPagedStepPre: '步驟 ',
    rgPreviewBanner: '預覽模式──呈現未儲存的草稿、不會建立任何報名；實際樣式以儲存後為準', rgPreviewExit: '離開預覽', rgPreviewEndBtn: '結束預覽 →', rgPreviewNoUpload: '預覽模式不會實際上傳檔案',
    rgStep2Label: '報名者資料',
    rgStep3Label: '附加問題',
    rgStep4Label: '確認送出',

    // ----- step 1 -----
    rgStep1Eyebrow: '步驟 01',
    rgStep1Title: '選擇你的組別與場次',
    rgStep1Sub: '先告訴我們你打算如何參賽。',
    rgSecGroup: '組別',
    rgSecSession: '場次',
    rgSecTeamName: '隊伍名稱',
    rgTeamNameCN: '隊伍中文名稱',
    rgTeamNameCNErr: '請輸入隊伍名稱',
    rgTeamNameEN: '隊伍英文名稱',

    // ----- step 2 -----
    rgStep2Eyebrow: '步驟 02',
    rgStep2Title: '填寫成員資料',
    rgStep2Sub: '每位成員都需要提供基本資料。可以稍後再修改。',
    rgSecStudent: '報名者',
    // ----- e-invoice block (Phase 3, Q11-A) -----
    rgInvTitle: '發票開立資訊（開給付款人）', rgInvPersonal: '個人', rgInvCompany: '公司（打統編）',
    rgInvCloud: '雲端發票（開立通知寄至 Email）', rgInvMobile: '手機條碼載具', rgInvDonate: '捐贈發票',
    rgInvCarrierPh: '/ABC+123', rgInvNpobanPh: '捐贈碼（3-7 碼數字）',
    rgInvTaxIdPh: '統一編號（8 碼）', rgInvTitlePh: '發票抬頭',
    rgInvCarrierBad: '查無此手機條碼，請確認（仍可送出，開立時以財政部驗證為準）',
    rgInvValTaxId: '統一編號格式或檢查碼錯誤，請確認 8 碼數字',
    rgInvValTitle: '請填寫發票抬頭',
    rgInvValCarrier: '手機條碼載具格式錯誤（斜線開頭共 8 碼，例：/ABC+123）',
    rgInvValNpoban: '捐贈碼格式錯誤（3-7 碼數字）',
    rgReviewInvoice: '發票開立資訊', rgReviewInvType: '發票類型', rgReviewInvCarrier: '載具／開立方式',
    rgSecTeacher: '指導者',

    // ----- step 3 -----
    rgStep3Eyebrow: '步驟 03',
    rgStep3Title: '附加問題',
    rgStep3Sub: '主辦方有些額外問題想了解。',
    rgNoCustomQs: '本活動沒有附加問題，可直接進入下一步。',

    // ----- step 4 -----
    rgStep4Eyebrow: '步驟 04',
    rgStep4Title: '確認資料並送出',
    rgStep4Sub: '送出後將無法修改主要欄位，請仔細檢查。',
    rgPaySelect: '選擇付款方式',
    rgPayBank: '轉出銀行',
    rgPayBankPlaceholder: '請選擇銀行',
    rgPayBankErr: '請選擇銀行',
    rgPayAcctTail: '轉出帳號後 5 碼',
    rgPayAcctTailPh: '供主辦方對帳用',
    rgPayAcctTailErr: '請輸入 5 碼數字',
    rgAtmNote: '送出報名後，您會在「我的報名」看到匯款資訊。請於 3 個工作天內完成轉帳，主辦方將自動對帳。',
    rgConsentTitle: '送出即代表同意',
    rgConsentBody: '1. 我已詳閱本活動的規章與規則。<br>\n          2. 我同意主辦方依個資法處理我所填寫的資料。<br>\n          3. 我了解報名成功後將收到含登入密碼的確認信，請妥善保管。',

    // ----- foot bar / buttons -----
    rgFootStep: '步驟',
    rgPrevBtn: '← 上一步',
    rgNextBtn: '繼續 →',
    rgSubmitBtn: '送出報名 →',

    // ----- success page -----
    rgSuccessTitle: '報名成功！',
    rgSuccessSub: '請妥善保管下方的報名編號與密碼。<br>確認信也已寄到您的信箱。',
    rgResTeamId: '報名編號',
    rgResPwd: '登入密碼',
    rgResStatus: '報名狀態',
    rgCopy: '複製',
    rgAtmInfoTitle: '💰 銀行轉帳資訊',
    rgAtmBank: '銀行：',
    rgAtmBranch: '分行：',
    rgAtmAcc: '帳號：',
    rgAtmOwner: '戶名：',
    rgAtmInfoNote: '請於 3 個工作天內完成轉帳，主辦方將自動對帳。',
    rgViewMy: '查看我的報名 →',
    rgBackEvent: '返回活動頁',
    rgExploreMore: '探索更多活動',
    rgQrTitle: '📲 報到 QR（請截圖保存）',
    rgQrHint: '活動當天出示此 QR 即可報到',
    rgCalTitle: '📅 加入行事曆',
    rgCalIcs: 'Apple／Outlook (.ics)',
    rgCalDetails: '活動報名連結：',
    rgShareBtn: '🔗 分享我報名了',
    rgInviteBtn: '👥 邀請朋友揪團',
    rgShareCopy: '複製連結',
    rgShareText: '我報名了「{n}」！',
    rgInviteText: '一起來參加「{n}」！',
    rgEventFallback: '這個活動',

    // ----- right summary -----
    rgDeadlinePrefix: '截止：',
    rgSumTitle: '報名摘要',
    rgSumBaseFee: '基本報名費',
    rgSumFree: '免費',
    rgSumTotal: '合計',
    rgSumPayMethodsTitle: '付款方式',
    rgSumPayMethodsDefault: '主辦方公告為準',
    rgSumRefundTitle: '取消與退費',
    rgSumRefundBody: '請洽詢主辦方。若活動取消，主辦方應依公告政策退費。',

    // ----- dynamic: error / no-id messages -----
    rgErrNoCompId: '網址未指定活動編號。',
    rgErrNotFound: '找不到活動',
    rgErrNotOpen: '此活動目前未開放報名。',
    rgErrNotYetOpen: '此活動報名尚未開始，開放時間：',
    rgErrDeadlinePassed: '此活動報名已截止。',
    rgErrNetwork: '網路錯誤',

    // ----- dynamic: edit-mode gate -----
    rgEditGateTitle: '修改報名資料',
    rgEditGateIdPrefix: '報名編號：',
    rgEditGatePwdHint: '請輸入密碼以載入您的報名資料。',
    rgEditGatePwdPh: '密碼',
    rgEditGateLoad: '載入',
    rgEditGateCancel: '取消',
    rgEditGateNoPwd: '請輸入密碼',
    rgEditGateLoading: '載入中⋯',
    rgEditGateWrongPwd: '密碼錯誤',
    rgEditGateLoadFail: '載入失敗',
    rgEditTitle: '修改報名資料',
    rgEditTitleDoc: '修改報名',
    rgEditSuccessTitle: '報名資料已更新',
    rgEditSuccessBody: '您的修改已儲存。',
    rgEditBackToEvent: '回活動頁',
    rgEditSaveBtn: '儲存修改 →',

    // ----- dynamic: submit-button labels -----
    rgBtnPayuni: '前往 PayUNI 付款 →',
    rgBtnAtm: '送出報名（稍後轉帳）→',
    rgBtnChooseMethod: '請先選擇付款方式',
    rgBtnSubmitting: '送出中⋯⋯',
    rgBtnCreatingPayuni: '建立 PayUNI 訂單中⋯⋯',

    // ----- dynamic: step 4 (with payment) -----
    rgStep4TitlePay: '確認資料並繳交報名費',
    rgStep4SubPay: '檢查資料後選擇付款方式，PayUNI 將跳轉至安全付款頁。',
    rgSessionMulti: '(可複選)',
    rgSessionSingle: '(單選)',

    // ----- dynamic: payment method cards -----
    rgPayuniName: '線上付款（PayUNI）',
    rgPayuniDesc: '信用卡（一次付清），立即完成付款',
    rgAtmName: '銀行轉帳 / ATM',
    rgAtmDescFallback: '主辦方銀行帳戶',
    rgAtmCardAcc: '帳號',

    // ----- dynamic: session / member counts & titles -----
    rgSessionRegistered: ' 已報名',
    rgSessionFullWl: '已滿，報名將列候補',
    rgSessionFull: '已額滿',
    rgCountUnit: ' 位',          // used as: 共 N 位
    rgCountPrefix: '共 ',
    rgStudentN: '報名者',          // used as: 報名者 N
    rgTeacherN: '指導者',        // used as: 指導者 N

    // ----- dynamic: field inputs -----
    rgSelectPlaceholder: '請選擇',
    rgUrlPlaceholder: '例：https://example.com',
    rgPhonePlaceholder: '例：912345678',
    rgFieldRequired: '請填寫此欄位',

    // ----- dynamic: file upload statuses -----
    rgFileTooLarge1: '檔案過大（上限 ',
    rgFileTooLarge2: 'MB）',
    rgFileBadType: '不允許的檔案類型，僅接受：',
    rgFileUploading: '上傳中⋯',
    rgFileUploaded: '✓ 已上傳：',
    rgFileUploadFail: '上傳失敗',
    rgFileUploadFailPrefix: '上傳失敗：',

    // ----- dynamic: review rows -----
    rgReviewEvent: '活動',
    rgReviewGroup: '組別',
    rgReviewSession: '場次',
    rgReviewTeamName: '隊伍名稱',
    rgReviewBasic: '基本資訊',
    rgReviewCustomQs: '附加問題',
    rgReviewFee: '報名費用',
    rgConsentNotice: '點擊「送出報名」即表示你已閱讀並同意本活動之 <a href="/terms.html" target="_blank">服務條款</a> 與隱私權政策；系統將記錄你的同意時間與來源 IP 作為憑證。',
    rgFeeItemFallback: '收費項目',

    // ----- dynamic: validation messages -----
    rgValPickGroup: '請選擇組別',
    rgValPickSession: '請選擇場次',
    rgValTeamNameCN: '請輸入隊伍中文名稱',
    rgValTeamNameCNChar: '中文隊名僅限中文字（數字、空格、標點可，但不可含英文字母）',
    rgValTeamNameENChar: '英文隊名僅限英文字母（數字、空格、標點可，但不可含中文字）',
    rgValRequiredA: ' 的「',           // who + 的「 + label + 」為必填
    rgValRequiredB: '」為必填',
    rgValEmail: ' 的 Email 格式錯誤',  // who + …
    rgValIdNumA: ' 的「',
    rgValIdNumB: '」身分證號碼格式不正確',
    rgValUrlA: ' 的「',
    rgValUrlB: '」請輸入有效的網址（例：https://example.com）',
    rgValSpecialA: ' 的「',
    rgValSpecialB: '」',
    rgValCustomReqA: '「',
    rgValCustomReqB: '」為必答',
    rgValPickPayMethod: '請選擇付款方式',
    rgValPickPayBank: '請選擇轉出銀行',
    rgValPayAcctTail: '請輸入轉出帳號後 5 碼數字',

    // ----- dynamic: validateSpecial messages (def.label + suffix) -----
    rgSpPhone: ' 格式不正確（應為 0 開頭的 9–10 碼台灣電話/行動電話）',
    rgSpMobile: ' 格式不正確（請輸入國碼後的純數字號碼，至少 6 碼）',
    rgSpTaxId: ' 不正確（應為 8 碼統一編號且通過 checksum）',
    rgSpPostal: ' 不正確（應為 3 碼或 5 碼數字）',
    rgSpDateFmt: ' 日期格式不正確',
    rgSpNoFuture: ' 不可為未來日期',
    rgSpMustFuture: ' 必須晚於今日',
    rgSpPassport: ' 格式不正確（應為 6–9 碼英數字）',

    // ----- dynamic: ID/gender cross-check -----
    rgValGenderA: ' 的身分證性別碼為「',
    rgValGenderB: '」，但性別欄選擇「',
    rgValGenderC: '」，請確認。',

    // ----- dynamic: age-rule validation -----
    rgValBirthdayFmt: ' 的出生年月日格式不正確',   // 學員 N + …
    rgValAgeMinA: ' 不符組別「',
    rgValAgeMinB: '」的年齡限制（最小 ',
    rgValAgeMinC: ' 歲，目前 ',
    rgValAgeMinD: ' 歲）',
    rgValAgeMaxA: ' 不符組別「',
    rgValAgeMaxB: '」的年齡限制（最大 ',
    rgValAgeMaxC: ' 歲，目前 ',
    rgValAgeMaxD: ' 歲）',
    rgValBirthFromA: ' 的出生日期早於組別「',
    rgValBirthFromB: '」允許的最早日期（',
    rgValBirthFromC: '）',
    rgValBirthToA: ' 的出生日期晚於組別「',
    rgValBirthToB: '」允許的最晚日期（',
    rgValBirthToC: '）',

    // ----- dynamic: submit results & alerts -----
    rgEditFail: '修改失敗',
    rgPayuniContactOrg: '請聯絡主辦方',
    rgPayuniAlertA: '報名已建立但無法產生 PayUNI 訂單：',
    rgPayuniAlertB: '\n\n您的報名編號：',
    rgPayuniAlertC: '（請保留），可至「我的報名」查詢狀態。',
    rgPayuniRetry: '請稍後再試',
    rgPayuniErrA: 'PayUNI 訂單建立失敗：',
    rgPayuniErrB: '。報名編號：',
    rgPayuniConnAlertA: '報名已建立但 PayUNI 連線失敗：',
    rgPayuniConnAlertB: '（請保留）。',
    rgPayuniConnErrA: 'PayUNI 連線失敗：',
    rgSubmitFail: '送出失敗',
    rgCopied: '✓ 已複製',
    rgStatusAccepted: '正取',

    // ----- dynamic: misc fallbacks -----
    rgGroupNFallback: '組別',     // used as: 組別 N
    rgSessionNFallback: '場次'    // used as: 場次 N
  };

  var E = {
    // ----- page chrome / crumbs -----
    rgPageTitle: 'Register · RegMaster',
    rgSecure: 'Secure SSL transfer',
    rgCrumbEvents: 'Explore Events',
    rgCrumbDetail: 'Event Details',
    rgCrumbHere: 'Register',
    rgLoading: 'Loading event…',
    rgErrTitle: 'Unable to start registration',
    rgBackToList: 'Back to event list',

    rgStep1Label: 'Group / Session',
    rgPagedStepPre: 'STEP ',
    rgPreviewBanner: 'Preview mode — showing the unsaved draft; no registration will be created. Final look may differ after saving', rgPreviewExit: 'Exit preview', rgPreviewEndBtn: 'End preview →', rgPreviewNoUpload: 'Files are not actually uploaded in preview mode',
    rgStep2Label: 'Participant Info',
    rgStep3Label: 'Additional Questions',
    rgStep4Label: 'Confirm & Submit',

    rgStep1Eyebrow: 'STEP 01',
    rgStep1Title: 'Choose your group and session',
    rgStep1Sub: 'First, tell us how you plan to take part.',
    rgSecGroup: 'Group',
    rgSecSession: 'Session',
    rgSecTeamName: 'Team Name',
    rgTeamNameCN: 'Team name (Chinese)',
    rgTeamNameCNErr: 'Please enter a team name',
    rgTeamNameEN: 'Team name (English)',

    rgStep2Eyebrow: 'STEP 02',
    rgStep2Title: 'Fill in member details',
    rgStep2Sub: 'Each member needs to provide basic information. You can edit it later.',
    rgSecStudent: 'Participants',
    // ----- e-invoice block -----
    rgInvTitle: 'Invoice info (issued to the payer)', rgInvPersonal: 'Personal', rgInvCompany: 'Company (with tax ID)',
    rgInvCloud: 'Cloud invoice (notice sent to your email)', rgInvMobile: 'Mobile barcode carrier', rgInvDonate: 'Donate',
    rgInvCarrierPh: '/ABC+123', rgInvNpobanPh: 'Donation code (3–7 digits)',
    rgInvTaxIdPh: 'Tax ID (8 digits)', rgInvTitlePh: 'Invoice title',
    rgInvCarrierBad: 'Barcode not found — please double-check (you may still submit; issuance validates against the MOF)',
    rgInvValTaxId: 'Invalid tax ID format or checksum — 8 digits required',
    rgInvValTitle: 'Please enter the invoice title',
    rgInvValCarrier: 'Invalid mobile barcode (8 chars starting with "/", e.g. /ABC+123)',
    rgInvValNpoban: 'Invalid donation code (3–7 digits)',
    rgReviewInvoice: 'Invoice details', rgReviewInvType: 'Invoice type', rgReviewInvCarrier: 'Carrier / method',
    rgSecTeacher: 'Instructors',

    rgStep3Eyebrow: 'STEP 03',
    rgStep3Title: 'Additional questions',
    rgStep3Sub: 'The organizer has a few extra questions.',
    rgNoCustomQs: 'This event has no additional questions — you can continue to the next step.',

    rgStep4Eyebrow: 'STEP 04',
    rgStep4Title: 'Review and submit',
    rgStep4Sub: 'Key fields cannot be changed after submission, so please review carefully.',
    rgPaySelect: 'Choose a payment method',
    rgPayBank: 'Originating bank',
    rgPayBankPlaceholder: 'Select a bank',
    rgPayBankErr: 'Please select a bank',
    rgPayAcctTail: 'Last 5 digits of account',
    rgPayAcctTailPh: 'For the organizer to reconcile',
    rgPayAcctTailErr: 'Please enter 5 digits',
    rgAtmNote: 'After you submit, you will see the transfer details under "My Registrations". Please complete the transfer within 3 business days; the organizer will reconcile automatically.',
    rgConsentTitle: 'By submitting you agree that',
    rgConsentBody: '1. I have read this event\'s rules and regulations.<br>\n          2. I agree the organizer may process the information I provide in accordance with the Personal Data Protection Act.<br>\n          3. I understand that upon successful registration I will receive a confirmation email containing my login password, which I will keep safe.',

    rgFootStep: 'Step',
    rgPrevBtn: '← Previous',
    rgNextBtn: 'Continue →',
    rgSubmitBtn: 'Submit registration →',

    rgSuccessTitle: 'Registration complete!',
    rgSuccessSub: 'Please keep the registration ID and password below safe.<br>A confirmation email has also been sent to your inbox.',
    rgResTeamId: 'Registration ID',
    rgResPwd: 'Login password',
    rgResStatus: 'Status',
    rgCopy: 'Copy',
    rgAtmInfoTitle: '💰 Bank transfer details',
    rgAtmBank: 'Bank: ',
    rgAtmBranch: 'Branch: ',
    rgAtmAcc: 'Account: ',
    rgAtmOwner: 'Account name: ',
    rgAtmInfoNote: 'Please complete the transfer within 3 business days; the organizer will reconcile automatically.',
    rgViewMy: 'View my registrations →',
    rgBackEvent: 'Back to event',
    rgExploreMore: 'Explore more events',
    rgQrTitle: '📲 Check-in QR (save a screenshot)',
    rgQrHint: 'Show this QR at the event to check in',
    rgCalTitle: '📅 Add to calendar',
    rgCalIcs: 'Apple/Outlook (.ics)',
    rgCalDetails: 'Event link: ',
    rgShareBtn: '🔗 Share that I registered',
    rgInviteBtn: '👥 Invite friends',
    rgShareCopy: 'Copy link',
    rgShareText: 'I just registered for "{n}"!',
    rgInviteText: 'Join me at "{n}"!',
    rgEventFallback: 'this event',

    rgDeadlinePrefix: 'Deadline: ',
    rgSumTitle: 'Registration summary',
    rgSumBaseFee: 'Base registration fee',
    rgSumFree: 'Free',
    rgSumTotal: 'Total',
    rgSumPayMethodsTitle: 'Payment methods',
    rgSumPayMethodsDefault: 'As announced by the organizer',
    rgSumRefundTitle: 'Cancellation & refunds',
    rgSumRefundBody: 'Please contact the organizer. If the event is cancelled, the organizer will refund according to the announced policy.',

    rgErrNoCompId: 'No event ID specified in the URL.',
    rgErrNotFound: 'Event not found',
    rgErrNotOpen: 'This event is not currently open for registration.',
    rgErrNotYetOpen: 'Registration has not started yet. Opens at: ',
    rgErrDeadlinePassed: 'Registration for this event has closed.',
    rgErrNetwork: 'Network error',

    rgEditGateTitle: 'Edit registration',
    rgEditGateIdPrefix: 'Registration ID: ',
    rgEditGatePwdHint: 'Enter your password to load your registration.',
    rgEditGatePwdPh: 'Password',
    rgEditGateLoad: 'Load',
    rgEditGateCancel: 'Cancel',
    rgEditGateNoPwd: 'Please enter your password',
    rgEditGateLoading: 'Loading…',
    rgEditGateWrongPwd: 'Wrong password',
    rgEditGateLoadFail: 'Failed to load',
    rgEditTitle: 'Edit registration',
    rgEditTitleDoc: 'Edit registration',
    rgEditSuccessTitle: 'Registration updated',
    rgEditSuccessBody: 'Your changes have been saved.',
    rgEditBackToEvent: 'Back to event',
    rgEditSaveBtn: 'Save changes →',

    rgBtnPayuni: 'Pay with PayUNI →',
    rgBtnAtm: 'Submit (pay by transfer later) →',
    rgBtnChooseMethod: 'Please choose a payment method',
    rgBtnSubmitting: 'Submitting…',
    rgBtnCreatingPayuni: 'Creating PayUNI order…',

    rgStep4TitlePay: 'Review and pay the registration fee',
    rgStep4SubPay: 'After reviewing your details, choose a payment method; PayUNI will redirect you to a secure payment page.',
    rgSessionMulti: '(multiple)',
    rgSessionSingle: '(single)',

    rgPayuniName: 'Online payment (PayUNI)',
    rgPayuniDesc: 'Credit card (pay in full), instant payment',
    rgAtmName: 'Bank transfer / ATM',
    rgAtmDescFallback: 'Organizer bank account',
    rgAtmCardAcc: 'Acct',

    rgSessionRegistered: ' registered',
    rgSessionFullWl: 'Full — you will be waitlisted',
    rgSessionFull: 'Full',
    rgCountUnit: ' total',
    rgCountPrefix: '',
    rgStudentN: 'Participant',
    rgTeacherN: 'Instructor',

    rgSelectPlaceholder: 'Select',
    rgUrlPlaceholder: 'e.g. https://example.com',
    rgPhonePlaceholder: 'e.g. 912345678',
    rgFieldRequired: 'Please fill in this field',

    rgFileTooLarge1: 'File too large (max ',
    rgFileTooLarge2: 'MB)',
    rgFileBadType: 'File type not allowed; only: ',
    rgFileUploading: 'Uploading…',
    rgFileUploaded: '✓ Uploaded: ',
    rgFileUploadFail: 'Upload failed',
    rgFileUploadFailPrefix: 'Upload failed: ',

    rgReviewEvent: 'Event',
    rgReviewGroup: 'Group',
    rgReviewSession: 'Session',
    rgReviewTeamName: 'Team name',
    rgReviewBasic: 'Basic information',
    rgReviewCustomQs: 'Additional questions',
    rgReviewFee: 'Registration fee',
    rgConsentNotice: 'By clicking "Submit Registration" you confirm you have read and agree to this event\'s <a href="/terms.html" target="_blank">Terms of Service</a> and Privacy Policy; the system records your acceptance time and source IP as proof.',
    rgFeeItemFallback: 'Fee item',

    rgValPickGroup: 'Please select a group',
    rgValPickSession: 'Please select a session',
    rgValTeamNameCN: 'Please enter the Chinese team name',
    rgValTeamNameCNChar: 'Chinese team name must not contain English letters (digits/spaces/punctuation allowed)',
    rgValTeamNameENChar: 'English team name must not contain Chinese characters (digits/spaces/punctuation allowed)',
    rgValRequiredA: '’s "',
    rgValRequiredB: '" is required',
    rgValEmail: '’s email format is invalid',
    rgValIdNumA: '’s "',
    rgValIdNumB: '" ID number format is invalid',
    rgValUrlA: '’s "',
    rgValUrlB: '" must be a valid URL (e.g. https://example.com)',
    rgValSpecialA: '’s "',
    rgValSpecialB: '"',
    rgValCustomReqA: '"',
    rgValCustomReqB: '" is required',
    rgValPickPayMethod: 'Please choose a payment method',
    rgValPickPayBank: 'Please select the originating bank',
    rgValPayAcctTail: 'Please enter the last 5 digits of the account',

    rgSpPhone: ' format is invalid (must be a 9–10 digit Taiwan phone/mobile starting with 0)',
    rgSpMobile: ' format is invalid (enter the digits after the country code, at least 6 digits)',
    rgSpTaxId: ' is invalid (must be an 8-digit business number passing the checksum)',
    rgSpPostal: ' is invalid (must be 3 or 5 digits)',
    rgSpDateFmt: ' has an invalid date format',
    rgSpNoFuture: ' cannot be a future date',
    rgSpMustFuture: ' must be later than today',
    rgSpPassport: ' format is invalid (must be 6–9 alphanumeric characters)',

    rgValGenderA: '’s ID gender code is "',
    rgValGenderB: '", but the gender field is set to "',
    rgValGenderC: '". Please check.',

    rgValBirthdayFmt: '’s date of birth format is invalid',
    rgValAgeMinA: ' does not meet the age limit for group "',
    rgValAgeMinB: '" (minimum ',
    rgValAgeMinC: ', currently ',
    rgValAgeMinD: ')',
    rgValAgeMaxA: ' does not meet the age limit for group "',
    rgValAgeMaxB: '" (maximum ',
    rgValAgeMaxC: ', currently ',
    rgValAgeMaxD: ')',
    rgValBirthFromA: '’s birth date is earlier than the earliest allowed for group "',
    rgValBirthFromB: '" (',
    rgValBirthFromC: ')',
    rgValBirthToA: '’s birth date is later than the latest allowed for group "',
    rgValBirthToB: '" (',
    rgValBirthToC: ')',

    rgEditFail: 'Update failed',
    rgPayuniContactOrg: 'Please contact the organizer',
    rgPayuniAlertA: 'Your registration was created but the PayUNI order could not be generated: ',
    rgPayuniAlertB: '\n\nYour registration ID: ',
    rgPayuniAlertC: ' (please keep it). You can check the status under "My Registrations".',
    rgPayuniRetry: 'Please try again later',
    rgPayuniErrA: 'Failed to create PayUNI order: ',
    rgPayuniErrB: '. Registration ID: ',
    rgPayuniConnAlertA: 'Your registration was created but the PayUNI connection failed: ',
    rgPayuniConnAlertB: ' (please keep it).',
    rgPayuniConnErrA: 'PayUNI connection failed: ',
    rgSubmitFail: 'Submission failed',
    rgCopied: '✓ Copied',
    rgStatusAccepted: 'Accepted',

    rgGroupNFallback: 'Group',
    rgSessionNFallback: 'Session'
  };

  Object.assign(Z, {
    rgSpEnglishLettersOnly: ' 僅能輸入英文字母（比照護照）',
    rgSpEnglishUppercase: ' 請改用大寫字母（比照護照填寫）',
  });
  Object.assign(E, {
    rgSpEnglishLettersOnly: ' must contain English letters only (passport style)',
    rgSpEnglishUppercase: ' please use UPPERCASE letters (passport style)',
  });

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
