// Page dictionary for pricing.html — merged into the shared window.I18N.
// Reuses shared nav/footer keys (nav*/ft*) and plan-card keys (pf*/uUnlimited/
// priceYear/priceForever/pfNoTax/pfNoCard/badgePopular/btn*) from i18n.js.
(function () {
  if (!window.I18N) return;
  var Z = {
    prHeroTitle: '從免費開始<br>用得越多<em>越划算</em>。',
    prHeroSub: '透明定價、無隱藏費用、隨時可降級或取消。價格與功能以實際方案設定為準。',
    prNote: '所有金額未含稅 · NT$ = 新台幣 · 接受發票申請統編 · 銀行轉帳免收金流手續費',
    prCmpH2: '逐項比較',
    prCmpSub: '看清楚每一分錢買到了什麼。',
    prCmpCap: '方案與容量',
    prCmpFeat: '功能',
    prRowFee: '年訂閱費（NT$/年）',
    prRowEvents: '活動數（總數，含所有狀態）',
    prRowCap: '每活動報名上限',
    prRowPayFee: 'PayUNI 金流手續費（每筆）',
    prFreeWord: '免費',
    prFaqH2: '關於付費，你可能想問',
    prFaqQ1: '可以隨時升級嗎？費用怎麼算？',
    prFaqA1: '可以。升級立即生效，並以「公平按比例」計算差額：應補金額 ＝ 新方案年費 −（目前方案年費 × 剩餘天數 ÷ 365），付款日起重新計算 365 天。系統會在「方案與授權」頁依當日日期告訴你升級需補多少。目前不提供線上自助降級，如需降級請於到期後重新選擇方案，或聯繫客服。',
    prFaqQ2: 'PayUNI 金流手續費怎麼算？',
    prFaqA2: '手續費依方案而定（Free 5%、Starter 3%、Pro 2%、Team 1%），以報名者實際線上付款金額計算。平台代收後扣除手續費，再依轉帳週期撥款至你的收款帳戶。<b>銀行 / ATM 轉帳由報名者直接匯入主辦方帳戶，平台不收手續費。</b>',
    prFaqQ3: '是學校 / 非營利單位，有優惠嗎？',
    prFaqA3: '歡迎以機構信箱來信 <a href="mailto:sales@calculator.com.tw" style="color:var(--acc)">sales@calculator.com.tw</a> 與我們洽詢，我們會視情況提供協助。',
    prFaqQ4: '免費版會強制升級嗎？',
    prFaqA4: '不會。Free 版永久免費，沒有時間限制。當你超過免費版的限制（例如同時 1 個進行中活動、單場 60 人）時，才需要升級或調整。各方案的實際額度以「方案」頁為準。',
    prFaqQ5: '方案費用可以退費嗎？',
    prFaqA5: '方案訂閱費用如有問題，請於購買後盡速來信客服協助處理。請注意：<b>各活動「報名費」之退費，由該活動主辦方依其公告政策辦理</b>，與平台方案費用不同。',
    prFaqQ6: '能開立統編 / 發票嗎？',
    prFaqA6: '購買方案時可提供公司統編。🚧 自動電子發票寄送功能即將推出；在此之前如需發票，請來信客服協助開立。',
    prCtaH2: '還在猶豫？',
    prCtaSub: 'Free 版永久免費，就能跑完整個流程。先試試，需要時再升級。',
    prCtaFree: '免費開始',
    prCtaTalk: '和我們聊聊'
  };
  var E = {
    prHeroTitle: 'Start free —<br>better value <em>the more you use it</em>.',
    prHeroSub: 'Transparent pricing, no hidden fees, downgrade or cancel anytime. Actual prices and features follow your plan settings.',
    prNote: 'All prices exclude tax · NT$ = New Taiwan Dollar · business tax ID accepted for invoices · no transaction fee on bank transfers',
    prCmpH2: 'Feature-by-feature comparison',
    prCmpSub: 'See exactly what every dollar buys.',
    prCmpCap: 'Plans & capacity',
    prCmpFeat: 'Features',
    prRowFee: 'Annual subscription (NT$/yr)',
    prRowEvents: 'Events (total, all statuses)',
    prRowCap: 'Registrations per event',
    prRowPayFee: 'PayUNi transaction fee (per payment)',
    prFreeWord: 'Free',
    prFaqH2: 'Questions you might have about paying',
    prFaqQ1: 'Can I upgrade anytime? How is the cost calculated?',
    prFaqA1: 'Yes. Upgrades take effect immediately, and the difference is prorated fairly: amount due = the new plan\'s annual fee − (your current plan\'s annual fee × days remaining ÷ 365), with a fresh 365 days starting from the payment date. The "Plans & Licenses" page shows exactly how much an upgrade costs based on today\'s date. Online self-service downgrades aren\'t available yet; to downgrade, re-select a plan after expiry or contact support.',
    prFaqQ2: 'How is the PayUNi transaction fee calculated?',
    prFaqA2: 'The fee depends on your plan (Free 5%, Starter 3%, Pro 2%, Team 1%) and is based on the amount registrants actually pay online. The platform collects the payment, deducts the fee, then pays out to your account on the transfer schedule. <b>Bank / ATM transfers go directly into the organizer\'s account, with no platform fee.</b>',
    prFaqQ3: 'Are there discounts for schools or non-profits?',
    prFaqA3: 'You\'re welcome to email us from your institutional address at <a href="mailto:sales@calculator.com.tw" style="color:var(--acc)">sales@calculator.com.tw</a> and we\'ll help where we can.',
    prFaqQ4: 'Will the Free plan force me to upgrade?',
    prFaqA4: 'No. The Free plan is free forever, with no time limit. You only need to upgrade or adjust when you exceed its limits (for example, 1 concurrent active event or 60 people per event). Each plan\'s actual quota is shown on the "Pricing" page.',
    prFaqQ5: 'Can I get a refund on plan fees?',
    prFaqA5: 'If there\'s any issue with a plan subscription fee, please email support as soon as possible after purchase. Note: <b>refunds of an event\'s "registration fee" are handled by that event\'s organizer under their published policy</b>, which is separate from platform plan fees.',
    prFaqQ6: 'Can you issue a business tax ID / invoice?',
    prFaqA6: 'You can provide a company tax ID when purchasing a plan. 🚧 Automatic e-invoice delivery is coming soon; until then, email support to have an invoice issued.',
    prCtaH2: 'Still deciding?',
    prCtaSub: 'The Free plan is free forever and runs the entire workflow. Try it first, and upgrade when you need to.',
    prCtaFree: 'Start free',
    prCtaTalk: 'Talk to us'
  };
  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
