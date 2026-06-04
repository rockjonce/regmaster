// =============================================================================
// RegMaster · I18N page pack — Admin / Event Certificates & Name-Badges
// (admin/events/certificates.html)
// =============================================================================
// Page-scoped zh/en strings for the certificate / name-badge designer.
// Loaded immediately after /shared/i18n.js. All new keys are prefixed `aeCrt`.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / header -----
    aeCrtDocTitle: '證書 / 名牌 · 主辦後台 · RegMaster',
    aeCrtCrumbHome: '主辦後台',
    aeCrtCrumbEvents: '活動',
    aeCrtCrumbHere: '證書 / 名牌',
    aeCrtNavLabel: '證書 / 名牌',

    // ----- content states -----
    aeCrtLoading: '載入證書設計器⋯',
    aeCrtNoCompId: '未指定活動編號',

    // ----- plan gating -----
    aeCrtUpgradeTitle: '證書 / 名牌為 Pro / Team 方案功能',
    aeCrtUpgradeBody: '升級方案即可使用證書與名牌的設計與批次產生功能。',
    aeCrtUpgradeBtn: '查看方案與授權 →',

    // ----- template list -----
    aeCrtListTitle: '範本',
    aeCrtPresetsLabel: '內建範本',
    aeCrtSavedLabel: '我的範本',
    aeCrtSavedEmpty: '尚未建立任何範本',
    aeCrtNewBlank: '＋ 空白',
    aeCrtNewUpload: '＋ 上傳背景',
    aeCrtUseBuiltin: '＋ 套用內建範本',
    aeCrtBuiltinTitle: '套用內建範本',
    aeCrtBuiltinUse: '使用',
    aeCrtBuiltinClose: '關閉',
    aeCrtUnsaved: '尚有未儲存的變更，確定要離開嗎？',
    aeCrtUseEdit: '使用 / 編輯',
    aeCrtDuplicate: '複製',
    aeCrtDelete: '刪除',
    aeCrtTypeCert: '證書',
    aeCrtTypeBadge: '名牌',

    // ----- editor: toolbar -----
    aeCrtEditorTitle: '編輯範本',
    aeCrtTplName: '範本名稱',
    aeCrtTplNamePh: '例：2026 決賽證書',
    aeCrtSave: '儲存範本',
    aeCrtSaving: '儲存中⋯',
    aeCrtBack: '← 返回清單',
    aeCrtSelfServe: '開放報名者自行下載',
    aeCrtSelfServeReqCheckin: '限已報到者',
    aeCrtOrientation: '方向',
    aeCrtLandscape: '橫式',
    aeCrtPortrait: '直式',

    // ----- editor: background -----
    aeCrtBgTitle: '背景',
    aeCrtBgPreset: '內建底圖',
    aeCrtBgColor: '純色',
    aeCrtBgUpload: '上傳圖片',
    aeCrtBgUploading: '上傳中⋯',
    aeCrtBgNone: '（無底圖）',

    // ----- editor: add fields -----
    aeCrtAddTitle: '新增欄位',
    aeCrtAddText: '＋ 文字',
    aeCrtAddImage: '＋ 圖片 / 簽名',
    aeCrtAddQr: '＋ QR Code',

    // ----- editor: field list -----
    aeCrtFieldsTitle: '欄位',
    aeCrtFieldsEmpty: '尚無欄位，點上方按鈕新增',
    aeCrtFieldText: '文字',
    aeCrtFieldImage: '圖片',
    aeCrtFieldQr: 'QR',
    aeCrtFieldUp: '上移',
    aeCrtFieldDown: '下移',
    aeCrtFieldDel: '刪除',

    // ----- editor: properties panel -----
    aeCrtPropTitle: '欄位屬性',
    aeCrtPropPickField: '點選畫布或清單上的欄位以編輯屬性',
    aeCrtPropBind: '內容',
    aeCrtPropBindToken: '綁定資料',
    aeCrtPropBindFixed: '固定文字',
    aeCrtPropToken: '資料欄位',
    aeCrtPropFixedText: '固定文字',
    aeCrtPropFixedPh: '輸入文字⋯',
    aeCrtPropFont: '字體',
    aeCrtPropFontSize: '字級（% 高）',
    aeCrtPropColor: '顏色',
    aeCrtPropBold: '粗體',
    aeCrtPropAlign: '對齊',
    aeCrtPropAlignLeft: '靠左',
    aeCrtPropAlignCenter: '置中',
    aeCrtPropAlignRight: '靠右',
    aeCrtPropPosX: 'X（%）',
    aeCrtPropPosY: 'Y（%）',
    aeCrtPropWidth: '寬（%）',
    aeCrtPropImage: '圖片資產',
    aeCrtPropImageUpload: '上傳圖片',
    aeCrtPropImageKind: '類型',
    aeCrtPropImageHeight: '高（%）',
    aeCrtKindLogo: 'Logo',
    aeCrtKindSignature: '簽名',

    // ----- QR mode -----
    aeCrtQrMode: 'QR 內容',
    aeCrtQrModeCheckin: '報到核對（純報名編號，可現場掃碼報到）',
    aeCrtQrModeEvent: '活動頁面',
    aeCrtQrModeTeamData: '該隊報名資料',
    aeCrtQrModeRegister: '報名／修改頁',
    aeCrtQrModeNote: '※ 非「報到核對」模式無法用於現場掃碼報到。',

    // ----- editor: preview -----
    aeCrtPreviewTitle: '即時預覽',
    aeCrtPreviewRecipient: '預覽對象',
    aeCrtPreviewNoRecipient: '（無報名資料）',
    aeCrtDragHint: '可直接在畫布上拖曳欄位調整位置',

    // ----- tokens -----
    aeCrtTokName: '中文姓名',
    aeCrtTokNameEN: '英文姓名',
    aeCrtTokEvent: '活動名稱',
    aeCrtTokGroup: '組別',
    aeCrtTokRegNo: '報名編號',
    aeCrtTokRank: '名次',
    aeCrtTokAward: '獎項',
    aeCrtTokDate: '日期',
    aeCrtTokQr: 'QR Code',
    aeCrtTokTeam: '隊名',
    aeCrtTokTeamEN: '英文隊名',
    aeCrtTokRole: '稱謂（學員/指導者）',

    // ----- generate / export -----
    aeCrtGenTitle: '產生 / 匯出',
    aeCrtScope: '對象範圍',
    aeCrtScopeAll: '全部',
    aeCrtScopeGroup: '指定組別',
    aeCrtScopeConfirmed: '僅正取',
    aeCrtScopeCheckedIn: '僅已報到',
    aeCrtScopeWinners: '得獎者',
    aeCrtScopeManual: '手動勾選',
    aeCrtScopeStudents: '僅學員',
    aeCrtScopeTeachers: '僅指導者',
    aeCrtScopeGroupPick: '選擇組別',
    aeCrtScopeManualPick: '勾選對象',
    aeCrtGranularity: '產生粒度',
    aeCrtGranPerPerson: '每人一張',
    aeCrtGranPerTeam: '每隊一張',
    aeCrtRecipientCount: '符合對象：{n} 位',
    aeCrtOutputFormat: '輸出格式',
    aeCrtOutputPdf: '合併 PDF（多頁）',
    aeCrtOutputZip: '每人單獨 PDF（ZIP 壓縮）',
    aeCrtGenerate: '產生並下載',
    aeCrtGenerating: '產生中⋯ {done}/{total}',
    aeCrtGenDone: '完成！已下載。',
    aeCrtGenNoRecipients: '沒有符合的對象',
    aeCrtGenNoTemplate: '請先選擇或儲存範本',
    aeCrtGenFail: '產生失敗：{err}',
    aeCrtLibLoadFail: '匯出元件載入失敗，請重新整理頁面再試',

    // ----- toasts / misc -----
    aeCrtSaved: '已儲存',
    aeCrtSaveFail: '儲存失敗',
    aeCrtDeleted: '已刪除',
    aeCrtDeleteFail: '刪除失敗',
    aeCrtConfirmDelTitle: '刪除範本',
    aeCrtConfirmDelMsg: '確定要刪除這個範本嗎？此動作無法復原。',
    aeCrtConfirmDelOk: '刪除',
    aeCrtCopySuffix: '（複本）',
    aeCrtUntitled: '未命名範本',
    aeCrtUploadFail: '上傳失敗',
    aeCrtFileTooBig: '檔案過大（上限 5MB）',
    aeCrtBadImage: '請選擇圖片檔',
    aeCrtNoName: '(無名稱)',
    aeCrtRankNth: '第 {n} 名',

    // ----- preset names -----
    aeCrtPresetClassic: '經典邊框證書',
    aeCrtPresetAccent: '現代色條證書',
    aeCrtPresetMinimal: '極簡證書',
    aeCrtPresetElegant: '典雅證書',
    aeCrtPresetBadge: '簡約名牌',
    aeCrtPresetGoldborder: '古典金框獎狀',
    aeCrtPresetThanks: '感謝狀',
    aeCrtPresetDiplomaEn: '英文證書',
    aeCrtPresetRibbon: '獎章緞帶',
    aeCrtPresetNavy: '深藍正式',
    aeCrtPresetBadgePortrait: '直式名牌',

    // ----- default field text -----
    aeCrtDefaultCertTitle: '獎狀',
    aeCrtDefaultBadgeTitle: '與會證'
  };

  var E = {
    // ----- document / header -----
    aeCrtDocTitle: 'Certificates / Badges · Organizer Console · RegMaster',
    aeCrtCrumbHome: 'Organizer Console',
    aeCrtCrumbEvents: 'Events',
    aeCrtCrumbHere: 'Certificates / Badges',
    aeCrtNavLabel: 'Certificates / Badges',

    // ----- content states -----
    aeCrtLoading: 'Loading certificate designer…',
    aeCrtNoCompId: 'No event ID specified',

    // ----- plan gating -----
    aeCrtUpgradeTitle: 'Certificates / Badges is a Pro / Team feature',
    aeCrtUpgradeBody: 'Upgrade your plan to design and batch-generate certificates and name badges.',
    aeCrtUpgradeBtn: 'View Plans & Licensing →',

    // ----- template list -----
    aeCrtListTitle: 'Templates',
    aeCrtPresetsLabel: 'Built-in Presets',
    aeCrtSavedLabel: 'My Templates',
    aeCrtSavedEmpty: 'No templates yet',
    aeCrtNewBlank: '+ Blank',
    aeCrtNewUpload: '+ Upload Background',
    aeCrtUseBuiltin: '+ Use a Built-in Template',
    aeCrtBuiltinTitle: 'Apply a Built-in Template',
    aeCrtBuiltinUse: 'Use',
    aeCrtBuiltinClose: 'Close',
    aeCrtUnsaved: 'You have unsaved changes. Leave anyway?',
    aeCrtUseEdit: 'Use / Edit',
    aeCrtDuplicate: 'Duplicate',
    aeCrtDelete: 'Delete',
    aeCrtTypeCert: 'Certificate',
    aeCrtTypeBadge: 'Badge',

    // ----- editor: toolbar -----
    aeCrtEditorTitle: 'Edit Template',
    aeCrtTplName: 'Template Name',
    aeCrtTplNamePh: 'e.g. 2026 Finals Certificate',
    aeCrtSave: 'Save Template',
    aeCrtSaving: 'Saving…',
    aeCrtBack: '← Back to List',
    aeCrtSelfServe: 'Let registrants download it themselves',
    aeCrtSelfServeReqCheckin: 'Checked-in only',
    aeCrtOrientation: 'Orientation',
    aeCrtLandscape: 'Landscape',
    aeCrtPortrait: 'Portrait',

    // ----- editor: background -----
    aeCrtBgTitle: 'Background',
    aeCrtBgPreset: 'Built-in',
    aeCrtBgColor: 'Solid Color',
    aeCrtBgUpload: 'Upload Image',
    aeCrtBgUploading: 'Uploading…',
    aeCrtBgNone: '(No background)',

    // ----- editor: add fields -----
    aeCrtAddTitle: 'Add Field',
    aeCrtAddText: '+ Text',
    aeCrtAddImage: '+ Image / Signature',
    aeCrtAddQr: '+ QR Code',

    // ----- editor: field list -----
    aeCrtFieldsTitle: 'Fields',
    aeCrtFieldsEmpty: 'No fields yet — add one above',
    aeCrtFieldText: 'Text',
    aeCrtFieldImage: 'Image',
    aeCrtFieldQr: 'QR',
    aeCrtFieldUp: 'Move up',
    aeCrtFieldDown: 'Move down',
    aeCrtFieldDel: 'Delete',

    // ----- editor: properties panel -----
    aeCrtPropTitle: 'Field Properties',
    aeCrtPropPickField: 'Select a field on the canvas or list to edit its properties',
    aeCrtPropBind: 'Content',
    aeCrtPropBindToken: 'Bind Data',
    aeCrtPropBindFixed: 'Fixed Text',
    aeCrtPropToken: 'Data Field',
    aeCrtPropFixedText: 'Fixed Text',
    aeCrtPropFixedPh: 'Enter text…',
    aeCrtPropFont: 'Font',
    aeCrtPropFontSize: 'Size (% height)',
    aeCrtPropColor: 'Color',
    aeCrtPropBold: 'Bold',
    aeCrtPropAlign: 'Align',
    aeCrtPropAlignLeft: 'Left',
    aeCrtPropAlignCenter: 'Center',
    aeCrtPropAlignRight: 'Right',
    aeCrtPropPosX: 'X (%)',
    aeCrtPropPosY: 'Y (%)',
    aeCrtPropWidth: 'Width (%)',
    aeCrtPropImage: 'Image Asset',
    aeCrtPropImageUpload: 'Upload Image',
    aeCrtPropImageKind: 'Kind',
    aeCrtPropImageHeight: 'Height (%)',
    aeCrtKindLogo: 'Logo',
    aeCrtKindSignature: 'Signature',

    // ----- QR mode -----
    aeCrtQrMode: 'QR Content',
    aeCrtQrModeCheckin: 'Check-in match (plain registration ID — scannable at the door)',
    aeCrtQrModeEvent: 'Event page',
    aeCrtQrModeTeamData: "This team's registration data",
    aeCrtQrModeRegister: 'Register / Edit page',
    aeCrtQrModeNote: 'Note: modes other than “Check-in match” cannot be scanned for on-site check-in.',

    // ----- editor: preview -----
    aeCrtPreviewTitle: 'Live Preview',
    aeCrtPreviewRecipient: 'Preview Recipient',
    aeCrtPreviewNoRecipient: '(No registrations)',
    aeCrtDragHint: 'Drag fields directly on the canvas to reposition',

    // ----- tokens -----
    aeCrtTokName: 'Chinese Name',
    aeCrtTokNameEN: 'English Name',
    aeCrtTokEvent: 'Event Name',
    aeCrtTokGroup: 'Group',
    aeCrtTokRegNo: 'Registration No.',
    aeCrtTokRank: 'Rank',
    aeCrtTokAward: 'Award',
    aeCrtTokDate: 'Date',
    aeCrtTokQr: 'QR Code',
    aeCrtTokTeam: 'Team Name',
    aeCrtTokTeamEN: 'Team Name (EN)',
    aeCrtTokRole: 'Title (Student / Instructor)',

    // ----- generate / export -----
    aeCrtGenTitle: 'Generate / Export',
    aeCrtScope: 'Recipient Scope',
    aeCrtScopeAll: 'All',
    aeCrtScopeGroup: 'By Group',
    aeCrtScopeConfirmed: 'Confirmed Only',
    aeCrtScopeCheckedIn: 'Checked-in Only',
    aeCrtScopeWinners: 'Winners',
    aeCrtScopeManual: 'Manual Select',
    aeCrtScopeStudents: 'Students Only',
    aeCrtScopeTeachers: 'Instructors Only',
    aeCrtScopeGroupPick: 'Choose Group',
    aeCrtScopeManualPick: 'Select Recipients',
    aeCrtGranularity: 'Generate Per',
    aeCrtGranPerPerson: 'One per person',
    aeCrtGranPerTeam: 'One per team',
    aeCrtRecipientCount: 'Matching: {n}',
    aeCrtOutputFormat: 'Output Format',
    aeCrtOutputPdf: 'Combined PDF (multi-page)',
    aeCrtOutputZip: 'One PDF each (ZIP)',
    aeCrtGenerate: 'Generate & Download',
    aeCrtGenerating: 'Generating… {done}/{total}',
    aeCrtGenDone: 'Done! Downloaded.',
    aeCrtGenNoRecipients: 'No matching recipients',
    aeCrtGenNoTemplate: 'Please select or save a template first',
    aeCrtGenFail: 'Generation failed: {err}',
    aeCrtLibLoadFail: 'Export component failed to load; please refresh and retry',

    // ----- toasts / misc -----
    aeCrtSaved: 'Saved',
    aeCrtSaveFail: 'Save failed',
    aeCrtDeleted: 'Deleted',
    aeCrtDeleteFail: 'Delete failed',
    aeCrtConfirmDelTitle: 'Delete Template',
    aeCrtConfirmDelMsg: 'Delete this template? This cannot be undone.',
    aeCrtConfirmDelOk: 'Delete',
    aeCrtCopySuffix: ' (Copy)',
    aeCrtUntitled: 'Untitled Template',
    aeCrtUploadFail: 'Upload failed',
    aeCrtFileTooBig: 'File too large (max 5MB)',
    aeCrtBadImage: 'Please choose an image file',
    aeCrtNoName: '(no name)',
    aeCrtRankNth: 'Rank {n}',

    // ----- preset names -----
    aeCrtPresetClassic: 'Classic Bordered',
    aeCrtPresetAccent: 'Modern Accent Bar',
    aeCrtPresetMinimal: 'Minimal',
    aeCrtPresetElegant: 'Elegant',
    aeCrtPresetBadge: 'Simple Badge Card',
    aeCrtPresetGoldborder: 'Classic Gold Frame',
    aeCrtPresetThanks: 'Certificate of Appreciation',
    aeCrtPresetDiplomaEn: 'English Certificate',
    aeCrtPresetRibbon: 'Ribbon & Seal',
    aeCrtPresetNavy: 'Formal Navy',
    aeCrtPresetBadgePortrait: 'Portrait Name Badge',

    // ----- default field text -----
    aeCrtDefaultCertTitle: 'Certificate',
    aeCrtDefaultBadgeTitle: 'Attendee'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
