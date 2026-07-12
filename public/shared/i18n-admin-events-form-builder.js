// =============================================================================
// RegMaster · I18N page pack — Admin / Form Builder (admin/events/form-builder.html)
// =============================================================================
// Page-scoped zh/en strings for the drag-drop registration form builder.
// Loaded immediately after /shared/i18n.js. All new keys are prefixed `aeForm`.
//
// IMPORTANT — schema safety: this pack ONLY covers the builder's own UI chrome
// (palette field-TYPE display labels, section/category headings, inspector
// labels, buttons, helper/validation/confirm text). It does NOT touch any
// persisted form-schema VALUES (field keys/labels/options the organiser saves),
// the internal field `type` identifiers, or the `data-legacy` schema keys.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / top bar -----
    aeFormDocTitle: '表單設計 · 主辦後台 · RegMaster',
    aeFormCrumbHome: '主辦後台',
    aeFormCrumbEvents: '活動',
    aeFormCrumbHere: '表單設計',
    aeFormSaveMetaIdle: '尚未變更',
    aeFormPreviewBtn: '預覽 →',
    aeFormSaveBtn: '儲存',
    aeFormLoading: '載入表單設計⋯',

    // ----- side rail titles -----
    aeFormNavHub: '活動總覽',
    aeFormNavEdit: '活動設定',
    aeFormNavForm: '表單設計',

    // ----- palette: general fields -----
    aeFormPaletteGeneralH: '通用欄位',
    aeFormPaletteGeneralSub: '主辦方可自由增加的欄位',
    aeFormPaletteSpecialH: '特殊欄位',
    aeFormPaletteSpecialSub: '內建驗證與選項的常用欄位 · 點分類標題展開/收合',

    // ----- palette: generic field-TYPE display labels + descriptions -----
    aeFormFtText: '單行文字',
    aeFormFtTextDesc: '短文字',
    aeFormFtTextarea: '多行文字',
    aeFormFtTextareaDesc: '自我介紹',
    aeFormFtSelect: '下拉選單',
    aeFormFtSelectDesc: '多選一',
    aeFormFtRadio: '單選',
    aeFormFtRadioDesc: '視覺化',
    aeFormFtCheckbox: '複選',
    aeFormFtCheckboxDesc: '多選',
    aeFormFtDate: '日期',
    aeFormFtDateDesc: '生日 / 截止',
    aeFormFtNumber: '數字',
    aeFormFtNumberDesc: '年齡 / 數量',
    aeFormFtFile: '上傳檔案',
    aeFormFtFileDesc: '附件 / 作品',
    aeFormFtUrl: '網址',
    aeFormFtContentText: '文字內容',
    aeFormFtContentTextDesc: '純文字資訊',
    aeFormFtContentImage: '圖片內容',
    aeFormFtContentImageDesc: '顯示圖片資訊',
    aeFormInsContentText: '顯示文字',
    aeFormInsContentTextPh: '輸入要顯示給報名者的文字…',
    aeFormInsContentImg: '圖片',
    aeFormInsContentImgBtn: '圖片上傳',
    aeFormInsContentImgBusy: '上傳中…',
    aeFormInsContentImgHint: '建議 JPG / PNG；超過 500KB 或 1200px 會自動壓縮',
    aeFormInsContentImgLoading: '載入圖片…',
    aeFormInsContentImgFail: '圖片上傳失敗',
    aeFormContentTextEmpty: '（尚未輸入文字）',
    aeFormContentImgSet: '已設定圖片',
    aeFormContentImgEmpty: '（尚未上傳圖片）',
    aeFormInsContentImgDel: '刪除圖片',
    aeFormInsContentImgDelConfirm: '確定要刪除這張圖片嗎？此動作無法復原。',

    // ----- palette: special-field category headings -----
    aeFormCatBasic: '基本欄位',
    aeFormCatEdu: '學籍 / 單位',
    aeFormCatIdentity: '身分 / 國籍',
    aeFormCatContact: '聯絡 / 地址',
    aeFormCatEmergency: '緊急聯絡',
    aeFormCatHealth: '餐飲 / 醫療',
    aeFormCatInvoice: '發票相關',
    aeFormCatGuardian: '監護人 / 同意',
    aeFormCatOther: '其他',

    // ----- palette: special-field display names (palette chrome only) -----
    aeFormSpSalutation: '尊稱',
    aeFormSpChineseName: '中文姓名',
    aeFormSpEnglishName: '英文姓名',
    aeFormSpGender: '性別',
    aeFormSpBirthday: '生日',
    aeFormSpEmail: 'Email',
    aeFormSpPhone: '電話',
    aeFormSpMobileIntl: '手機號碼(含國碼)',
    aeFormSpEduLevel: '教育階段',
    aeFormSpStudentId: '學號',
    aeFormSpSchool: '學校',
    aeFormSpDepartment: '系所/科系',
    aeFormSpGrade: '年級',
    aeFormSpClassroom: '班級',
    aeFormSpOrganization: '服務單位',
    aeFormSpJobTitle: '職稱',
    aeFormSpIdNumber: '身分證',
    aeFormSpPassport: '護照號碼',
    aeFormSpPassportIssue: '護照發照日期',
    aeFormSpPassportExpiry: '護照截止日期',
    aeFormSpNationality: '國籍',
    aeFormSpBirthplace: '出生地',
    aeFormSpCity: '居住縣市',
    aeFormSpPostalCode: '郵遞區號',
    aeFormSpAddress: '地址',
    aeFormSpLineId: 'LINE ID',
    aeFormSpEmergencyName: '緊急聯絡人',
    aeFormSpEmergencyPhone: '緊急聯絡電話',
    aeFormSpEmergencyRelation: '緊急聯絡關係',
    aeFormSpAccessibility: '特殊需求/無障礙',
    aeFormSpDietary: '飲食',
    aeFormSpDietaryRestriction: '飲食限制/過敏',
    aeFormSpTshirt: 'T-shirt',
    aeFormSpBloodType: '血型',
    aeFormSpHealthNote: '特殊健康狀況',
    aeFormSpInvoiceType: '發票類型',
    aeFormSpInvoiceTitle: '發票抬頭',
    aeFormSpTaxId: '統一編號',
    aeFormSpGuardianName: '監護人姓名',
    aeFormSpGuardianPhone: '監護人電話',
    aeFormSpGuardianConsent: '家長同意',
    aeFormSpConsent: '條款/肖像權同意',
    aeFormSpWebsite: '網站',
    aeFormSpReferralSource: '如何得知本活動',
    aeFormSpTransportation: '交通方式',
    aeFormSpAccommodation: '住宿需求',

    // ----- default field LABEL values for special palette items whose default
    //       wording differs from the palette display name (labelForLegacy) -----
    aeFormDefDietary: '飲食習慣',
    aeFormDefTshirt: 'T-shirt 尺寸',

    // ----- canvas -----
    aeFormCanvasTitle: '報名表預覽',
    aeFormCanvasSub: '從左側拖曳欄位類型到此處，或點擊區塊內的「＋ 新增欄位」',
    aeFormAddSection: '新增區塊',
    aeFormNoSections: '尚無區塊。請點下方「新增區塊」開始。',
    aeFormDropHere: '拖曳左側欄位到此區塊',
    aeFormAddField: '新增欄位',
    aeFormSecTitlePh: '區塊標題',

    // ----- canvas: section action button titles -----
    aeFormSecUp: '上移',
    aeFormSecDown: '下移',
    aeFormSecDup: '複製區塊',
    aeFormSecDel: '刪除',

    // ----- canvas: role tags -----
    aeFormRoleStudent: '報名者',
    aeFormRoleTeacher: '指導者',
    aeFormRoleCustom: '附加問題',
    aeFormRoleFallback: '自訂',

    // ----- canvas: field preview -----
    aeFormFieldUnnamed: '(未命名)',
    aeFormOptUnit: '個選項',

    // ----- inspector -----
    aeFormInsEmpty: '點擊任一欄位查看設定',
    aeFormInsType: '欄位類型',
    aeFormInsTypeLocked: '已有報名，既有欄位型別已鎖定',
    aeFormInsLabel: '標籤文字',
    aeFormInsHelp: '說明文字（可選）',
    aeFormInsHelpPh: '顯示在欄位下方（可用 <a> <b> <br> 等簡單標籤）',
    aeFormInsOptions: '選項',
    aeFormInsAddOpt: '＋ 新增選項',
    aeFormInsReqH: '必填',
    aeFormInsReqP: '送出表單時必須填寫',

    // ----- inspector: file constraints -----
    aeFormFileMax: '檔案大小上限 (MB)',
    aeFormFileTypes: '允許檔案類型（可複選）',
    aeFormFileCustomPh: '自訂副檔名（用逗號分隔，例：.dwg,.psd）',
    aeFormFileHint: '留空 = 不限制；報名者上傳時會即時驗證。',

    // ----- inspector: built-in validation badge -----
    aeFormValTitle: '系統內建驗證',
    aeFormValEnforced: '此驗證由系統強制執行，無法關閉。',
    aeFormValHintIdNumber: '✓ 自動驗證：中華民國身分證 / 居留證字號（首字英文 + 9 碼，含 checksum）',
    aeFormValHintEmail: '✓ 自動驗證：Email 格式（user@domain.tld）',
    aeFormValHintPhone: '✓ 自動驗證：台灣電話／行動電話格式（0開頭、9~10 碼）',
    aeFormValHintMobilePhone: '✓ 自動驗證：國碼 + 純數字（去除前置 0）',
    aeFormValHintEmergencyPhone: '✓ 自動驗證：台灣電話／行動電話格式',
    aeFormValHintTaxId: '✓ 自動驗證：統一編號（8 碼，含 checksum）',
    aeFormValHintPostalCode: '✓ 自動驗證：台灣郵遞區號（3 或 5 碼）',
    aeFormValHintBirthday: '✓ 自動驗證：日期格式 + 不可為未來',
    aeFormValHintPassport: '✓ 自動驗證：護照號碼長度（6–9 碼，英數）',
    aeFormValHintPassportIssue: '✓ 自動驗證：日期格式 + 不可為未來',
    aeFormValHintPassportExpiry: '✓ 自動驗證：日期格式 + 須晚於今日',
    aeFormValHintWebsite: '✓ 自動驗證：網址格式（未填 http(s):// 會自動補上 https://）',

    // ----- inspector: condition logic editor -----
    aeFormCondTitle: '顯示條件（進階）',
    aeFormCondAlways: '一律顯示',
    aeFormCondWhen: '符合條件才顯示',
    aeFormCondFieldLead: '當此區塊的欄位：',
    aeFormCondValuePh: '比對的值（例：男 / 18）',
    aeFormCondNeedOther: '此區塊需有其他欄位才能設定條件',
    aeFormCondOpGt: '大於',
    aeFormCondOpEq: '等於',
    aeFormCondOpLt: '小於',
    aeFormCondOpNeq: '不等於',

    // ----- add-section modal -----
    aeFormAsTitle: '新增區塊',
    aeFormAsTypeLbl: '區塊類型',
    aeFormAsOptStudent: '報名者（可新增多個 → 每個代表一位報名者）',
    aeFormAsOptTeacher: '指導者（可新增多個 → 每個代表一位指導者）',
    aeFormAsOptCustom: '附加問題（限一個）',
    aeFormAsOptCustomExists: '附加問題（已存在，僅允許一個）',
    aeFormAsTitleLbl: '區塊標題',
    aeFormAsCancel: '取消',
    aeFormAsOk: '建立',

    // ----- default VALUES created at insert time (new field / section) -----
    aeFormDefaultFieldLabel: '新欄位',
    aeFormDefaultSectionBase: '區塊',
    aeFormDefaultTitleStudent: '報名者資料',

    // ----- save / status (dynamic) -----
    aeFormSaving: '儲存中⋯',
    aeFormDirty: '有未儲存變更',
    aeFormSaved: '已儲存',
    aeFormSavedSyncPre: '✓ 已儲存（同步舊欄位 ',
    aeFormSavedSyncMid: ' 報名者 + ',
    aeFormSavedSyncSuf: ' 附加問題）',
    aeFormSavedOk: '✓ 已儲存',

    // ----- lock banner / messages (dynamic) -----
    aeFormLockBannerPre: '🔒 <b>此活動已有 ',
    aeFormLockBannerSuf: ' 筆報名</b>，為維持資料一致性，已鎖定結構性變更：<b>不可刪除既有欄位、變更欄位型別、新增或刪除區塊</b>。仍可：新增欄位（預設為選填）、修改標籤/說明、增加選項、調整順序。',
    aeFormLockedMsg: '此活動已有報名，為維持資料一致性，無法執行此變更（刪除既有欄位／變更型別／增刪區塊）。您仍可新增選填欄位、修改標籤與選項。',

    // ----- confirm / alert (dynamic) -----
    aeFormConfirmDelSecMsg: '刪除整個區塊？',
    aeFormConfirmDelSecTitle: '刪除區塊',
    aeFormConfirmDelSecOk: '刪除',
    aeFormNeedSectionFirst: '請先新增區塊，再加入欄位',
    aeFormCustomOnlyOne: '附加問題區塊只能有一個。請編輯既有的「附加問題」區塊新增題目。',

    // ----- errors (dynamic) -----
    aeFormNoCompId: '未指定活動編號',
    aeFormLoadFailPre: '無法載入：',
    aeFormUnknownErr: '未知錯誤',
    aeFormLoadFailedPre: '載入失敗：',
    aeFormSaveFailPre: '儲存失敗：'
  };

  var E = {
    // ----- document / top bar -----
    aeFormDocTitle: 'Form Builder · Organizer Console · RegMaster',
    aeFormCrumbHome: 'Organizer Console',
    aeFormCrumbEvents: 'Events',
    aeFormCrumbHere: 'Form Builder',
    aeFormSaveMetaIdle: 'No changes yet',
    aeFormPreviewBtn: 'Preview →',
    aeFormSaveBtn: 'Save',
    aeFormLoading: 'Loading form builder…',

    // ----- side rail titles -----
    aeFormNavHub: 'Event Overview',
    aeFormNavEdit: 'Event Settings',
    aeFormNavForm: 'Form Builder',

    // ----- palette: general fields -----
    aeFormPaletteGeneralH: 'General Fields',
    aeFormPaletteGeneralSub: 'Fields the organizer can add freely',
    aeFormPaletteSpecialH: 'Special Fields',
    aeFormPaletteSpecialSub: 'Common fields with built-in validation & options · click a category title to expand/collapse',

    // ----- palette: generic field-TYPE display labels + descriptions -----
    aeFormFtText: 'Single-line Text',
    aeFormFtTextDesc: 'Short text',
    aeFormFtTextarea: 'Multi-line Text',
    aeFormFtTextareaDesc: 'Introduction',
    aeFormFtSelect: 'Dropdown',
    aeFormFtSelectDesc: 'Choose one',
    aeFormFtRadio: 'Single Choice',
    aeFormFtRadioDesc: 'Visual',
    aeFormFtCheckbox: 'Multiple Choice',
    aeFormFtCheckboxDesc: 'Multi-select',
    aeFormFtDate: 'Date',
    aeFormFtDateDesc: 'Birthday / deadline',
    aeFormFtNumber: 'Number',
    aeFormFtNumberDesc: 'Age / quantity',
    aeFormFtFile: 'File Upload',
    aeFormFtFileDesc: 'Attachment / work',
    aeFormFtUrl: 'URL',
    aeFormFtContentText: 'Text content',
    aeFormFtContentTextDesc: 'Plain text info',
    aeFormFtContentImage: 'Image content',
    aeFormFtContentImageDesc: 'Display an image',
    aeFormInsContentText: 'Display text',
    aeFormInsContentTextPh: 'Text shown to registrants…',
    aeFormInsContentImg: 'Image',
    aeFormInsContentImgBtn: 'Upload image',
    aeFormInsContentImgBusy: 'Uploading…',
    aeFormInsContentImgHint: 'JPG / PNG; auto-compressed if over 500KB or 1200px',
    aeFormInsContentImgLoading: 'Loading image…',
    aeFormInsContentImgFail: 'Image upload failed',
    aeFormContentTextEmpty: '(no text yet)',
    aeFormContentImgSet: 'Image set',
    aeFormContentImgEmpty: '(no image yet)',
    aeFormInsContentImgDel: 'Remove image',
    aeFormInsContentImgDelConfirm: 'Remove this image? This cannot be undone.',

    // ----- palette: special-field category headings -----
    aeFormCatBasic: 'Basic Fields',
    aeFormCatEdu: 'Academic / Affiliation',
    aeFormCatIdentity: 'Identity / Nationality',
    aeFormCatContact: 'Contact / Address',
    aeFormCatEmergency: 'Emergency Contact',
    aeFormCatHealth: 'Dietary / Medical',
    aeFormCatInvoice: 'Invoice',
    aeFormCatGuardian: 'Guardian / Consent',
    aeFormCatOther: 'Other',

    // ----- palette: special-field display names (palette chrome only) -----
    aeFormSpSalutation: 'Salutation',
    aeFormSpChineseName: 'Chinese Name',
    aeFormSpEnglishName: 'English Name',
    aeFormSpGender: 'Gender',
    aeFormSpBirthday: 'Birthday',
    aeFormSpEmail: 'Email',
    aeFormSpPhone: 'Phone',
    aeFormSpMobileIntl: 'Mobile (with country code)',
    aeFormSpEduLevel: 'Education Level',
    aeFormSpStudentId: 'Student ID',
    aeFormSpSchool: 'School',
    aeFormSpDepartment: 'Department',
    aeFormSpGrade: 'Grade',
    aeFormSpClassroom: 'Class',
    aeFormSpOrganization: 'Organization',
    aeFormSpJobTitle: 'Job Title',
    aeFormSpIdNumber: 'National ID',
    aeFormSpPassport: 'Passport No.',
    aeFormSpPassportIssue: 'Passport Issue Date',
    aeFormSpPassportExpiry: 'Passport Expiry Date',
    aeFormSpNationality: 'Nationality',
    aeFormSpBirthplace: 'Place of Birth',
    aeFormSpCity: 'City of Residence',
    aeFormSpPostalCode: 'Postal Code',
    aeFormSpAddress: 'Address',
    aeFormSpLineId: 'LINE ID',
    aeFormSpEmergencyName: 'Emergency Contact Name',
    aeFormSpEmergencyPhone: 'Emergency Contact Phone',
    aeFormSpEmergencyRelation: 'Emergency Contact Relationship',
    aeFormSpAccessibility: 'Special Needs / Accessibility',
    aeFormSpDietary: 'Diet',
    aeFormSpDietaryRestriction: 'Dietary Restrictions / Allergies',
    aeFormSpTshirt: 'T-shirt',
    aeFormSpBloodType: 'Blood Type',
    aeFormSpHealthNote: 'Special Health Conditions',
    aeFormSpInvoiceType: 'Invoice Type',
    aeFormSpInvoiceTitle: 'Invoice Title',
    aeFormSpTaxId: 'Tax ID',
    aeFormSpGuardianName: 'Guardian Name',
    aeFormSpGuardianPhone: 'Guardian Phone',
    aeFormSpGuardianConsent: 'Parental Consent',
    aeFormSpConsent: 'Terms / Image Rights Consent',
    aeFormSpWebsite: 'Website',
    aeFormSpReferralSource: 'How You Heard About This Event',
    aeFormSpTransportation: 'Transportation',
    aeFormSpAccommodation: 'Accommodation',

    // ----- default field LABEL values for special palette items whose default
    //       wording differs from the palette display name (labelForLegacy) -----
    aeFormDefDietary: 'Dietary Preference',
    aeFormDefTshirt: 'T-shirt Size',

    // ----- canvas -----
    aeFormCanvasTitle: 'Registration Form Preview',
    aeFormCanvasSub: 'Drag a field type from the left here, or click "＋ Add Field" inside a section',
    aeFormAddSection: 'Add Section',
    aeFormNoSections: 'No sections yet. Click "Add Section" below to start.',
    aeFormDropHere: 'Drag a field from the left into this section',
    aeFormAddField: 'Add Field',
    aeFormSecTitlePh: 'Section title',

    // ----- canvas: section action button titles -----
    aeFormSecUp: 'Move up',
    aeFormSecDown: 'Move down',
    aeFormSecDup: 'Duplicate section',
    aeFormSecDel: 'Delete',

    // ----- canvas: role tags -----
    aeFormRoleStudent: 'Participant',
    aeFormRoleTeacher: 'Instructor',
    aeFormRoleCustom: 'Additional Questions',
    aeFormRoleFallback: 'Custom',

    // ----- canvas: field preview -----
    aeFormFieldUnnamed: '(Unnamed)',
    aeFormOptUnit: 'options',

    // ----- inspector -----
    aeFormInsEmpty: 'Click any field to view its settings',
    aeFormInsType: 'Field Type',
    aeFormInsTypeLocked: 'Registrations exist; the type of existing fields is locked',
    aeFormInsLabel: 'Label Text',
    aeFormInsHelp: 'Help Text (optional)',
    aeFormInsHelpPh: 'Shown below the field (simple tags like <a> <b> <br> allowed)',
    aeFormInsOptions: 'Options',
    aeFormInsAddOpt: '＋ Add Option',
    aeFormInsReqH: 'Required',
    aeFormInsReqP: 'Must be filled in when submitting the form',

    // ----- inspector: file constraints -----
    aeFormFileMax: 'Max File Size (MB)',
    aeFormFileTypes: 'Allowed File Types (multi-select)',
    aeFormFileCustomPh: 'Custom extensions (comma-separated, e.g. .dwg,.psd)',
    aeFormFileHint: 'Leave blank = no restriction; validated live when registrants upload.',

    // ----- inspector: built-in validation badge -----
    aeFormValTitle: 'Built-in Validation',
    aeFormValEnforced: 'This validation is enforced by the system and cannot be disabled.',
    aeFormValHintIdNumber: '✓ Auto-validated: ROC National ID / Resident Certificate number (leading letter + 9 digits, with checksum)',
    aeFormValHintEmail: '✓ Auto-validated: Email format (user@domain.tld)',
    aeFormValHintPhone: '✓ Auto-validated: Taiwan landline / mobile format (starts with 0, 9–10 digits)',
    aeFormValHintMobilePhone: '✓ Auto-validated: country code + digits only (leading 0 removed)',
    aeFormValHintEmergencyPhone: '✓ Auto-validated: Taiwan landline / mobile format',
    aeFormValHintTaxId: '✓ Auto-validated: Tax ID (8 digits, with checksum)',
    aeFormValHintPostalCode: '✓ Auto-validated: Taiwan postal code (3 or 5 digits)',
    aeFormValHintBirthday: '✓ Auto-validated: date format + cannot be in the future',
    aeFormValHintPassport: '✓ Auto-validated: passport number length (6–9 alphanumeric characters)',
    aeFormValHintPassportIssue: '✓ Auto-validated: date format + cannot be in the future',
    aeFormValHintPassportExpiry: '✓ Auto-validated: date format + must be later than today',
    aeFormValHintWebsite: '✓ Auto-validated: URL format (https:// is prepended if no http(s):// is given)',

    // ----- inspector: condition logic editor -----
    aeFormCondTitle: 'Display Condition (advanced)',
    aeFormCondAlways: 'Always show',
    aeFormCondWhen: 'Show only when condition is met',
    aeFormCondFieldLead: 'When this section\'s field:',
    aeFormCondValuePh: 'Value to match (e.g. Male / 18)',
    aeFormCondNeedOther: 'This section needs other fields before a condition can be set',
    aeFormCondOpGt: 'greater than',
    aeFormCondOpEq: 'equals',
    aeFormCondOpLt: 'less than',
    aeFormCondOpNeq: 'not equal to',

    // ----- add-section modal -----
    aeFormAsTitle: 'Add Section',
    aeFormAsTypeLbl: 'Section Type',
    aeFormAsOptStudent: 'Participant (add multiple → each is one participant)',
    aeFormAsOptTeacher: 'Instructor (add multiple → each is one instructor)',
    aeFormAsOptCustom: 'Additional Questions (one only)',
    aeFormAsOptCustomExists: 'Additional Questions (already exists, only one allowed)',
    aeFormAsTitleLbl: 'Section Title',
    aeFormAsCancel: 'Cancel',
    aeFormAsOk: 'Create',

    // ----- default VALUES created at insert time (new field / section) -----
    aeFormDefaultFieldLabel: 'New Field',
    aeFormDefaultSectionBase: 'Section',
    aeFormDefaultTitleStudent: 'Participant Info',

    // ----- save / status (dynamic) -----
    aeFormSaving: 'Saving…',
    aeFormDirty: 'Unsaved changes',
    aeFormSaved: 'Saved',
    aeFormSavedOk: '✓ Saved',
    aeFormSavedSyncPre: '✓ Saved (synced legacy fields: ',
    aeFormSavedSyncMid: ' participant + ',
    aeFormSavedSyncSuf: ' additional questions)',

    // ----- lock banner / messages (dynamic) -----
    aeFormLockBannerPre: '🔒 <b>This event already has ',
    aeFormLockBannerSuf: ' registrations</b>. To keep data consistent, structural changes are locked: <b>existing fields cannot be deleted, field types cannot be changed, and sections cannot be added or removed</b>. You can still: add fields (optional by default), edit labels/help text, add options, and reorder.',
    aeFormLockedMsg: 'This event already has registrations. To keep data consistent, this change cannot be made (deleting existing fields / changing types / adding or removing sections). You can still add optional fields and edit labels and options.',

    // ----- confirm / alert (dynamic) -----
    aeFormConfirmDelSecMsg: 'Delete the entire section?',
    aeFormConfirmDelSecTitle: 'Delete Section',
    aeFormConfirmDelSecOk: 'Delete',
    aeFormNeedSectionFirst: 'Please add a section before adding fields',
    aeFormCustomOnlyOne: 'There can only be one Additional Questions section. Please edit the existing "Additional Questions" section to add items.',

    // ----- errors (dynamic) -----
    aeFormNoCompId: 'No event ID specified',
    aeFormLoadFailPre: 'Unable to load: ',
    aeFormUnknownErr: 'Unknown error',
    aeFormLoadFailedPre: 'Load failed: ',
    aeFormSaveFailPre: 'Save failed: '
  };

  Object.assign(Z, {
    aeFormSpEnglishSurname: '英文姓',
    aeFormSpEnglishGivenName: '英文名',
    aeFormValHintEnglishName: '✓ 自動驗證：僅英文字母，建議全大寫（比照護照）',
  });
  Object.assign(E, {
    aeFormSpEnglishSurname: 'English Surname',
    aeFormSpEnglishGivenName: 'English Given Name',
    aeFormValHintEnglishName: '✓ Auto-validated: English letters only, uppercase recommended (passport style)',
  });

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
