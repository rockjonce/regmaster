// =============================================================================
// RegMaster · I18N page pack — Admin / Event QR Check-in (admin/events/checkin.html)
// =============================================================================
// Page-scoped zh/en strings for the organiser QR / ID check-in console.
// Loaded immediately after /shared/i18n.js. All new keys are prefixed `aeChk`.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- document / header -----
    aeChkDocTitle: 'QR 報到 · 主辦後台 · RegMaster',
    aeChkCrumbHome: '主辦後台',
    aeChkCrumbEvents: '活動',
    aeChkCrumbHere: 'QR 報到',
    aeChkNavLabel: 'QR 報到',

    // ----- content states -----
    aeChkLoading: '載入報到面板⋯',

    // ----- left column: live stats -----
    aeChkStatsTitle: '即時統計',
    aeChkCheckedIn: '已報到',
    aeChkNotCheckedIn: '未報到',
    aeChkRate: '報到率',

    // ----- scanner column -----
    aeChkScannerHead: '📷 QR / 編號報到',
    aeChkInputTitle: '掃描 QR 或輸入編號',
    aeChkInputPh: '例：T4F000',
    aeChkConfirmBtn: '確認報到 →',
    aeChkOpenCamera: '📷 開啟相機掃描',
    aeChkHelp: '用手機 / 電腦相機掃描報名 QR Code，編號會自動填入並完成報到（需允許相機權限）。',

    // ----- right column: recent history -----
    aeChkHistoryTitle: '最近報到紀錄',
    aeChkHistoryEmpty: '尚無紀錄',

    // ----- dynamic: scan result messages -----
    aeChkResultOk: '✓ 報到成功',
    aeChkResultFail: '✗ 報到失敗',
    aeChkContinue: '繼續',
    aeChkProcessing: '處理中⋯',
    aeChkSuccessMsg: '隊伍 {tid} ({name}) 報到成功',
    aeChkUnknownErr: '未知錯誤',
    aeChkNetworkErr: '網路錯誤',
    aeChkNoName: '(無)',

    // ----- dynamic: scanner control -----
    aeChkStopScan: '■ 停止掃描',

    // ----- alerts -----
    aeChkNoCompId: '未指定活動編號',
    aeChkScanLoadFail: '掃描元件載入失敗，請改用手動輸入',
    aeChkCameraFail: '無法開啟相機：{err}\n請確認已允許相機權限，或改用手動輸入。',

    // ----- mode tabs / sections -----
    aeChkModeScan: '掃描 QR',
    aeChkModeSearch: '名單搜尋',
    aeChkModeKiosk: '自助報到機',
    aeChkModeSettings: '自助報到設定',
    aeChkNoPermTitle: '無報到權限',
    aeChkNoPermBody: '您目前的角色（評審）無法執行報到作業，僅能查看評分。如需報到權限，請聯絡活動主辦方。',

    // ----- search section -----
    aeChkSearchHead: '名單搜尋報到',
    aeChkSearchHint: 'QR 掃描失敗時，可在此用報名編號、隊名或成員姓名查找並報到。',
    aeChkSearchPh: '搜尋 報名編號 / 隊名 / 成員姓名⋯',
    aeChkSearchEmpty: '查無符合的隊伍',
    aeChkSearchAll: '顯示全部隊伍（最多 200 筆）',
    aeChkSearchCount: '共 {n} 筆',
    aeChkSearching: '搜尋中⋯',
    aeChkColExpected: '應到',
    aeChkBadgeDone: '已報到',

    // ----- identity panel -----
    aeChkIdTitle: '身分核對',
    aeChkIdTeamId: '報名編號',
    aeChkIdGroup: '組別',
    aeChkIdRegStatus: '報名狀態',
    aeChkIdPayStatus: '繳費狀態',
    aeChkIdNote: '特殊註記',
    aeChkIdRoster: '出席名單核對',
    aeChkIdRosterHint: '預設全到，請取消未到場成員的勾選。',
    aeChkIdExpected: '應到人數',
    aeChkIdActual: '實到',
    aeChkIdPeople: '人',
    aeChkIdAlready: '已於 {time} 報到',
    aeChkIdRoleStudent: '學生',
    aeChkIdRoleCoach: '教練',
    aeChkIdConfirm: '確認報到',
    aeChkIdResubmit: '更新報到',
    aeChkIdCancel: '取消',
    aeChkIdNoMembers: '尚無成員名單',
    aeChkIdSubmitting: '送出中⋯',
    aeChkIdDoneToast: '{name} 報到完成',
    aeChkIdNoId: '無證件',

    // ----- kiosk -----
    aeChkKioskStart: '啟動自助報到機',
    aeChkKioskTitle: '自助報到',
    aeChkKioskPrompt: '請輸入報名編號',
    aeChkKioskPh: '報名編號',
    aeChkKioskSubmit: '報到',
    aeChkKioskScan: '改用掃描 QR',
    aeChkKioskScanStop: '停止掃描',
    aeChkKioskWelcome: '報到成功，歡迎！',
    aeChkKioskAlready: '您已完成報到',
    aeChkKioskNext: '下一位',
    aeChkKioskExit: '結束報到機',
    aeChkKioskLocating: '定位中，請稍候⋯',
    aeChkKioskGeoFail: '無法取得您的位置，請開啟定位權限後再試。',
    aeChkKioskEmptyId: '請先輸入報名編號',
    aeChkKioskExitPinTitle: '結束報到機',
    aeChkKioskExitPinMsg: '請輸入解鎖 PIN 以結束自助報到機。',
    aeChkKioskExitPinPh: 'PIN',
    aeChkKioskExitWrong: 'PIN 錯誤',
    aeChkKioskLockedTitle: '自助報到機已鎖定',
    aeChkKioskLockedBody: '點擊下方按鈕繼續報到。',
    aeChkKioskResume: '繼續報到',

    // ----- manager settings -----
    aeChkSetHead: '自助報到設定',
    aeChkSetHint: '設定後，參賽者可於現場使用自助報到機完成報到。',
    aeChkSetEnable: '啟用自助報到',
    aeChkSetWindow: '開放時間窗',
    aeChkSetWindowStart: '開始時間',
    aeChkSetWindowEnd: '結束時間',
    aeChkSetGeo: '地理柵欄',
    aeChkSetGeoEnable: '啟用現場範圍限制',
    aeChkSetLat: '緯度',
    aeChkSetLng: '經度',
    aeChkSetRadius: '半徑（公尺）',
    aeChkSetUseLoc: '使用目前位置',
    aeChkSetGeoSearchPh: '搜尋會場地址或地名…', aeChkSetGeoSearchBtn: '搜尋',
    aeChkSetGeoMapHint: '在地圖上點選或拖曳標記即可設定會場位置；圓圈為報到允許範圍（半徑）。地圖資料 © OpenStreetMap。',
    aeChkSetGeoNoResult: '找不到該地點，請換個關鍵字或直接在地圖上點選',
    aeChkSetPin: '報到機解鎖 PIN',
    aeChkSetPinNote: '說明：此 PIN 僅用於「離開自助報到機（Kiosk）全螢幕模式」的前端鎖定，防止現場人員誤觸離開；報到本身仍由時間窗與 GPS 範圍於伺服器端驗證，PIN 不是報到入場的驗證。',
    aeChkSetPinPh: '4–8 位數字',
    aeChkSetSave: '儲存設定',
    aeChkSetSaving: '儲存中⋯',
    aeChkSetSaved: '設定已儲存',
    aeChkSetSaveFail: '儲存失敗',
    aeChkSetLocFail: '無法取得目前位置',
    aeChkSetLocOk: '已填入目前位置'
  };

  var E = {
    // ----- document / header -----
    aeChkDocTitle: 'QR Check-in · Organizer Console · RegMaster',
    aeChkCrumbHome: 'Organizer Console',
    aeChkCrumbEvents: 'Events',
    aeChkCrumbHere: 'QR Check-in',
    aeChkNavLabel: 'QR Check-in',

    // ----- content states -----
    aeChkLoading: 'Loading check-in panel…',

    // ----- left column: live stats -----
    aeChkStatsTitle: 'Live Stats',
    aeChkCheckedIn: 'Checked In',
    aeChkNotCheckedIn: 'Not Checked In',
    aeChkRate: 'Check-in Rate',

    // ----- scanner column -----
    aeChkScannerHead: '📷 QR / ID Check-in',
    aeChkInputTitle: 'Scan QR or Enter ID',
    aeChkInputPh: 'e.g. T4F000',
    aeChkConfirmBtn: 'Confirm Check-in →',
    aeChkOpenCamera: '📷 Open Camera Scanner',
    aeChkHelp: 'Scan the registration QR code with a phone or computer camera; the ID fills in automatically and check-in completes (camera permission required).',

    // ----- right column: recent history -----
    aeChkHistoryTitle: 'Recent Check-ins',
    aeChkHistoryEmpty: 'No records yet',

    // ----- dynamic: scan result messages -----
    aeChkResultOk: '✓ Check-in Successful',
    aeChkResultFail: '✗ Check-in Failed',
    aeChkContinue: 'Continue',
    aeChkProcessing: 'Processing…',
    aeChkSuccessMsg: 'Team {tid} ({name}) checked in successfully',
    aeChkUnknownErr: 'Unknown error',
    aeChkNetworkErr: 'Network error',
    aeChkNoName: '(none)',

    // ----- dynamic: scanner control -----
    aeChkStopScan: '■ Stop Scanning',

    // ----- alerts -----
    aeChkNoCompId: 'No event ID specified',
    aeChkScanLoadFail: 'Scanner component failed to load; please use manual entry',
    aeChkCameraFail: 'Cannot open camera: {err}\nPlease confirm camera permission is granted, or use manual entry.',

    // ----- mode tabs / sections -----
    aeChkModeScan: 'Scan QR',
    aeChkModeSearch: 'Search Roster',
    aeChkModeKiosk: 'Self Check-in Kiosk',
    aeChkModeSettings: 'Kiosk Settings',
    aeChkNoPermTitle: 'No Check-in Permission',
    aeChkNoPermBody: 'Your current role (Judge) cannot perform check-in and may only view scoring. Contact the event organizer if you need check-in access.',

    // ----- search section -----
    aeChkSearchHead: 'Search Roster to Check In',
    aeChkSearchHint: 'When QR scanning fails, look up a team here by registration ID, team name, or member name.',
    aeChkSearchPh: 'Search by ID / team name / member name…',
    aeChkSearchEmpty: 'No matching teams',
    aeChkSearchAll: 'Showing all teams (up to 200)',
    aeChkSearchCount: '{n} result(s)',
    aeChkSearching: 'Searching…',
    aeChkColExpected: 'Expected',
    aeChkBadgeDone: 'Checked in',

    // ----- identity panel -----
    aeChkIdTitle: 'Verify Identity',
    aeChkIdTeamId: 'Registration ID',
    aeChkIdGroup: 'Group',
    aeChkIdRegStatus: 'Registration',
    aeChkIdPayStatus: 'Payment',
    aeChkIdNote: 'Special Note',
    aeChkIdRoster: 'Attendance Check',
    aeChkIdRosterHint: 'Everyone is checked by default; uncheck anyone who is absent.',
    aeChkIdExpected: 'Expected',
    aeChkIdActual: 'Present',
    aeChkIdPeople: '',
    aeChkIdAlready: 'Checked in at {time}',
    aeChkIdRoleStudent: 'Student',
    aeChkIdRoleCoach: 'Coach',
    aeChkIdConfirm: 'Confirm Check-in',
    aeChkIdResubmit: 'Update Check-in',
    aeChkIdCancel: 'Cancel',
    aeChkIdNoMembers: 'No member roster',
    aeChkIdSubmitting: 'Submitting…',
    aeChkIdDoneToast: '{name} checked in',
    aeChkIdNoId: 'No ID',

    // ----- kiosk -----
    aeChkKioskStart: 'Launch Kiosk',
    aeChkKioskTitle: 'Self Check-in',
    aeChkKioskPrompt: 'Enter your registration ID',
    aeChkKioskPh: 'Registration ID',
    aeChkKioskSubmit: 'Check In',
    aeChkKioskScan: 'Scan QR instead',
    aeChkKioskScanStop: 'Stop scanning',
    aeChkKioskWelcome: 'Checked in — welcome!',
    aeChkKioskAlready: 'You are already checked in',
    aeChkKioskNext: 'Next',
    aeChkKioskExit: 'Exit Kiosk',
    aeChkKioskLocating: 'Locating you, please wait…',
    aeChkKioskGeoFail: 'Could not get your location. Please enable location permission and try again.',
    aeChkKioskEmptyId: 'Please enter your registration ID',
    aeChkKioskExitPinTitle: 'Exit Kiosk',
    aeChkKioskExitPinMsg: 'Enter the unlock PIN to exit the self check-in kiosk.',
    aeChkKioskExitPinPh: 'PIN',
    aeChkKioskExitWrong: 'Wrong PIN',
    aeChkKioskLockedTitle: 'Kiosk Locked',
    aeChkKioskLockedBody: 'Tap the button below to continue checking in.',
    aeChkKioskResume: 'Resume Check-in',

    // ----- manager settings -----
    aeChkSetHead: 'Self Check-in Settings',
    aeChkSetHint: 'Once configured, attendees can check themselves in on-site using the kiosk.',
    aeChkSetEnable: 'Enable self check-in',
    aeChkSetWindow: 'Open Window',
    aeChkSetWindowStart: 'Start',
    aeChkSetWindowEnd: 'End',
    aeChkSetGeo: 'Geofence',
    aeChkSetGeoEnable: 'Restrict to on-site area',
    aeChkSetLat: 'Latitude',
    aeChkSetLng: 'Longitude',
    aeChkSetRadius: 'Radius (m)',
    aeChkSetUseLoc: 'Use current location',
    aeChkSetGeoSearchPh: 'Search venue address or place…', aeChkSetGeoSearchBtn: 'Search',
    aeChkSetGeoMapHint: 'Click or drag the marker on the map to set the venue; the circle is the allowed check-in radius. Map data © OpenStreetMap.',
    aeChkSetGeoNoResult: 'Location not found — try another keyword or click directly on the map',
    aeChkSetPin: 'Kiosk unlock PIN',
    aeChkSetPinNote: 'Note: this PIN only locks EXITING the full-screen kiosk mode on the front end (so on-site staff don’t leave it by accident). Check-in itself is still validated server-side by the time window and GPS range — the PIN is not a check-in entry gate.',
    aeChkSetPinPh: '4–8 digits',
    aeChkSetSave: 'Save Settings',
    aeChkSetSaving: 'Saving…',
    aeChkSetSaved: 'Settings saved',
    aeChkSetSaveFail: 'Save failed',
    aeChkSetLocFail: 'Could not get current location',
    aeChkSetLocOk: 'Filled in current location'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
