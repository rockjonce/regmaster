// =============================================================================
// RegMaster · I18N (shared/i18n-forgot.js)
// =============================================================================
// Page-scoped translations for public/forgot.html (organiser account
// forgot-password). Registers into the shared window.I18N dictionary built by
// /shared/i18n.js. All new keys are prefixed with "fg". Nav/footer/shared keys
// are reused from i18n.js and NOT redefined here.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- <title> -----
    fgPageTitle: '忘記密碼 · RegMaster',

    // ----- state 1: enter email -----
    fgTitle: '忘記密碼了？',
    fgLead: '沒關係。輸入你的註冊信箱，<br>系統會把密碼重設連結寄到你的信箱。',
    fgEmailLabel: '註冊信箱',
    fgSubmit: '寄送重設連結 →',
    fgSecurityNote: '為了安全，無論信箱是否存在，系統都會顯示相同回覆。請至信箱（含垃圾郵件夾）查看是否收到信件，<b>15 分鐘內僅能請求一次</b>。',
    fgRemembered: '想起來了？',
    fgBackLogin: '回到登入',

    // ----- state 2: success -----
    fgSuccessTitle: '請至信箱查看重設連結',
    fgSuccessMsg: '若此 Email 已註冊，<br>密碼重設連結將寄送至信箱。',
    fgSuccessNote: '請於 60 分鐘內點擊信中連結設定新密碼；連結僅能使用一次。若未收到，請檢查垃圾郵件夾。',
    fgBackLoginBtn: '回到登入頁 →',
    fgNeedHelp: '需要協助？',
    fgContactSupport: '聯絡客服',

    // ----- dynamic JS strings (client-side only) -----
    fgInvalidEmail: 'Email 格式不正確',
    fgSending: '寄送中...',
    fgSendFailed: '寄送失敗，請稍後再試',
    fgNetworkError: '網路錯誤'
  };

  var E = {
    // ----- <title> -----
    fgPageTitle: 'Forgot Password · RegMaster',

    // ----- state 1: enter email -----
    fgTitle: 'Forgot your password?',
    fgLead: 'No problem. Enter your registered email<br>and we\'ll send a password reset link to your inbox.',
    fgEmailLabel: 'Registered email',
    fgSubmit: 'Send reset link →',
    fgSecurityNote: 'For security, the system returns the same response whether or not the email exists. Please check your inbox (including the spam folder) for the message. <b>You can request once every 15 minutes</b>.',
    fgRemembered: 'Remembered it?',
    fgBackLogin: 'Back to login',

    // ----- state 2: success -----
    fgSuccessTitle: 'Check your inbox for the reset link',
    fgSuccessMsg: 'If this email is registered,<br>a password reset link will be sent to your inbox.',
    fgSuccessNote: 'Click the link in the email within 60 minutes to set a new password; it can be used only once. If you don\'t see it, check your spam folder.',
    fgBackLoginBtn: 'Back to login →',
    fgNeedHelp: 'Need help?',
    fgContactSupport: 'Contact support',

    // ----- dynamic JS strings (client-side only) -----
    fgInvalidEmail: 'Invalid email format',
    fgSending: 'Sending...',
    fgSendFailed: 'Failed to send, please try again later',
    fgNetworkError: 'Network error'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
