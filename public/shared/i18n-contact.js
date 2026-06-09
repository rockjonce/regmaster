// =============================================================================
// RegMaster · I18N (shared/i18n-contact.js)
// =============================================================================
// Page-scoped translations for public/contact.html. Registers into the shared
// window.I18N dictionary built by /shared/i18n.js. All new keys are prefixed
// with "cn". Nav/footer keys are reused from i18n.js and NOT redefined here.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- <title> / meta -----
    cnPageTitle: '聯絡我們 · RegMaster',
    cnMetaDesc: '有任何問題、客製化需求、業務洽詢都歡迎聊聊。4 小時內回覆（平日）。',

    // ----- left panel -----
    cnEyebrow: 'CONTACT US',
    cnHeroTitle: '有任何問題，<br><em>都歡迎聊聊</em>。',
    cnHeroLead: '無論你是在比較工具、想瞭解功能，或在使用上遇到問題 —— 我們都很樂意聽。我們的團隊在台北。',

    cnContactSupportH: '客戶支援',
    cnContactSalesH: '業務洽詢',
    cnContactSalesP: '02-2382-2027 · 平日 10:00-18:00',
    cnContactMediaH: '合作 / 媒體',
    cnContactLineH: 'LINE 即時客服',
    cnContactLineP: '平日 10:00-18:00',

    cnOfficeCaption: '📍 OFFICE',
    cnOfficeAddr: '<b>廣天國際有限公司</b><br>台北市信義區基隆路二段 115 號 7 樓之 3',

    // ----- right panel: tabs -----
    cnTabGeneral: '📨 一般詢問',
    cnTabSales: '🤝 業務 / 客製',
    cnTabSupport: '🛟 客戶支援',

    cnFormTitle: '說說你的需求',
    cnFormSub: '填完送出，我們會在 4 小時內聯繫你（平日）。',

    // ----- form fields -----
    cnLabelName: '姓名 *',
    cnPhName: '王小明',
    cnLabelCompany: '公司 / 機構',
    cnPhCompany: '某大學資工系',
    cnLabelEmail: '電子郵件 *',
    cnLabelPhone: '電話',
    cnPhPhone: '0912-xxx-xxx',

    cnLabelScale: '活動規模',
    cnScaleSmallH: '小型',
    cnScaleSmallP: '50 人以下',
    cnScaleMediumH: '中型',
    cnScaleMediumP: '50–500 人',
    cnScaleLargeH: '大型',
    cnScaleLargeP: '500–2,000 人',
    cnScaleXlargeH: '超大型',
    cnScaleXlargeP: '2,000+ 人',

    cnLabelPlan: '想諮詢的方案',
    cnOptPro: 'Pro 方案',
    cnOptTeam: 'Team 方案 · 客製報價',
    cnOptUndecided: '還在比較中，需要建議',
    cnOptOther: '其他',

    cnLabelMessage: '告訴我們你的需求 *',
    cnPhMessage: '活動類型、預計人數、希望的功能...',
    cnCharCounter: '已填 0 字 · 越具體我們回得越精準',

    cnNewsletter: '同意接收 RegMaster 的產品電子報（可隨時退訂）',

    // ----- form foot -----
    cnPrivacyMeta: '所有資料將依 <a href="/privacy.html" style="color:var(--acc)">隱私權政策</a> 處理。',
    cnSubmit: '送出 →',

    // ----- success box -----
    cnSuccessH: '我們收到了！',
    cnSuccessP: '已收到你的訊息，我們會以你提供的信箱盡快聯繫你（平日 10:00–18:00）。<br>急件可直接撥打 <b>02-2382-2027</b>，或來信 <b>support@calculator.com.tw</b>。',

    // ----- FAQ -----
    cnFaqTitle: '在等回覆的同時，看看這些',
    cnFaqQ1: '要先付費才能用嗎？',
    cnFaqA1: '不用。Free 版永久免費，直接註冊即可建立活動、設計報名表單、收 Email 通知。需要更多功能或更高額度時，再升級即可。',
    cnFaqQ2: '怎麼收報名費？',
    cnFaqA2: '啟用線上付款（PayUNI 信用卡）由平台代收，扣除手續費後依週期撥款給你；或填寫銀行帳戶讓報名者直接 ATM 轉帳，並用「末 5 碼快速對帳」核帳。',
    cnFaqQ3: '是學校 / 非營利單位，有優惠嗎？',
    cnFaqA3: '歡迎以機構信箱來信 <a href="mailto:sales@calculator.com.tw" style="color:var(--acc)">sales@calculator.com.tw</a> 洽詢，我們會視情況提供協助。',

    // ----- dynamic JS strings -----
    cnCharCounterPre: '已填 ',
    cnCharCounterSuf: ' 字 · 越具體我們回得越精準',
    cnAlertName: '請填寫姓名',
    cnAlertEmail: '請填寫正確的 Email',
    cnAlertMessage: '請告訴我們你的需求',
    cnSubmitting: '送出中...',
    cnSubmitFailPre: '送出失敗：',
    cnSubmitFailFallback: '請改用 support@calculator.com.tw 寄信',
    cnSubmitFailNet: '送出失敗，請改用 support@calculator.com.tw 寄信。\n\n錯誤訊息: '
  };

  var E = {
    // ----- <title> / meta -----
    cnPageTitle: 'Contact Us · RegMaster',
    cnMetaDesc: 'Questions, custom needs or business inquiries — we\'d love to chat. We reply within 4 hours on business days.',

    // ----- left panel -----
    cnEyebrow: 'CONTACT US',
    cnHeroTitle: 'Got a question?<br><em>Let\'s talk</em>.',
    cnHeroLead: 'Whether you\'re comparing tools, exploring features, or hitting a snag while using RegMaster — we\'d love to hear from you. Our team is based in Taipei.',

    cnContactSupportH: 'Customer Support',
    cnContactSalesH: 'Sales Inquiries',
    cnContactSalesP: '02-2382-2027 · Weekdays 10:00–18:00',
    cnContactMediaH: 'Partnerships / Media',
    cnContactLineH: 'LINE Live Chat',
    cnContactLineP: 'Weekdays 10:00–18:00',

    cnOfficeCaption: '📍 OFFICE',
    cnOfficeAddr: '<b>Kuang-Tien International Co., Ltd.</b><br>7F-3, No. 115, Sec. 2, Keelung Rd., Xinyi Dist., Taipei',

    // ----- right panel: tabs -----
    cnTabGeneral: '📨 General Inquiry',
    cnTabSales: '🤝 Sales / Custom',
    cnTabSupport: '🛟 Customer Support',

    cnFormTitle: 'Tell us what you need',
    cnFormSub: 'Submit the form and we\'ll get back to you within 4 hours on business days.',

    // ----- form fields -----
    cnLabelName: 'Name *',
    cnPhName: 'Jane Doe',
    cnLabelCompany: 'Company / Organization',
    cnPhCompany: 'e.g. University CS Department',
    cnLabelEmail: 'Email *',
    cnLabelPhone: 'Phone',
    cnPhPhone: '0912-xxx-xxx',

    cnLabelScale: 'Event Size',
    cnScaleSmallH: 'Small',
    cnScaleSmallP: 'Under 50',
    cnScaleMediumH: 'Medium',
    cnScaleMediumP: '50–500',
    cnScaleLargeH: 'Large',
    cnScaleLargeP: '500–2,000',
    cnScaleXlargeH: 'Extra Large',
    cnScaleXlargeP: '2,000+',

    cnLabelPlan: 'Plan you\'re interested in',
    cnOptPro: 'Pro plan',
    cnOptTeam: 'Team · Custom quote',
    cnOptUndecided: 'Still comparing — need advice',
    cnOptOther: 'Other',

    cnLabelMessage: 'Tell us what you need *',
    cnPhMessage: 'Event type, expected headcount, features you\'re after...',
    cnCharCounter: '0 characters · the more detail, the sharper our reply',

    cnNewsletter: 'Subscribe to the RegMaster product newsletter (unsubscribe anytime)',

    // ----- form foot -----
    cnPrivacyMeta: 'All data is handled per our <a href="/privacy.html" style="color:var(--acc)">Privacy Policy</a>.',
    cnSubmit: 'Send →',

    // ----- success box -----
    cnSuccessH: 'We got it!',
    cnSuccessP: 'We\'ve received your message and will reach out at the email you provided as soon as we can (weekdays 10:00–18:00).<br>For urgent matters, call <b>02-2382-2027</b> or email <b>support@calculator.com.tw</b>.',

    // ----- FAQ -----
    cnFaqTitle: 'While you wait, take a look at these',
    cnFaqQ1: 'Do I have to pay before I can use it?',
    cnFaqA1: 'No. The Free plan is free forever — just sign up to create events, design registration forms and send email notifications. Upgrade only when you need more features or higher limits.',
    cnFaqQ2: 'How do I collect registration fees?',
    cnFaqA2: 'Enable online payments (PayUNI credit card) and the platform collects on your behalf, paying out on a regular cycle after fees; or add a bank account so registrants pay by ATM transfer directly, reconciled quickly via the last 5 digits.',
    cnFaqQ3: 'We\'re a school / nonprofit — are there discounts?',
    cnFaqA3: 'Reach out from your institutional email at <a href="mailto:sales@calculator.com.tw" style="color:var(--acc)">sales@calculator.com.tw</a> and we\'ll see how we can help.',

    // ----- dynamic JS strings -----
    cnCharCounterPre: '',
    cnCharCounterSuf: ' characters · the more detail, the sharper our reply',
    cnAlertName: 'Please enter your name',
    cnAlertEmail: 'Please enter a valid email',
    cnAlertMessage: 'Please tell us what you need',
    cnSubmitting: 'Sending...',
    cnSubmitFailPre: 'Submission failed: ',
    cnSubmitFailFallback: 'please email us at support@calculator.com.tw instead',
    cnSubmitFailNet: 'Submission failed. Please email us at support@calculator.com.tw instead.\n\nError: '
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
