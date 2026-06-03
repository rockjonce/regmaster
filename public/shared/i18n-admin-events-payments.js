// =============================================================================
// RegMaster · I18N page pack — Admin / Event Billing (admin/events/payments.html)
// =============================================================================
// Page-scoped zh/en strings for the organiser billing console:
//   Tab 1 報名費 (registration-fee collection + bank reconciliation)
//   Tab 2 平台代收轉付 (PayUNI platform settlement / payouts)
// Loaded immediately after /shared/i18n.js. All new keys are prefixed `aePay`.
// Data values (amounts, account numbers, IDs, status comparison values like
// 待確認/已確認, registrant/team names) are NOT translated — only UI chrome.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / header -----
    aePayDocTitle: '帳務 · 主辦後台 · RegMaster',
    aePayCrumbHome: '主辦後台',
    aePayCrumbEvents: '活動',
    aePayCrumbHere: '帳務',
    aePayExportTitle: '匯出',

    // ----- nav (sidebar, this event) -----
    aePayNavOverview: '總覽',
    aePayNavSettings: '設定',
    aePayNavAnnouncements: '公告',
    aePayNavBilling: '帳務',
    aePayNavScoring: '評分',
    aePayNavCheckin: '報到',
    aePayNavGrpOverview: '概覽',
    aePayNavGrpThisEvent: '本活動',
    aePayNavDashboard: '儀表板',
    aePayNavAllEvents: '所有活動',
    aePayBrandSub: '主辦後台',
    aePayOrgRole: '主辦方',

    // ----- loading / states -----
    aePayLoading: '載入付款資料⋯',
    aePayPayoutLoading: '載入代收轉付資料⋯',

    // ----- tabs -----
    aePayTabFees: '報名費',
    aePayTabPayout: '平台代收轉付',

    // ----- reconcile bar (enabled) -----
    aePayReconcileTitle: '快速銀行對帳',
    aePayReconcileDesc: '輸入銀行帳號末 5 碼，系統會自動標記匹配的隊伍為「已確認」（PayUni 線上付款會自動對帳，無需手動）',
    aePayReconcilePh: '例：18923',
    aePayReconcileBtn: '執行對帳',

    // ----- reconcile bar (disabled note) -----
    aePayReconcileOffTitle: '快速銀行對帳未啟用',
    aePayReconcileOffDesc: '請至「設定 → 收費 → 銀行 / ATM 轉帳」開啟「啟用銀行轉帳收款與對帳」並填寫銀行帳號後，此功能才會開放。',

    // ----- fees table headers -----
    aePayThId: '編號',
    aePayThTeam: '隊名',
    aePayThStatus: '狀態',
    aePayThPayStatus: '付款狀態',
    aePayThMethod: '付款方式',
    aePayThAmount: '金額',
    aePayThActions: '動作',

    // ----- summary cards (報名費) -----
    aePaySumTotalDue: '應收總額',
    aePaySumReceived: '已收',
    aePaySumPending: '待收',
    aePaySumRate: '收款率',
    aePaySumTotalSubPre: ' 筆 × NT$ ',
    aePaySumReceivedSub: ' 筆已確認',
    aePaySumPendingSub: ' 筆待付款',
    aePaySumRateSub: '已付款 / 總報名',

    // ----- fees table dynamic -----
    aePayEmptyRows: '尚無報名資料',
    aePayNoName: '(無)',
    aePayPillDefault: '待確認',
    aePayBtnConfirm: '確認付款',
    aePayBtnView: '查看',
    aePayBtnDelete: '刪除',

    // ----- confirm-payment dialog -----
    aePayConfirmMsg: '確認此筆付款？',
    aePayConfirmTitle: '確認付款',
    aePayConfirmFailPre: '失敗：',

    // ----- team-detail modal -----
    aePayModalClose: '關閉',
    aePayModalDetailPre: '報名詳情 · ',
    aePayModalLoading: '載入中⋯',
    aePayModalNotFound: '查無此筆報名',
    aePayModalLoadFailPre: '載入失敗：',
    aePayGroupTeamInfo: '隊伍資訊',
    aePayGroupStudent: '學員 ',
    aePayGroupTeacher: '指導者 ',
    aePayKvId: '編號',
    aePayKvTeamCN: '中文隊名',
    aePayKvTeamEN: '英文隊名',
    aePayKvGroup: '組別',
    aePayKvStatus: '狀態',
    aePayKvPayStatus: '付款狀態',
    aePayKvMethod: '付款方式',
    aePayKvRemitBank: '匯款銀行',
    aePayKvRemitAccount: '匯款帳號末 5 碼',
    aePayKvRegTime: '報名時間',
    aePayKvFile: '檔案',
    aePayKvFileLink: '檢視 / 下載',

    // ----- member field labels -----
    aePayFldChineseName: '中文姓名',
    aePayFldEnglishName: '英文姓名',
    aePayFldGender: '性別',
    aePayFldBirthday: '生日',
    aePayFldIdNumber: '身分證',
    aePayFldPassport: '護照',
    aePayFldNationality: '國籍',
    aePayFldSchool: '學校',
    aePayFldDepartment: '系所',
    aePayFldGrade: '年級',
    aePayFldJobTitle: '職稱',
    aePayFldOrganization: '服務單位',
    aePayFldEmail: 'Email',
    aePayFldPhone: '電話',
    aePayFldPostalCode: '郵遞區號',
    aePayFldAddress: '地址',
    aePayFldDietary: '飲食',
    aePayFldDietaryRestriction: '飲食限制',
    aePayFldTshirt: 'T-shirt',
    aePayFldAccommodation: '住宿',

    // ----- delete dialog -----
    aePayDeleteMsgPre: '確定刪除隊伍「',
    aePayDeleteMsgMid: '」（',
    aePayDeleteMsgSuf: '）？此操作無法復原，隊伍的所有成員資料與上傳檔案也會一併刪除。',
    aePayDeleteTitle: '刪除報名',
    aePayDeleteOk: '永久刪除',
    aePayDeleteDonePre: '已刪除「',
    aePayDeleteDoneSuf: '」',
    aePayDeleteFail: '刪除失敗',
    aePayDeleteFailPre: '刪除失敗：',

    // ----- reconcile run -----
    aePayReconcileBadInput: '請輸入 5 位數字',
    aePayReconcileRunning: '對帳中⋯',
    aePayReconcileDonePre: '對帳完成：標記 ',
    aePayReconcileDoneSuf: ' 筆為已確認',
    aePayReconcileFailPre: '失敗：',

    // ----- payout (平台代收轉付) intro -----
    aePayPayoutIntroTitle: '💸 平台代收轉付',
    aePayPayoutIntroDesc: '線上付款（PayUNI）由平台代收，扣除手續費後依轉帳週期匯入主辦方「收款帳戶」。銀行轉帳（ATM）由報名者直接匯入主辦方帳戶，不在此列。',

    // ----- payout section headings -----
    aePayPayoutSecOrders: '各隊收款明細',
    aePayPayoutSecRemittances: '平台匯款紀錄',

    // ----- payout account bar -----
    aePayPayoutAcctTitle: '收款帳戶',
    aePayPayoutAcctNotSet: '尚未設定',
    aePayPayoutAcctNoteHtml: '請至「<a href="/admin/settings.html" style="color:var(--acc)">帳戶設定 → 收款帳戶</a>」填寫，平台才能匯款給您。',
    aePayPayoutAcctAccountPre: '帳號 ',
    aePayPayoutAcctNamePre: '　戶名 ',

    // ----- payout cycle bar -----
    aePayPayoutCycleTitle: '轉帳週期',
    aePayPayoutCycleMonthly: '每月匯款',
    aePayPayoutCycleWeekly: '每週匯款',
    aePayPayoutCycleNextPre: '下次預計匯款日：',
    aePayPayoutFeePre: 'PayUNI 手續費 ',
    aePayPayoutFeeSuf: '%　每次匯款扣 NT$15 匯費',
    aePayPayoutNextMonthly: '（每月 5 日，遇假日順延）',
    aePayPayoutNextWeekly: '（每週四）',

    // ----- payout load error -----
    aePayPayoutLoadFailPre: '載入失敗：',

    // ----- payout summary cards -----
    aePayPayoutSumGross: 'PayUNI 收款',
    aePayPayoutSumGrossSub: ' 筆訂單',
    aePayPayoutSumFee: '扣除手續費',
    aePayPayoutSumNet: '實領合計',
    aePayPayoutSumSettled: '平台已轉',
    aePayPayoutSumSettledSub: ' 筆已匯款',
    aePayPayoutSumUnsettled: '尚未轉付',
    aePayPayoutSumUnsettledSub: ' 筆待匯款',

    // ----- payout orders table -----
    aePayPayoutOrdEmpty: '尚無線上付款（PayUNI）訂單',
    aePayOrdThTeam: '隊伍',
    aePayOrdThPaidAt: '付款時間',
    aePayOrdThFee2: '報名費',
    aePayOrdThCharge: '手續費',
    aePayOrdThNet: '實領',
    aePayOrdThSettleStatus: '轉付狀態',
    aePayOrdSettledPre: '✓ 已轉 ',
    aePayOrdWaiting: '待轉付',

    // ----- payout remittances table -----
    aePayPayoutRemEmpty: '平台尚未對本活動匯款',
    aePayRemThId: '結算編號',
    aePayRemThRemitAt: '匯款時間',
    aePayRemThCount: '本活動筆數',
    aePayRemThNet: '本活動實領',
    aePayRemThAcct: '收款帳戶',
    aePayRemThNote: '備註',

    // ----- misc -----
    aePayAlertNoId: '未指定活動編號'
  };

  var E = {
    // ----- document / header -----
    aePayDocTitle: 'Billing · Organizer Console · RegMaster',
    aePayCrumbHome: 'Organizer Console',
    aePayCrumbEvents: 'Events',
    aePayCrumbHere: 'Billing',
    aePayExportTitle: 'Export',

    // ----- nav (sidebar, this event) -----
    aePayNavOverview: 'Overview',
    aePayNavSettings: 'Settings',
    aePayNavAnnouncements: 'Announcements',
    aePayNavBilling: 'Billing',
    aePayNavScoring: 'Scoring',
    aePayNavCheckin: 'Check-in',
    aePayNavGrpOverview: 'Overview',
    aePayNavGrpThisEvent: 'This Event',
    aePayNavDashboard: 'Dashboard',
    aePayNavAllEvents: 'All Events',
    aePayBrandSub: 'Organizer Console',
    aePayOrgRole: 'Organizer',

    // ----- loading / states -----
    aePayLoading: 'Loading payment data…',
    aePayPayoutLoading: 'Loading payout data…',

    // ----- tabs -----
    aePayTabFees: 'Registration Fees',
    aePayTabPayout: 'Platform Payouts',

    // ----- reconcile bar (enabled) -----
    aePayReconcileTitle: 'Quick Bank Reconciliation',
    aePayReconcileDesc: 'Enter the last 5 digits of the bank account and the system will automatically mark matching teams as “Confirmed” (PayUni online payments reconcile automatically — no manual step needed).',
    aePayReconcilePh: 'e.g. 18923',
    aePayReconcileBtn: 'Run Reconciliation',

    // ----- reconcile bar (disabled note) -----
    aePayReconcileOffTitle: 'Quick Bank Reconciliation Disabled',
    aePayReconcileOffDesc: 'Go to “Settings → Fees → Bank / ATM Transfer”, turn on “Enable bank-transfer collection and reconciliation” and fill in the bank account to unlock this feature.',

    // ----- fees table headers -----
    aePayThId: 'ID',
    aePayThTeam: 'Team',
    aePayThStatus: 'Status',
    aePayThPayStatus: 'Payment Status',
    aePayThMethod: 'Payment Method',
    aePayThAmount: 'Amount',
    aePayThActions: 'Actions',

    // ----- summary cards (報名費) -----
    aePaySumTotalDue: 'Total Due',
    aePaySumReceived: 'Received',
    aePaySumPending: 'Outstanding',
    aePaySumRate: 'Collection Rate',
    aePaySumTotalSubPre: ' × NT$ ',
    aePaySumReceivedSub: ' confirmed',
    aePaySumPendingSub: ' pending',
    aePaySumRateSub: 'Paid / Total registrations',

    // ----- fees table dynamic -----
    aePayEmptyRows: 'No registrations yet',
    aePayNoName: '(none)',
    aePayPillDefault: 'Pending',
    aePayBtnConfirm: 'Confirm Payment',
    aePayBtnView: 'View',
    aePayBtnDelete: 'Delete',

    // ----- confirm-payment dialog -----
    aePayConfirmMsg: 'Confirm this payment?',
    aePayConfirmTitle: 'Confirm Payment',
    aePayConfirmFailPre: 'Failed: ',

    // ----- team-detail modal -----
    aePayModalClose: 'Close',
    aePayModalDetailPre: 'Registration Details · ',
    aePayModalLoading: 'Loading…',
    aePayModalNotFound: 'Registration not found',
    aePayModalLoadFailPre: 'Failed to load: ',
    aePayGroupTeamInfo: 'Team Information',
    aePayGroupStudent: 'Participant ',
    aePayGroupTeacher: 'Instructor ',
    aePayKvId: 'ID',
    aePayKvTeamCN: 'Chinese Team Name',
    aePayKvTeamEN: 'English Team Name',
    aePayKvGroup: 'Group',
    aePayKvStatus: 'Status',
    aePayKvPayStatus: 'Payment Status',
    aePayKvMethod: 'Payment Method',
    aePayKvRemitBank: 'Remitting Bank',
    aePayKvRemitAccount: 'Last 5 Digits of Account',
    aePayKvRegTime: 'Registration Time',
    aePayKvFile: 'File',
    aePayKvFileLink: 'View / Download',

    // ----- member field labels -----
    aePayFldChineseName: 'Chinese Name',
    aePayFldEnglishName: 'English Name',
    aePayFldGender: 'Gender',
    aePayFldBirthday: 'Birthday',
    aePayFldIdNumber: 'ID Number',
    aePayFldPassport: 'Passport',
    aePayFldNationality: 'Nationality',
    aePayFldSchool: 'School',
    aePayFldDepartment: 'Department',
    aePayFldGrade: 'Grade',
    aePayFldJobTitle: 'Job Title',
    aePayFldOrganization: 'Organization',
    aePayFldEmail: 'Email',
    aePayFldPhone: 'Phone',
    aePayFldPostalCode: 'Postal Code',
    aePayFldAddress: 'Address',
    aePayFldDietary: 'Dietary',
    aePayFldDietaryRestriction: 'Dietary Restriction',
    aePayFldTshirt: 'T-shirt',
    aePayFldAccommodation: 'Accommodation',

    // ----- delete dialog -----
    aePayDeleteMsgPre: 'Delete team “',
    aePayDeleteMsgMid: '” (',
    aePayDeleteMsgSuf: ')? This action cannot be undone — all member data and uploaded files for the team will be deleted as well.',
    aePayDeleteTitle: 'Delete Registration',
    aePayDeleteOk: 'Delete Permanently',
    aePayDeleteDonePre: 'Deleted “',
    aePayDeleteDoneSuf: '”',
    aePayDeleteFail: 'Delete failed',
    aePayDeleteFailPre: 'Delete failed: ',

    // ----- reconcile run -----
    aePayReconcileBadInput: 'Please enter 5 digits',
    aePayReconcileRunning: 'Reconciling…',
    aePayReconcileDonePre: 'Reconciliation complete: marked ',
    aePayReconcileDoneSuf: ' as confirmed',
    aePayReconcileFailPre: 'Failed: ',

    // ----- payout (平台代收轉付) intro -----
    aePayPayoutIntroTitle: '💸 Platform Payouts',
    aePayPayoutIntroDesc: 'Online payments (PayUNI) are collected by the platform; after deducting fees they are remitted to the organizer\'s “payout account” on the transfer cycle. Bank transfers (ATM) are paid directly into the organizer\'s account by registrants and are not listed here.',

    // ----- payout section headings -----
    aePayPayoutSecOrders: 'Per-Team Collection Detail',
    aePayPayoutSecRemittances: 'Platform Remittance Records',

    // ----- payout account bar -----
    aePayPayoutAcctTitle: 'Payout Account',
    aePayPayoutAcctNotSet: 'Not set',
    aePayPayoutAcctNoteHtml: 'Go to “<a href="/admin/settings.html" style="color:var(--acc)">Account Settings → Payout Account</a>” and fill it in so the platform can remit to you.',
    aePayPayoutAcctAccountPre: 'Account ',
    aePayPayoutAcctNamePre: '　Account name ',

    // ----- payout cycle bar -----
    aePayPayoutCycleTitle: 'Transfer Cycle',
    aePayPayoutCycleMonthly: 'Monthly remittance',
    aePayPayoutCycleWeekly: 'Weekly remittance',
    aePayPayoutCycleNextPre: 'Next expected remittance date: ',
    aePayPayoutFeePre: 'PayUNI fee ',
    aePayPayoutFeeSuf: '%　NT$15 transfer fee deducted per remittance',
    aePayPayoutNextMonthly: ' (5th of each month, rolled forward on holidays)',
    aePayPayoutNextWeekly: ' (every Thursday)',

    // ----- payout load error -----
    aePayPayoutLoadFailPre: 'Failed to load: ',

    // ----- payout summary cards -----
    aePayPayoutSumGross: 'PayUNI Collected',
    aePayPayoutSumGrossSub: ' orders',
    aePayPayoutSumFee: 'Fees Deducted',
    aePayPayoutSumNet: 'Net Total',
    aePayPayoutSumSettled: 'Paid Out',
    aePayPayoutSumSettledSub: ' remitted',
    aePayPayoutSumUnsettled: 'Pending Payout',
    aePayPayoutSumUnsettledSub: ' awaiting remittance',

    // ----- payout orders table -----
    aePayPayoutOrdEmpty: 'No online (PayUNI) payment orders yet',
    aePayOrdThTeam: 'Team',
    aePayOrdThPaidAt: 'Paid At',
    aePayOrdThFee2: 'Registration Fee',
    aePayOrdThCharge: 'Fee',
    aePayOrdThNet: 'Net',
    aePayOrdThSettleStatus: 'Payout Status',
    aePayOrdSettledPre: '✓ Paid ',
    aePayOrdWaiting: 'Pending payout',

    // ----- payout remittances table -----
    aePayPayoutRemEmpty: 'The platform has not remitted for this event yet',
    aePayRemThId: 'Settlement ID',
    aePayRemThRemitAt: 'Remittance Time',
    aePayRemThCount: 'Orders (this event)',
    aePayRemThNet: 'Net (this event)',
    aePayRemThAcct: 'Payout Account',
    aePayRemThNote: 'Note',

    // ----- misc -----
    aePayAlertNoId: 'No event ID specified'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
