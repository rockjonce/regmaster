// =============================================================================
// RegMaster · I18N (shared/i18n-privacy.js)
// =============================================================================
// Page-scoped translations for public/privacy.html. Registers into the shared
// window.I18N dictionary built by /shared/i18n.js. All new keys are prefixed
// with "pv". Nav/footer keys are reused from i18n.js where the text matches;
// otherwise pv-prefixed keys are used.
//
// NOTE: The English values are a machine-generated legal translation and should
// be reviewed by qualified counsel before being relied upon.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- <title> / meta -----
    pvPageTitle: '隱私權政策 · RegMaster',
    pvMetaDesc: 'RegMaster 線上活動報名平台（廣天國際有限公司產品）隱私權政策：說明個人資料的蒐集、處理、利用、保護與您的權利。',

    // ----- nav links -----
    pvNavExplore: '探索活動',
    pvNavPricing: '方案',
    pvNavContact: '聯絡',
    pvNavLogin: '登入',

    // ----- hero -----
    pvH1: '隱私權政策',
    pvHeroSub: 'RegMaster 線上活動報名平台 · 廣天國際有限公司（Kuang-Tien International Co., Ltd.）產品<br>最後更新日期：2026 年 6 月 1 日',

    // ----- intro -----
    pvIntro: '歡迎使用 RegMaster（以下簡稱「本平台」）。本平台為廣天國際有限公司（以下簡稱「本公司」）所開發及營運之線上活動報名管理服務。本公司非常重視您的隱私權，為了讓您能安心使用本平台之各項服務與功能，特此說明本平台的隱私權保護政策，以保障您的權益，請您詳閱下列內容。',
    pvNote1: '本隱私權政策適用於您在使用本平台服務時所提供之個人識別資料的蒐集、處理與利用；不適用於本平台以外之相關連結網站，亦不適用於非本公司所委託或參與管理之人員。',

    // ----- 一、適用範圍 -----
    pvS1H: '一、適用範圍',
    pvS1P: '本隱私權政策適用於您在 regmaster-v3.web.app 及本平台相關網域使用服務、註冊帳號、建立活動、進行報名或與本平台互動時，所涉及之個人資料蒐集、處理及利用。當您連結至本平台以外的第三方網站（如金流服務 PayUNI、外部連結等），各該網站之隱私權政策不適用於本平台，本公司亦不負相關責任。',

    // ----- 二、蒐集、處理與利用 -----
    pvS2H: '二、個人資料的蒐集、處理與利用方式',
    pvS2P: '本平台於下列情形蒐集您的個人資料，並僅於蒐集之特定目的及必要範圍內處理與利用：',
    pvS2OrgH: '主辦方（活動管理者）',
    pvS2OrgLi1: '註冊與帳號管理：帳號、顯示名稱、機構名稱、電子郵件、電話。',
    pvS2OrgLi2: '收款與帳務：收款銀行帳戶資訊（用於平台代收線上報名費後之撥款）。',
    pvS2OrgLi3: '服務使用紀錄：登入時間、登入裝置與瀏覽器、操作日誌。',
    pvS2RegH: '報名者',
    pvS2RegLi1: '報名資料：由各活動主辦方自訂之報名表單欄位（如姓名、生日、身分證/護照、聯絡方式、學校/單位、緊急聯絡人等）。',
    pvS2RegLi2: '付款相關：選擇線上付款（PayUNI）時之交易識別資訊；選擇銀行轉帳時之轉出帳號末碼（供主辦方對帳）。',
    pvS2AutoH: '自動蒐集之資訊',
    pvS2AutoP: '於一般瀏覽期間，伺服器會自動記錄您的 IP 位址、使用時間、瀏覽器類型及點擊紀錄等，作為流量分析與系統安全之內部參考，不對個別使用者進行連結分析。',

    // ----- 三、資料的保護 -----
    pvS3H: '三、資料的保護',
    pvS3P: '本平台採用 Google Firebase 雲端基礎設施運作，傳輸以 HTTPS（SSL/TLS）加密。系統設有存取控制機制，敏感性資料（如金流金鑰）僅授權之系統管理人員得以存取，且相關人員均受保密義務拘束。惟網路傳輸無法保證絕對安全，本公司將盡合理之注意義務維護資料安全。',

    // ----- 四、與第三方共用 -----
    pvS4H: '四、與第三方共用個人資料之政策',
    pvS4P: '本公司絕不會任意出售、交換、出租或以其他方式揭露您的個人資料予其他個人、團體、私人企業或公務機關，但下列情形除外：',
    pvS4Li1: '經您事前同意。',
    pvS4Li2: '為提供服務之必要：如線上付款須將交易資訊傳遞予金流服務商（PayUNI），報名資料須提供予您所報名之活動主辦方。',
    pvS4Li3: '司法機關或主管機關依法令要求，或為配合調查所必須。',
    pvS4Li4: '為維護本平台之合法權益或其他使用者之安全所必要。',

    // ----- 五、主辦方與報名者之資料關係 -----
    pvS5H: '五、主辦方與報名者之資料關係',
    pvS5P: '報名者透過本平台向特定活動報名時，所填寫之報名資料將提供予該活動之主辦方，供其辦理活動報名、審核、聯絡、收費與對帳等用途。主辦方就其所蒐集之報名者個人資料，應自行遵守個人資料保護法及相關法令，並僅於辦理該活動之必要範圍內利用。本公司僅提供技術平台，不為主辦方之資料利用行為負責。',

    // ----- 六、Cookie -----
    pvS6H: '六、Cookie 的使用',
    pvS6P: '為提供您最佳的服務，本平台會在您的裝置上放置並讀取 Cookie（或瀏覽器本機儲存），用於維持登入狀態與偏好設定。您可透過瀏覽器設定拒絕 Cookie，惟可能導致部分功能無法正常運作。',

    // ----- 七、查閱、更正與刪除 -----
    pvS7H: '七、資料的查閱、更正與刪除',
    pvS7P: '您得隨時於帳號設定中查閱及更正您所提供之個人資料。您亦得就本公司保有之您的個人資料，請求查閱、製給複製本、補充或更正、停止蒐集處理利用或刪除。報名者如欲行使前述權利，亦得透過活動主辦方或聯絡本公司客服協助處理。主辦方可於帳號設定中自行刪除帳號。',

    // ----- 八、修訂 -----
    pvS8H: '八、隱私權政策之修訂',
    pvS8P: '本公司將因應需求隨時修訂本隱私權政策，修訂後之條款將公布於本平台。建議您不時查閱本頁面，以瞭解最新之隱私權保護政策。',

    // ----- 九、聯絡我們 -----
    pvS9H: '九、聯絡我們',
    pvS9P: '如對本隱私權政策有任何疑問，或欲行使前述個人資料相關權利，歡迎來信 <a href="mailto:support@calculator.com.tw" style="color:var(--acc)">support@calculator.com.tw</a>，或參閱<a href="/contact.html" style="color:var(--acc)">聯絡我們</a>頁面。',

    pvNoteCompany: '廣天國際有限公司 Kuang-Tien International Co., Ltd.<br>地址：台北市信義區基隆路二段 115 號 7 樓之 3',

    // ----- footer -----
    pvFootCopyright: '© 2026 RegMaster · 廣天國際有限公司',
    pvFootPrivacy: '隱私權政策',
    pvFootTerms: '服務條款',
    pvFootContact: '聯絡我們'
  };

  var E = {
    // ----- <title> / meta -----
    pvPageTitle: 'Privacy Policy · RegMaster',
    pvMetaDesc: 'Privacy Policy of the RegMaster online event registration platform (a product of GuangTian International Co., Ltd.): explaining the collection, processing, use and protection of personal data and your rights.',

    // ----- nav links -----
    pvNavExplore: 'Explore',
    pvNavPricing: 'Pricing',
    pvNavContact: 'Contact',
    pvNavLogin: 'Login',

    // ----- hero -----
    pvH1: 'Privacy Policy',
    pvHeroSub: 'RegMaster Online Event Registration Platform · a product of GuangTian International Co., Ltd. (Kuang-Tien International Co., Ltd.)<br>Last updated: 1 June 2026',

    // ----- intro -----
    pvIntro: 'Welcome to RegMaster (the “Platform”). The Platform is an online event registration management service developed and operated by GuangTian International Co., Ltd. (the “Company”). The Company places the utmost importance on your right to privacy. So that you may use the Platform’s services and features with confidence, the Company hereby sets out this privacy protection policy to safeguard your interests. Please read the following carefully.',
    pvNote1: 'This Privacy Policy applies to the collection, processing and use of personally identifiable data that you provide when using the Platform’s services; it does not apply to any linked websites outside the Platform, nor to any persons not engaged or involved in management by the Company.',

    // ----- 一、適用範圍 -----
    pvS1H: '1. Scope of Application',
    pvS1P: 'This Privacy Policy applies to the collection, processing and use of personal data involved when you use the services, register an account, create an event, complete a registration, or otherwise interact with the Platform at regmaster-v3.web.app and the Platform’s related domains. Where you follow a link to a third-party website outside the Platform (such as the payment service provider PayUNI, external links and the like), the privacy policy of each such website does not apply to the Platform, and the Company shall bear no responsibility in connection therewith.',

    // ----- 二、蒐集、處理與利用 -----
    pvS2H: '2. Manner of Collection, Processing and Use of Personal Data',
    pvS2P: 'The Platform collects your personal data in the circumstances set out below, and processes and uses such data solely within the specific purposes for which it was collected and to the extent necessary:',
    pvS2OrgH: 'Organizers (Event Administrators)',
    pvS2OrgLi1: 'Registration and account management: account, display name, organization name, email address and telephone number.',
    pvS2OrgLi2: 'Collection of payments and accounting: receiving bank account information (used for disbursement after the Platform collects online registration fees on the Organizer’s behalf).',
    pvS2OrgLi3: 'Service usage records: login times, login device and browser, and operation logs.',
    pvS2RegH: 'Registrants',
    pvS2RegLi1: 'Registration data: the registration form fields defined by each event Organizer (such as name, date of birth, national identity card / passport, contact details, school / organization, emergency contact and the like).',
    pvS2RegLi2: 'Payment-related data: transaction identification information where online payment (PayUNI) is selected; and the last digits of the remitting account number where bank transfer is selected (for the Organizer’s reconciliation).',
    pvS2AutoH: 'Automatically Collected Information',
    pvS2AutoP: 'During ordinary browsing, the server automatically records information such as your IP address, time of use, browser type and click records, for internal reference in traffic analysis and system security; no linking analysis is conducted in respect of individual users.',

    // ----- 三、資料的保護 -----
    pvS3H: '3. Protection of Data',
    pvS3P: 'The Platform operates on Google Firebase cloud infrastructure, with transmission encrypted by HTTPS (SSL/TLS). The system is equipped with access control mechanisms; sensitive data (such as payment keys) may be accessed only by authorized system administrators, all of whom are bound by obligations of confidentiality. Network transmission cannot, however, be guaranteed to be absolutely secure, and the Company shall exercise reasonable care to maintain data security.',

    // ----- 四、與第三方共用 -----
    pvS4H: '4. Policy on Sharing Personal Data with Third Parties',
    pvS4P: 'The Company shall under no circumstances arbitrarily sell, exchange, lease or otherwise disclose your personal data to any other individual, organization, private enterprise or government agency, save in the following circumstances:',
    pvS4Li1: 'with your prior consent;',
    pvS4Li2: 'where necessary to provide the services: for example, online payment requires transaction information to be transmitted to the payment service provider (PayUNI), and registration data must be provided to the Organizer of the event for which you have registered;',
    pvS4Li3: 'where required by judicial authorities or competent authorities pursuant to laws and regulations, or as necessary to cooperate with an investigation; and',
    pvS4Li4: 'where necessary to safeguard the legitimate rights and interests of the Platform or the safety of other users.',

    // ----- 五、主辦方與報名者之資料關係 -----
    pvS5H: '5. Data Relationship Between Organizers and Registrants',
    pvS5P: 'Where a Registrant registers for a particular event through the Platform, the registration data completed by the Registrant will be provided to the Organizer of that event for purposes including the handling of event registration, review, contact, fee collection and reconciliation. With respect to the Registrants’ personal data that it collects, the Organizer shall itself comply with the Personal Data Protection Act and related laws and regulations, and shall use such data solely to the extent necessary for the holding of that event. The Company merely provides the technical platform and is not responsible for the Organizer’s use of data.',

    // ----- 六、Cookie -----
    pvS6H: '6. Use of Cookies',
    pvS6P: 'In order to provide you with the best service, the Platform places and reads cookies (or browser local storage) on your device, used to maintain login status and preference settings. You may refuse cookies through your browser settings; doing so may, however, cause certain features to malfunction.',

    // ----- 七、查閱、更正與刪除 -----
    pvS7H: '7. Access to, Correction and Deletion of Data',
    pvS7P: 'You may at any time, in your account settings, access and correct the personal data you have provided. You may also, in respect of your personal data held by the Company, request to access it, to be given a copy of it, to supplement or correct it, to cease its collection, processing or use, or to delete it. A Registrant wishing to exercise the foregoing rights may also seek assistance through the event Organizer or by contacting the Company’s customer service. An Organizer may delete its own account in the account settings.',

    // ----- 八、修訂 -----
    pvS8H: '8. Amendment of the Privacy Policy',
    pvS8P: 'The Company may amend this Privacy Policy at any time in response to its needs, and the amended terms will be published on the Platform. You are advised to review this page from time to time in order to be aware of the latest privacy protection policy.',

    // ----- 九、聯絡我們 -----
    pvS9H: '9. Contact Us',
    pvS9P: 'If you have any questions regarding this Privacy Policy, or wish to exercise the foregoing rights in relation to personal data, you are welcome to write to us at <a href="mailto:support@calculator.com.tw" style="color:var(--acc)">support@calculator.com.tw</a>, or to refer to the <a href="/contact.html" style="color:var(--acc)">Contact Us</a> page.',

    pvNoteCompany: 'GuangTian International Co., Ltd. (Kuang-Tien International Co., Ltd.)<br>Address: 7F-3, No. 115, Sec. 2, Keelung Rd., Xinyi Dist., Taipei',

    // ----- footer -----
    pvFootCopyright: '© 2026 RegMaster · GuangTian International Co., Ltd.',
    pvFootPrivacy: 'Privacy Policy',
    pvFootTerms: 'Terms of Service',
    pvFootContact: 'Contact Us'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
