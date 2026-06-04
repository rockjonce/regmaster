// =============================================================================
// RegMaster · I18N (shared/i18n-eula.js)
// =============================================================================
// Page-scoped translations for public/EULA.html (Software End-User License
// Agreement). Registers into the shared window.I18N dictionary built by
// /shared/i18n.js. All new keys are prefixed with "eu". Nav/footer/shared keys
// are reused from i18n.js and NOT redefined here.
//
// NOTE: The English text is a machine-generated legal translation provided for
// convenience only. It MUST be reviewed by qualified legal counsel before being
// relied upon. The Traditional-Chinese text is the controlling original.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document heading -----
    euH2: 'RegMaster 線上報名平台 軟體使用授權條款',
    euSubtitle: 'Software End-User License Agreement (EULA)<br>最後更新日期：2026 年 1 月 1 日',

    // ----- Article 1: Definitions -----
    euA1H: '第一條　定義',
    euA1P: '本條款所稱「本平台」，係指由廣天國際有限公司（Kuang-Tien International Co., Ltd.，以下簡稱「本公司」）開發及營運之 RegMaster 線上報名平台軟體服務。「使用者」係指透過授權碼啟用本平台服務之活動管理者。「授權碼」係指本公司核發之數位憑證，用以啟用本平台之特定使用權限。',

    // ----- Article 2: Scope of License -----
    euA2H: '第二條　授權範圍',
    euA2L1: '本公司依本條款授予使用者非專屬、不可轉讓、不可再授權之有限使用權，使用者得依所啟用之授權類型使用本平台。',
    euA2L2: '<b>次數型授權</b>：使用者得於授權次數範圍內建立活動，每建立一項活動即扣除一次授權額度，額度用罄後須另行取得授權方得繼續使用。',
    euA2L3: '<b>訂閱型授權</b>：使用者得於授權期間內不限次數建立活動，授權期間自使用者啟用授權碼之日起算。',

    // ----- Article 3: User Obligations and Restrictions -----
    euA3H: '第三條　使用者義務與限制',
    euA3L1: '使用者不得將授權碼轉讓、出售、出借、公開分享或以任何方式提供予第三人使用。',
    euA3L2: '使用者不得對本平台進行反向工程、反組譯、反編譯或以其他方式嘗試取得原始碼。',
    euA3L3: '使用者不得利用本平台從事任何違反中華民國法律或其他適用法域法令之行為。',
    euA3L4: '使用者應確保其帳號及授權碼之安全，因使用者保管不當所生之損害，本公司不負賠償責任。',

    // ----- Article 4: Activity Content (special clause) -----
    euA4H: '第四條　活動內容規範（特別條款）',
    euA4P: '使用者透過本平台所建立之一切活動，其內容及形式應符合中華民國法令規定，並不得違反公共秩序或善良風俗。使用者就其所建立活動之合法性、正當性及一切內容，應自負完全法律責任。本公司僅提供技術平台服務，對於使用者透過本平台所建立、刊登、發布或執行之任何活動，不為任何形式之背書、認可、保證或推薦。本公司就使用者活動內容所生之任何爭議、損害或法律責任，概不負責。',

    // ----- Article 5: Intellectual Property -----
    euA5H: '第五條　智慧財產權',
    euA5P: '本平台之所有智慧財產權（包括但不限於軟體程式碼、介面設計、商標、圖示）均歸屬本公司所有。本條款之授權不構成任何智慧財產權之移轉或讓與。',

    // ----- Article 6: Disclaimer of Warranty -----
    euA6H: '第六條　免責聲明',
    euA6L1: '本平台係依「現況」（as-is）提供，本公司不就本平台之適售性、特定目的之適用性、正確性、完整性或不侵權為任何明示或默示之擔保。',
    euA6L2: '本公司不保證本平台之運作不會中斷或完全無錯誤。因系統維護、不可抗力事件或其他本公司無法合理控制之因素所致之服務中斷，本公司不負賠償責任。',
    euA6L3: '在法律許可之最大範圍內，本公司就因使用或無法使用本平台所生之任何直接、間接、附帶、特殊或衍生損害，不負賠償責任。',

    // ----- Article 7: Personal Data Protection -----
    euA7H: '第七條　個人資料保護',
    euA7P: '使用者因使用本平台而蒐集、處理或利用之個人資料，應自行遵守個人資料保護法及相關法令之規定。本公司僅於提供本平台服務之必要範圍內處理資料，不另為目的外之利用。',

    // ----- Article 8: Termination -----
    euA8H: '第八條　授權終止',
    euA8L1: '使用者違反本條款任一規定時，本公司得不經催告逕行終止其授權，且使用者不得請求退費。',
    euA8L2: '次數型授權於使用次數用罄時自動終止；訂閱型授權於授權期間屆滿時自動終止。',
    euA8L3: '授權終止後，使用者已建立之活動資料將保留九十日，届期後本公司得逕行刪除。',

    // ----- Article 9: Amendments -----
    euA9H: '第九條　條款修訂',
    euA9P: '本公司保留隨時修訂本條款之權利。修訂後之條款將於本平台公告後生效。使用者於修訂條款生效後繼續使用本平台者，視為同意修訂後之條款。',

    // ----- Article 10: Governing Law and Jurisdiction -----
    euA10H: '第十條　準據法與管轄',
    euA10P: '本條款之解釋與適用，以中華民國法律為準據法。因本條款所生之一切爭議，雙方合意以臺灣臺北地方法院為第一審管轄法院。',

    // ----- legal footer block -----
    euLegal: '<b>Kuang-Tien International Co., Ltd. 廣天國際有限公司</b><br>Copyright © 2026 All rights reserved.<br>本條款自使用者點擊「同意」時起生效。'
  };

  var E = {
    // ----- document heading -----
    euH2: 'RegMaster Online Registration Platform — Software License Agreement',
    euSubtitle: 'Software End-User License Agreement (EULA)<br>Last updated: 1 January 2026',

    // ----- Article 1: Definitions -----
    euA1H: 'Article 1　Definitions',
    euA1P: 'In this Agreement, the "Platform" means the RegMaster online registration platform software service developed and operated by Kuang-Tien International Co., Ltd. (hereinafter the "Company"). "User" means the event administrator who activates the Platform service by means of a License Key. "License Key" means the digital credential issued by the Company for the purpose of activating specified usage rights in the Platform.',

    // ----- Article 2: Scope of License -----
    euA2H: 'Article 2　Scope of License',
    euA2L1: 'Subject to this Agreement, the Company grants the User a limited, non-exclusive, non-transferable and non-sublicensable license to use the Platform in accordance with the type of license activated.',
    euA2L2: '<b>Usage-based License</b>: The User may create events up to the number of authorized uses; each event created deducts one unit from the license allowance, and upon exhaustion of the allowance the User must obtain a further license in order to continue use.',
    euA2L3: '<b>Subscription License</b>: The User may create an unlimited number of events during the license term, such term commencing on the date on which the User activates the License Key.',

    // ----- Article 3: User Obligations and Restrictions -----
    euA3H: 'Article 3　User Obligations and Restrictions',
    euA3L1: 'The User shall not transfer, sell, lend, publicly share or otherwise make the License Key available for use by any third party.',
    euA3L2: 'The User shall not reverse engineer, disassemble, decompile or otherwise attempt to derive the source code of the Platform.',
    euA3L3: 'The User shall not use the Platform to engage in any act that violates the laws of the Republic of China (Taiwan) or the laws of any other applicable jurisdiction.',
    euA3L4: 'The User shall ensure the security of its account and License Key; the Company shall not be liable for any loss arising from the User\'s improper safekeeping thereof.',

    // ----- Article 4: Activity Content (special clause) -----
    euA4H: 'Article 4　Event Content Requirements (Special Provision)',
    euA4P: 'All events created by the User through the Platform shall, in both content and form, comply with the laws and regulations of the Republic of China (Taiwan) and shall not contravene public order or good morals. The User shall bear sole and complete legal responsibility for the legality, propriety and entire content of the events it creates. The Company provides only the technical platform service and does not in any manner endorse, approve, warrant or recommend any event created, posted, published or conducted by the User through the Platform. The Company shall not be liable for any dispute, damage or legal liability arising out of the content of the User\'s events.',

    // ----- Article 5: Intellectual Property -----
    euA5H: 'Article 5　Intellectual Property',
    euA5P: 'All intellectual property rights in the Platform (including, without limitation, the software source code, interface design, trademarks and icons) are owned by the Company. The license granted under this Agreement does not constitute any transfer or assignment of any intellectual property rights.',

    // ----- Article 6: Disclaimer of Warranty -----
    euA6H: 'Article 6　Disclaimer of Warranty',
    euA6L1: 'The Platform is provided on an "AS IS" basis, and the Company makes no warranty, express or implied, as to the merchantability, fitness for a particular purpose, accuracy, completeness or non-infringement of the Platform.',
    euA6L2: 'The Company does not warrant that the operation of the Platform will be uninterrupted or wholly error-free. The Company shall not be liable for any service interruption caused by system maintenance, force majeure events or other factors beyond the Company\'s reasonable control.',
    euA6L3: 'To the maximum extent permitted by law, the Company shall not be liable for any direct, indirect, incidental, special or consequential damages arising out of the use of, or the inability to use, the Platform.',

    // ----- Article 7: Personal Data Protection -----
    euA7H: 'Article 7　Personal Data Protection',
    euA7P: 'The User shall, with respect to any personal data it collects, processes or uses in connection with its use of the Platform, comply on its own account with the Personal Data Protection Act and related laws and regulations. The Company processes data only to the extent necessary to provide the Platform service and shall not use such data for any purpose beyond that scope.',

    // ----- Article 8: Termination -----
    euA8H: 'Article 8　Termination of License',
    euA8L1: 'Where the User breaches any provision of this Agreement, the Company may terminate the User\'s license forthwith without prior notice, and the User shall have no right to claim any refund.',
    euA8L2: 'A Usage-based License terminates automatically upon exhaustion of the authorized number of uses; a Subscription License terminates automatically upon expiry of the license term.',
    euA8L3: 'Following termination of the license, the event data already created by the User shall be retained for ninety (90) days, after which the Company may delete it forthwith.',

    // ----- Article 9: Amendments -----
    euA9H: 'Article 9　Amendment of Terms',
    euA9P: 'The Company reserves the right to amend this Agreement at any time. The amended terms shall take effect upon publication on the Platform. A User who continues to use the Platform after the amended terms take effect shall be deemed to have agreed to the amended terms.',

    // ----- Article 10: Governing Law and Jurisdiction -----
    euA10H: 'Article 10　Governing Law and Jurisdiction',
    euA10P: 'The interpretation and application of this Agreement shall be governed by the laws of the Republic of China (Taiwan). The parties agree that the Taiwan Taipei District Court shall be the court of first instance with jurisdiction over any and all disputes arising out of this Agreement.',

    // ----- legal footer block -----
    euLegal: '<b>Kuang-Tien International Co., Ltd. 廣天國際有限公司</b><br>Copyright © 2026 All rights reserved.<br>This Agreement takes effect upon the User\'s clicking "Agree".'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
