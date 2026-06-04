// =============================================================================
// RegMaster · I18N (shared/i18n-terms.js)
// =============================================================================
// Page-scoped translations for public/terms.html. Registers into the shared
// window.I18N dictionary built by /shared/i18n.js. All new keys are prefixed
// with "tm". Footer keys (ftPrivacy/ftTerms/ftContact/ftCopyright/ftCompliance)
// and nav keys are reused from i18n.js and NOT redefined here.
//
// NOTE: The English text is a machine-generated legal translation provided for
// convenience only. It must be reviewed by qualified counsel before reliance;
// the Traditional-Chinese text remains the authoritative version.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- <title> / meta -----
    tmPageTitle: '服務條款 · RegMaster',
    tmMetaDesc: 'RegMaster 線上活動報名平台（廣天國際有限公司產品）服務條款：會員資格、使用規範、權利義務、免責聲明與準據法。',

    // ----- hero -----
    tmHeroTitle: '服務條款',
    tmHeroSub: 'RegMaster 線上活動報名平台 · 廣天國際有限公司（Kuang-Tien International Co., Ltd.）產品<br>最後更新日期：2026 年 6 月 1 日',

    // ----- preamble -----
    tmIntro: 'RegMaster（以下簡稱「本平台」）為廣天國際有限公司（以下簡稱「本公司」）所開發及營運之線上活動報名管理服務。當您註冊帳號或使用本平台之任何服務時，即表示您已詳閱、瞭解並同意遵守本服務條款之所有內容。若您不同意本條款，請勿使用本平台。',
    tmNoteAmend: '本公司保留隨時修訂本服務條款之權利，修訂後之條款將於本平台公告後生效。您於條款修訂生效後繼續使用本平台，視為同意修訂後之條款。',

    // ----- 第一條 會員資格 -----
    tmH1: '第一條　會員資格',
    tmC1_1: '使用者須完成註冊程序、取得帳號後，方得成為本平台會員並使用主辦方相關服務。',
    tmC1_2: '本公司保留審核會員申請之權利，並得於使用者違反本條款或相關法令時，解除其會員資格。',

    // ----- 第二條 隱私權保護 -----
    tmH2: '第二條　隱私權保護',
    tmC2: '本公司依<a href="/privacy.html" style="color:var(--acc)">隱私權政策</a>之內容，保護您的個人資料。該政策為本條款之一部分。',

    // ----- 第三條 帳號安全與會員責任 -----
    tmH3: '第三條　帳號安全與會員責任',
    tmC3_1: '會員應妥善保管自己的帳號與密碼，並建議啟用兩步驟驗證（2FA）以提升安全性。',
    tmC3_2: '凡使用該帳號及密碼登入後所進行之一切行為，均視為會員本人之行為，會員應自負完全責任。',
    tmC3_3: '如發現帳號遭他人盜用，應立即通知本公司並辦理掛失或變更密碼。',

    // ----- 第四條 登錄資料之真實性 -----
    tmH4: '第四條　登錄資料之真實性',
    tmC4: '會員應提供真實、正確、最新且完整之資料。若提供不實資料，或資料變更而未即時更新，本公司得暫停或終止其使用本平台之權利。',

    // ----- 第五條 使用行為規範 -----
    tmH5: '第五條　使用行為規範',
    tmC5_1: '會員不得利用本平台從事任何違反中華民國法令、公共秩序或善良風俗之行為。',
    tmC5_2: '會員透過本平台所建立、刊登或發布之活動內容，應自行確保其合法性與正當性，不得侵害他人權益或發布不實、誇大、詐欺性之內容。',
    tmC5_3: '會員不得以任何方式干擾、破壞本平台之正常運作，或試圖未經授權存取本平台系統與其他使用者資料。',

    // ----- 第六條 活動內容之責任 -----
    tmH6: '第六條　活動內容之責任',
    tmC6: '本公司僅提供技術平台服務，對於會員透過本平台所建立、發布或執行之任何活動，不為任何形式之背書、認可、保證或推薦。會員就其活動之合法性、收費、退費、履行及一切內容，應自負完全法律責任；因活動內容所生之任何爭議、損害或法律責任，概由該會員（主辦方）負責，與本公司無涉。',

    // ----- 第七條 付款、撥款與退費 -----
    tmH7: '第七條　付款、撥款與退費',
    tmC7_1: '主辦方啟用之線上付款（PayUNI）由本平台代收，扣除約定之金流手續費後，依平台公告之撥款週期匯入主辦方之收款帳戶。銀行/ATM 轉帳由報名者直接匯入主辦方帳戶，本平台不經手。',
    tmC7_2: '各活動之報名費退費，依該活動主辦方所公告之退費政策辦理，與本公司無涉。',
    tmC7_3: '主辦方方案費用之計費與升級差額，依購買當時本平台公告之方案價格與規則計算。',

    // ----- 第八條 智慧財產權 -----
    tmH8: '第八條　智慧財產權',
    tmC8: '本平台之所有智慧財產權（包括但不限於軟體程式碼、介面設計、商標、圖示與文案）均歸本公司所有。未經本公司事前書面同意，會員不得重製、改作、散布或為其他侵害智慧財產權之行為。會員上傳之內容，其權利仍歸會員所有，惟會員授權本公司於提供服務之必要範圍內使用。',

    // ----- 第九條 免責聲明 -----
    tmH9: '第九條　免責聲明',
    tmC9_1: '本平台係依「現況」（as-is）提供，本公司不就其適售性、特定目的適用性、正確性或不中斷為任何明示或默示之擔保。',
    tmC9_2: '因系統維護、不可抗力或本公司無法合理控制之因素所致之服務中斷或資料毀損，本公司不負賠償責任；會員應自行備份重要資料。',
    tmC9_3: '在法律許可之最大範圍內，本公司就因使用或無法使用本平台所生之任何間接、附帶、特殊或衍生性損害，不負賠償責任。',

    // ----- 第十條 服務終止 -----
    tmH10: '第十條　服務終止',
    tmC10_1: '會員得隨時停止使用本平台或刪除帳號。',
    tmC10_2: '會員違反本條款或相關法令時，本公司得不經催告逕行暫停或終止其使用授權，且會員不得請求退費。',
    tmC10_3: '服務終止後，會員已建立之活動資料將保留九十日，屆期後本公司得逕行刪除。',

    // ----- 第十一條 條款修訂 -----
    tmH11: '第十一條　條款修訂',
    tmC11: '本公司保留隨時修訂本服務條款之權利。修訂後之條款將於本平台公告後生效。',

    // ----- 第十二條 準據法與管轄 -----
    tmH12: '第十二條　準據法與管轄',
    tmC12: '本條款之解釋與適用，以中華民國法律為準據法。因本條款所生之一切爭議，雙方合意以臺灣臺北地方法院為第一審管轄法院。',

    // ----- closing note -----
    tmNoteAddr: '廣天國際有限公司 Kuang-Tien International Co., Ltd.<br>地址：台北市信義區基隆路二段 115 號 7 樓之 3'
  };

  var E = {
    // ----- <title> / meta -----
    tmPageTitle: 'Terms of Service · RegMaster',
    tmMetaDesc: 'Terms of Service for the RegMaster online event registration platform (a product of GuangTian International Co., Ltd.): membership eligibility, rules of use, rights and obligations, disclaimers, and governing law.',

    // ----- hero -----
    tmHeroTitle: 'Terms of Service',
    tmHeroSub: 'RegMaster Online Event Registration Platform · A product of GuangTian International Co., Ltd. (Kuang-Tien International Co., Ltd.)<br>Last updated: 1 June 2026',

    // ----- preamble -----
    tmIntro: 'RegMaster (hereinafter the "Service" or "the Platform") is an online event registration and management service developed and operated by GuangTian International Co., Ltd. (hereinafter the "Company"). By registering an account or using any part of the Service, you represent that you have read, understood, and agree to be bound by all provisions of these Terms of Service. If you do not agree to these Terms, you shall not use the Service.',
    tmNoteAmend: 'The Company reserves the right to amend these Terms of Service at any time, and any amended Terms shall take effect upon being posted on the Platform. Your continued use of the Platform after the amended Terms take effect shall be deemed your acceptance of the amended Terms.',

    // ----- Article 1 Membership Eligibility -----
    tmH1: 'Article 1　Membership Eligibility',
    tmC1_1: 'A user shall become a member of the Platform, and may use the organizer-related services, only after completing the registration procedure and obtaining an account.',
    tmC1_2: 'The Company reserves the right to review applications for membership, and may terminate a user\'s membership where the user breaches these Terms or any applicable laws or regulations.',

    // ----- Article 2 Privacy Protection -----
    tmH2: 'Article 2　Privacy Protection',
    tmC2: 'The Company shall protect your personal data in accordance with its <a href="/privacy.html" style="color:var(--acc)">Privacy Policy</a>, which forms an integral part of these Terms.',

    // ----- Article 3 Account Security and Member Responsibilities -----
    tmH3: 'Article 3　Account Security and Member Responsibilities',
    tmC3_1: 'A member shall safeguard their own account and password, and is advised to enable two-step verification (2FA) to enhance security.',
    tmC3_2: 'Any and all acts carried out following a login using such account and password shall be deemed the acts of the member, and the member shall bear sole and complete responsibility therefor.',
    tmC3_3: 'Upon discovering that an account has been misappropriated by another person, the member shall immediately notify the Company and proceed to report the loss or change the password.',

    // ----- Article 4 Accuracy of Registration Information -----
    tmH4: 'Article 4　Accuracy of Registration Information',
    tmC4: 'A member shall provide information that is true, accurate, current, and complete. Where a member provides false information, or fails to update information promptly upon any change, the Company may suspend or terminate the member\'s right to use the Platform.',

    // ----- Article 5 Rules of Conduct -----
    tmH5: 'Article 5　Rules of Conduct',
    tmC5_1: 'A member shall not use the Platform to engage in any conduct that violates the laws and regulations of the Republic of China, public order, or good morals.',
    tmC5_2: 'A member shall ensure, on its own account, the legality and propriety of any event content created, posted, or published through the Platform, and shall not infringe the rights or interests of others or publish any content that is false, exaggerated, or fraudulent.',
    tmC5_3: 'A member shall not, by any means, interfere with or disrupt the normal operation of the Platform, or attempt to gain unauthorized access to the Platform\'s systems or to the data of other users.',

    // ----- Article 6 Responsibility for Event Content -----
    tmH6: 'Article 6　Responsibility for Event Content',
    tmC6: 'The Company provides only the technical platform service and does not endorse, approve, warrant, or recommend, in any form, any event created, published, or carried out by a member through the Platform. The member shall bear sole and complete legal responsibility for the legality, fees, refunds, performance, and all content of its event; any dispute, damage, or legal liability arising out of the event content shall be borne entirely by that member (the organizer) and shall be of no concern to the Company.',

    // ----- Article 7 Payment, Disbursement, and Refunds -----
    tmH7: 'Article 7　Payment, Disbursement, and Refunds',
    tmC7_1: 'Online payments (PayUNI) enabled by an organizer shall be collected by the Platform on the organizer\'s behalf and, after deduction of the agreed payment-processing fees, remitted to the organizer\'s designated receiving account in accordance with the disbursement cycle published by the Platform. Bank/ATM transfers shall be remitted by the registrant directly into the organizer\'s account, and the Platform shall not handle such funds.',
    tmC7_2: 'The refund of registration fees for each event shall be handled in accordance with the refund policy published by that event\'s organizer, and shall be of no concern to the Company.',
    tmC7_3: 'The billing of an organizer\'s plan fees and any upgrade price differential shall be calculated in accordance with the plan prices and rules published by the Platform at the time of purchase.',

    // ----- Article 8 Intellectual Property Rights -----
    tmH8: 'Article 8　Intellectual Property Rights',
    tmC8: 'All intellectual property rights in the Platform (including without limitation the software code, interface design, trademarks, icons, and copy) belong to the Company. Without the Company\'s prior written consent, a member shall not reproduce, adapt, distribute, or otherwise infringe such intellectual property rights. Title to content uploaded by a member shall remain with the member; provided, however, that the member hereby grants the Company a license to use such content to the extent necessary for the provision of the Service.',

    // ----- Article 9 Disclaimer -----
    tmH9: 'Article 9　Disclaimer',
    tmC9_1: 'The Platform is provided on an "as-is" basis, and the Company makes no warranty, whether express or implied, as to its merchantability, fitness for a particular purpose, accuracy, or uninterrupted operation.',
    tmC9_2: 'The Company shall not be liable for any service interruption or data corruption caused by system maintenance, force majeure, or factors beyond the Company\'s reasonable control; members shall back up their important data on their own account.',
    tmC9_3: 'To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, or consequential damages arising out of the use of, or the inability to use, the Platform.',

    // ----- Article 10 Termination of Service -----
    tmH10: 'Article 10　Termination of Service',
    tmC10_1: 'A member may cease using the Platform or delete their account at any time.',
    tmC10_2: 'Where a member breaches these Terms or any applicable laws or regulations, the Company may, without prior notice, suspend or terminate the member\'s license to use the Service, and the member shall not be entitled to claim any refund.',
    tmC10_3: 'Following termination of the Service, the event data created by the member shall be retained for ninety (90) days, after the expiry of which the Company may delete it without further notice.',

    // ----- Article 11 Amendment of Terms -----
    tmH11: 'Article 11　Amendment of Terms',
    tmC11: 'The Company reserves the right to amend these Terms of Service at any time. Any amended Terms shall take effect upon being posted on the Platform.',

    // ----- Article 12 Governing Law and Jurisdiction -----
    tmH12: 'Article 12　Governing Law and Jurisdiction',
    tmC12: 'The interpretation and application of these Terms shall be governed by the laws of the Republic of China. The parties agree that the Taiwan Taipei District Court shall be the court of first instance with jurisdiction over any and all disputes arising out of these Terms.',

    // ----- closing note -----
    tmNoteAddr: 'GuangTian International Co., Ltd. (Kuang-Tien International Co., Ltd.)<br>Address: 7F-3, No. 115, Sec. 2, Keelung Rd., Xinyi Dist., Taipei'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
