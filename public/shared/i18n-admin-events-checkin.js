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
    aeChkCameraFail: '無法開啟相機：{err}\n請確認已允許相機權限，或改用手動輸入。'
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
    aeChkCameraFail: 'Cannot open camera: {err}\nPlease confirm camera permission is granted, or use manual entry.'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
