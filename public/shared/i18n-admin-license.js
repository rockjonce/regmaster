// =============================================================================
// RegMaster · I18N add-on for /admin/license.html (Plans & Licenses)
// =============================================================================
// Page-scoped keys (prefix: adLic) merged into the shared window.I18N dict.
// Loaded immediately after /shared/i18n.js. zh values are EXACT copies of the
// original Traditional-Chinese strings; en values are fluent translations.
// Inline-markup strings (<br>/<b>) are applied via [data-i18n-html] in HTML or
// composed in JS where the original built the markup dynamically.
// =============================================================================
(function () {
  if (!window.I18N) return;
  var Z = {
    // ----- current plan card -----
    adLicBadgeLoading: '⏳ 載入中',
    adLicPlanDescDefault: '查詢您的授權狀態與額度⋯',
    adLicLblStatus: '狀態',
    adLicLblExpiry: '到期日',
    adLicLblQuota: '剩餘額度',
    adLicPlanSuffix: ' 方案',
    adLicFreePlanDesc: '免費方案 — 升級可解鎖更多活動與進階功能',
    adLicStatusActivated: '已啟用',
    adLicStatusFree: '免費',
    // ----- activate card -----
    adLicActivateH3: '輸入授權碼',
    adLicActivateP: '有 RegMaster 授權碼？輸入下方啟用。每組授權碼僅能啟用一次。',
    adLicCodePlaceholder: '例：RM-XXXX-XXXX-XXXX-XXXX',
    adLicActivateBtn: '啟用',
    adLicActivating: '啟用中⋯',
    // ----- upgrade section -----
    adLicUpgradeH2: '可升級方案',
    adLicUpgradeP: '輸入授權碼即可升級，或直接線上刷卡（PayUni）綁定方案。價格以年計。',
    adLicCardLoading: '載入中⋯',
    // ----- history table -----
    adLicHistH3: '授權碼歷史',
    adLicHistCode: '授權碼',
    adLicHistType: '類型',
    adLicHistQuota: '額度',
    adLicHistStatus: '狀態',
    adLicHistExpiry: '到期',
    adLicHistEmpty: '尚無授權紀錄',
    // ----- plan card (dynamic) -----
    adLicCurPlan: '目前方案',
    adLicLowerPlan: '較低方案',
    adLicFree: '免費',
    adLicNoPriceTitle: '尚未設定價格',
    adLicNotOpen: '未開放',
    adLicBuyNow: '立即購買',
    // dynamic upgrade button / note ({amt}/{credit}/{days} substituted in JS)
    adLicUpgradeBtn: '升級（加 NT${amt}）→',
    adLicUpgradeNoteHead: '升級僅需 NT${amt}',
    adLicUpgradeNoteSub: '已折抵目前方案剩餘 {days} 天 NT${credit}；付款日起重新計 365 天',
    adLicBuyNowAmt: '立即購買（NT${amt}）→',
    adLicBuyNowArrow: '立即購買 →',
    adLicPerYear: '/年',
    adLicLimActiveEvents: '同時活動數：',
    adLicLimCapacity: '單場名額：',
    adLicUnlimited: '無限',
    adLicFeePrefix: 'PayUNI 金流手續費：',
    adLicFeeNote: '報名者線上付款扣除；銀行轉帳免收',
    // feature labels
    adLicFeatPayment: '線上金流收款',
    adLicFeatCsvExport: '匯出報表',
    adLicFeatAi: 'AI 助理（主辦後台）',
    adLicFeatEventAi: '活動 AI 助理',
    adLicFeatScoring: '評分',
    adLicFeatMultiJudge: '多評審評分 + 團隊成員權限',
    adLicFeatCampaigns: '公告群發',
    adLicFeatCheckin: 'QR 報到',
    adLicFeatWaitlist: '允許候補',
    adLicFeatCertificate: '名牌 / 證書',
    // ----- alerts / confirms -----
    adLicAlertNoCode: '請輸入授權碼',
    adLicActivateOk: '✓ 啟用成功',
    adLicActivateFail: '啟用失敗',
    adLicConfirmTitle: '購買 / 升級方案',
    adLicConfirmOk: '前往付款',
    adLicOrderFail: '建立訂單失敗',
    // purchase / upgrade confirm bodies ({label}/{amt}/{days}/{credit} substituted in JS)
    adLicConfirmUpgrade: '升級至 {label} 方案：\n\n應付差額 NT${amt}\n（已折抵目前方案剩餘 {days} 天 NT${credit}）\n付款成功後，{label} 方案自當日起算 365 天。\n\n將以線上信用卡刷卡（PayUni）付款，是否繼續？',
    adLicConfirmBuy: '購買 {label} 方案（自付款日起 1 年）：\n\n應付 NT${amt}\n\n將以線上信用卡刷卡（PayUni）付款，付款成功後自動啟用，是否繼續？',
    adLicActivateOkUntil: '（至 {date}）',
    // failure prefixes
    adLicErrLoadStatus: '無法載入授權狀態：',
    adLicErrFail: '失敗：',
    // tier defaults (presentational fallbacks; backend name/tagline preferred)
    adLicTierFreeName: 'Free', adLicTierFreeTag: '小型活動入門',
    adLicTierStarterName: 'Starter', adLicTierStarterTag: '單一活動主辦',
    adLicTierProName: 'Pro', adLicTierProTag: '完整功能',
    adLicTierTeamName: 'Team', adLicTierTeamTag: '大型機構'
  };
  var E = {
    // ----- current plan card -----
    adLicBadgeLoading: '⏳ Loading',
    adLicPlanDescDefault: 'Checking your license status and quota…',
    adLicLblStatus: 'Status',
    adLicLblExpiry: 'Expires',
    adLicLblQuota: 'Quota left',
    adLicPlanSuffix: ' plan',
    adLicFreePlanDesc: 'Free plan — upgrade to unlock more events and advanced features',
    adLicStatusActivated: 'Active',
    adLicStatusFree: 'Free',
    // ----- activate card -----
    adLicActivateH3: 'Enter a license code',
    adLicActivateP: 'Have a RegMaster license code? Enter it below to activate. Each code can only be activated once.',
    adLicCodePlaceholder: 'e.g. RM-XXXX-XXXX-XXXX-XXXX',
    adLicActivateBtn: 'Activate',
    adLicActivating: 'Activating…',
    // ----- upgrade section -----
    adLicUpgradeH2: 'Upgrade options',
    adLicUpgradeP: 'Enter a license code to upgrade, or pay online by card (PayUni) to bind a plan. Prices are annual.',
    adLicCardLoading: 'Loading…',
    // ----- history table -----
    adLicHistH3: 'License code history',
    adLicHistCode: 'Code',
    adLicHistType: 'Type',
    adLicHistQuota: 'Quota',
    adLicHistStatus: 'Status',
    adLicHistExpiry: 'Expires',
    adLicHistEmpty: 'No license records yet',
    // ----- plan card (dynamic) -----
    adLicCurPlan: 'Current plan',
    adLicLowerPlan: 'Lower plan',
    adLicFree: 'Free',
    adLicNoPriceTitle: 'Price not set yet',
    adLicNotOpen: 'Unavailable',
    adLicBuyNow: 'Buy now',
    // dynamic upgrade button / note ({amt}/{credit}/{days} substituted in JS)
    adLicUpgradeBtn: 'Upgrade (+NT${amt}) →',
    adLicUpgradeNoteHead: 'Upgrade for just NT${amt}',
    adLicUpgradeNoteSub: 'NT${credit} credited for the {days} days left on your current plan; the new 365-day term starts on the payment date',
    adLicBuyNowAmt: 'Buy now (NT${amt}) →',
    adLicBuyNowArrow: 'Buy now →',
    adLicPerYear: '/yr',
    adLicLimActiveEvents: 'Concurrent events: ',
    adLicLimCapacity: 'Capacity per event: ',
    adLicUnlimited: 'Unlimited',
    adLicFeePrefix: 'PayUNI transaction fee: ',
    adLicFeeNote: 'Deducted from online payments; bank transfers are free',
    // feature labels
    adLicFeatPayment: 'Online payment collection',
    adLicFeatCsvExport: 'Report export',
    adLicFeatAi: 'AI assistant (organizer console)',
    adLicFeatEventAi: 'Event AI assistant',
    adLicFeatScoring: 'Scoring',
    adLicFeatMultiJudge: 'Multi-judge + team member roles',
    adLicFeatCampaigns: 'Broadcast notices',
    adLicFeatCheckin: 'QR check-in',
    adLicFeatWaitlist: 'Waitlist',
    adLicFeatCertificate: 'Badges & certificates',
    // ----- alerts / confirms -----
    adLicAlertNoCode: 'Please enter a license code',
    adLicActivateOk: '✓ Activated successfully',
    adLicActivateFail: 'Activation failed',
    adLicConfirmTitle: 'Buy / upgrade plan',
    adLicConfirmOk: 'Proceed to payment',
    adLicOrderFail: 'Failed to create order',
    // purchase / upgrade confirm bodies ({label}/{amt}/{days}/{credit} substituted in JS)
    adLicConfirmUpgrade: 'Upgrade to the {label} plan:\n\nAmount due NT${amt}\n(NT${credit} credited for the {days} days left on your current plan)\nOnce payment succeeds, the {label} plan runs for 365 days from that date.\n\nPayment is by online credit card (PayUni). Continue?',
    adLicConfirmBuy: 'Buy the {label} plan (1 year from the payment date):\n\nAmount due NT${amt}\n\nPayment is by online credit card (PayUni); the plan activates automatically once payment succeeds. Continue?',
    adLicActivateOkUntil: ' (until {date})',
    // failure prefixes
    adLicErrLoadStatus: 'Unable to load license status: ',
    adLicErrFail: 'Failed: ',
    // tier defaults
    adLicTierFreeName: 'Free', adLicTierFreeTag: 'Getting started with small events',
    adLicTierStarterName: 'Starter', adLicTierStarterTag: 'Single-event organizers',
    adLicTierProName: 'Pro', adLicTierProTag: 'Full features',
    adLicTierTeamName: 'Team', adLicTierTeamTag: 'Large organizations'
  };
  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
