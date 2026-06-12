// =============================================================================
// RegMaster · I18N (shared/i18n-login.js)
// =============================================================================
// Page-scoped translations for public/login.html (organizer/admin login).
// Registers into the shared window.I18N dictionary built by /shared/i18n.js.
// All new keys are prefixed with "lg". Nav/footer/brand keys are reused from
// i18n.js and NOT redefined here. Inline-markup values are stored as HTML and
// applied via [data-i18n-html]. Server-returned error messages are NOT here —
// only client-side literal strings.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- <title> -----
    lgPageTitle: '登入 · RegMaster',

    // ----- left: heading + sub -----
    lgWelcome: '歡迎回來',
    lgSubPrompt: '第一次使用？<a href="/signup.html">建立新帳號 →</a>',

    // ----- social login -----
    lgGoogleTitle: '使用 Google 登入',
    lgGoogleBtn: '使用 Google 登入',
    lgLineTitle: '使用 LINE 登入',
    lgLineBtn: '使用 LINE 登入',
    lgDivider: 'OR · 用帳號密碼',

    // ----- account/password form -----
    lgUsernameLabel: '帳號',
    lgUsernamePh: '您的帳號或 Email',
    lgPasswordLabel: '密碼',
    lgForgot: '忘記密碼？',
    lgPasswordPh: '輸入密碼',
    lgRemember: '30 天內保持登入',
    lgLoginBtn: '登入 →',

    // ----- TOTP (2FA) step -----
    lgTotpTitle: '兩步驟驗證',
    lgTotpDesc: '多一道保護，確保是你本人登入。',
    lgTotpLabel: '驗證碼',
    lgTotpHint: '開啟 Google Authenticator 等驗證 App，輸入目前顯示的 6 位數驗證碼。',
    lgTotpBtn: '驗證並登入 →',
    lgTotpBack: '← 返回帳號密碼',

    // ----- footer -----
    lgFtTerms: '服務條款',
    lgFtPrivacy: '隱私權政策',
    lgFtContact: '聯絡我們',
    lgFtCopyright: '© 2026 RegMaster · v3.0',

    // ----- right marketing panel -----
    lgBadge: 'AI 助理已上線 — 自動接住報名者的問題',
    lgRightH2: '報名後台<br>不再是<em>苦差事</em>。',
    lgRightLead: '從競賽、研習到夏令營，RegMaster 把報名、收費、對帳、通知與報到整合成一個後台。',
    lgQuote: '過去用表單工具收兩百多人報名很累，活動前還在熬夜對帳。改用系統化流程後，幾分鐘就搞定，省下大量行政時間。',
    lgQuoteOrg: '某科技大學<span>競賽承辦團隊</span>',
    lgStat1Lbl: '一個後台',
    lgStat2Lbl: '不用寫程式',
    lgStat3Lbl: '智慧助理',
    lgStat4Lbl: '在地設計',

    // ----- dynamic JS strings -----
    lgMsgSignupOk: '帳號已建立並驗證完成！請用您的帳號密碼登入。',
    lgMsgResetOk: '密碼已重設。請用新密碼登入。',
    lgMsgExpired: '登入已過期，請重新登入。',
    lgMsgNeedCreds: '請輸入帳號與密碼',
    lgMsgLoggingIn: '登入中...',
    lgMsgLoginFailed: '登入失敗',
    lgMsgNetError: '網路錯誤，請稍後再試',
    lgMsgLoginOk: '登入成功，正在轉跳...',
    lgMsgReLogin: '請重新登入',
    lgMsgNeed6: '請輸入 6 位數驗證碼',
    lgMsgVerifying: '驗證中...',
    lgMsgVerifyFailed: '驗證失敗',
    lgMsgGoogleNotLoaded: 'Google 登入元件尚未載入，請重新整理',
    lgMsgGoogleLoading: 'Google 登入中，請稍候⋯',
    lgMsgGoogleFailed: 'Google 登入失敗',
    lgMsgGoogleFailedRetry: 'Google 登入失敗，請稍後再試',
    lgMsgGoogleNotEnabled: 'Google 登入尚未在後台啟用，請聯絡管理員',
    lgMsgGooglePopupBlocked: '登入視窗被瀏覽器攔截了，請允許此網站的彈出視窗後再試一次。',
    lgMsgGoogleNetwork: '網路連線異常，請檢查網路後再試一次。',
    lgMsgGoogleUnauthDomain: '此網域未授權 Google 登入',
    lgMsgProcessing: '處理中⋯'
  };

  var E = {
    // ----- <title> -----
    lgPageTitle: 'Log In · RegMaster',

    // ----- left: heading + sub -----
    lgWelcome: 'Welcome back',
    lgSubPrompt: 'First time here? <a href="/signup.html">Create an account →</a>',

    // ----- social login -----
    lgGoogleTitle: 'Sign in with Google',
    lgGoogleBtn: 'Sign in with Google',
    lgLineTitle: 'Sign in with LINE',
    lgLineBtn: 'Sign in with LINE',
    lgDivider: 'OR · WITH USERNAME',

    // ----- account/password form -----
    lgUsernameLabel: 'Username',
    lgUsernamePh: 'Your username or email',
    lgPasswordLabel: 'Password',
    lgForgot: 'Forgot password?',
    lgPasswordPh: 'Enter your password',
    lgRemember: 'Stay signed in for 30 days',
    lgLoginBtn: 'Log in →',

    // ----- TOTP (2FA) step -----
    lgTotpTitle: 'Two-step verification',
    lgTotpDesc: 'An extra layer to confirm it\'s really you signing in.',
    lgTotpLabel: 'Verification code',
    lgTotpHint: 'Open an authenticator app such as Google Authenticator and enter the 6-digit code currently shown.',
    lgTotpBtn: 'Verify and log in →',
    lgTotpBack: '← Back to username & password',

    // ----- footer -----
    lgFtTerms: 'Terms of Service',
    lgFtPrivacy: 'Privacy Policy',
    lgFtContact: 'Contact Us',
    lgFtCopyright: '© 2026 RegMaster · v3.0',

    // ----- right marketing panel -----
    lgBadge: 'AI assistant now live — it catches your registrants\' questions',
    lgRightH2: 'Running registrations<br>is no longer a <em>chore</em>.',
    lgRightLead: 'From contests and workshops to summer camps, RegMaster brings registration, payments, reconciliation, notifications and check-in together in one dashboard.',
    lgQuote: 'Collecting 200-plus registrations with a form tool used to be exhausting — we were up late reconciling payments right before the event. With a systematic workflow it now takes minutes, saving us a huge amount of admin time.',
    lgQuoteOrg: 'A university of technology<span>Contest coordination team</span>',
    lgStat1Lbl: 'One dashboard',
    lgStat2Lbl: 'No coding',
    lgStat3Lbl: 'Smart assistant',
    lgStat4Lbl: 'Built for Taiwan',

    // ----- dynamic JS strings -----
    lgMsgSignupOk: 'Your account has been created and verified! Please log in with your username and password.',
    lgMsgResetOk: 'Your password has been reset. Please log in with your new password.',
    lgMsgExpired: 'Your session has expired. Please log in again.',
    lgMsgNeedCreds: 'Please enter your username and password',
    lgMsgLoggingIn: 'Logging in...',
    lgMsgLoginFailed: 'Login failed',
    lgMsgNetError: 'Network error, please try again later',
    lgMsgLoginOk: 'Logged in, redirecting...',
    lgMsgReLogin: 'Please log in again',
    lgMsgNeed6: 'Please enter the 6-digit verification code',
    lgMsgVerifying: 'Verifying...',
    lgMsgVerifyFailed: 'Verification failed',
    lgMsgGoogleNotLoaded: 'The Google sign-in component hasn\'t loaded yet, please refresh',
    lgMsgGoogleLoading: 'Signing in with Google, please wait⋯',
    lgMsgGoogleFailed: 'Google sign-in failed',
    lgMsgGoogleFailedRetry: 'Google sign-in failed, please try again later',
    lgMsgGoogleNotEnabled: 'Google sign-in isn\'t enabled in the console yet, please contact your administrator',
    lgMsgGoogleUnauthDomain: 'This domain is not authorized for Google sign-in',
    lgMsgProcessing: 'Processing⋯'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
