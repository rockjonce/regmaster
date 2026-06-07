// =============================================================================
// RegMaster · I18N (shared/i18n-signup.js)
// =============================================================================
// Page-scoped translations for public/signup.html. Registers into the shared
// window.I18N dictionary built by /shared/i18n.js. All new keys are prefixed
// with "sg". Nav/footer keys are reused from i18n.js and NOT redefined here.
// =============================================================================

(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- <title> -----
    sgPageTitle: '建立帳號 · RegMaster',

    // ----- state 1: create account -----
    sgH1: '建立帳號',
    sgHaveAccount: '已經有帳號了？<a href="/login.html">直接登入 →</a>',

    // ----- plan banner -----
    sgPlanChosen: '已選擇 ',
    sgPlanFreeName: '免費版 Free',
    sgPlanStarterName: '入門版 Starter',
    sgPlanProName: '專業版 Pro',
    sgPlanTeamName: '團隊版 Team',
    sgPlanFreeDesc: ' · 永久免費，無需信用卡',
    sgPlanUpgradeDesc: ' · 註冊後可於方案頁升級',

    // ----- steps -----
    sgStep1: '建立帳號',
    sgStep2: '驗證信箱',
    sgStep3: '完成',

    // ----- form fields -----
    sgLabelUsername: '帳號名稱',
    sgPhUsername: '例：cs_chen',
    sgHelpUsername: '3–30 字元，可用英數與底線',
    sgLabelDisplay: '顯示名稱',
    sgPhDisplay: '您的姓名',
    sgLabelEmail: '公司 / 學校信箱',
    sgPhEmail: 'you@company.com',
    sgHelpEmail: '驗證信會寄到這個信箱',
    sgLabelPhone: '電話 <span style="font:400 11px/1 var(--f-mono); color:var(--muted); margin-left:4px">（選填）</span>',
    sgPhPhone: '0912-345-678',
    sgLabelPwd: '設定密碼',
    sgPhPwd: '至少 10 字元',

    // ----- password checklist -----
    sgPwdLen: '至少 10 字元',
    sgPwdCase: '含大小寫字母',
    sgPwdNum: '含數字',
    sgPwdSym: '含特殊符號',

    // ----- consent -----
    sgAgree: '我已閱讀並同意 <a href="/terms.html" target="_blank">服務條款</a>、<a href="/EULA.html" target="_blank">使用者授權合約（EULA）</a> 與 <a href="/privacy.html" target="_blank">隱私權政策</a>，並同意 RegMaster 在符合法規前提下處理我的個人資料。',
    sgNewsletter: '我願意接收 RegMaster 的產品更新與電子報（可隨時退訂）。',

    sgSubmitBtn: '建立帳號 →',

    // ----- state 2: verify OTP -----
    sgVerifyH1: '檢查你的信箱',
    sgVerifySub: '我們寄了 6 位數驗證碼到 <b id="emailEcho">your@email.com</b><br>請於 15 分鐘內輸入完成驗證。',
    sgOtpExpire1: '驗證碼將於 ',
    sgOtpExpire2: ' 後失效 · ',
    sgResendLink: '重新寄送驗證信',
    sgVerifyBtn: '驗證並建立帳號',
    sgWrongEmailPrefix: '填錯信箱？',
    sgWrongEmailLink: '回上一步重填',

    // ----- state 3: success -----
    sgSuccessH1: '帳號建立成功！',
    sgSuccessSub: '您的 Free 方案已啟用。<br>登入後即可開始建立第一場活動。',
    sgGoLoginBtn: '前往登入 →',
    sgNoMail: '沒收到信？檢查垃圾郵件夾，或 <a href="/contact.html?topic=support" style="color:var(--acc)">聯絡客服</a>',

    // ----- footer -----
    sgFtTerms: '服務條款',
    sgFtPrivacy: '隱私權政策',
    sgFtContact: '聯絡我們',

    // ----- right panel -----
    sgRightH2: 'Free 版永久免費<br>無需信用卡，<em>立刻開始</em>。',
    sgBenefit1H: '永久免費起步',
    sgBenefit1P: 'Free 版沒有時間限制，直接建立活動、設計報名表、收 Email 通知。',
    sgBenefit2H: '需要時再升級',
    sgBenefit2P: 'AI 助理、QR 報到、線上金流、評分等進階功能，依方案逐步開放。',
    sgBenefit3H: '幾分鐘上手',
    sgBenefit3P: '拖拉式表單設計，不用寫程式，也不用看教學影片。',
    sgBenefit4H: '可隨時刪除帳號',
    sgBenefit4P: '不想用了，可於設定中一鍵刪除帳號，零留存。',
    sgLogosLabel: '適用於各類主辦單位',
    sgLgUni: '大專院校',
    sgLgGov: '政府機關',
    sgLgAssoc: '公協會',
    sgLgCorp: '企業內訓',

    // ----- dynamic JS messages -----
    sgErrUsername: '帳號名稱：3–30 字元，僅可英數與底線',
    sgErrDisplay: '請填寫顯示名稱',
    sgErrEmail: 'Email 格式不正確',
    sgErrPwdLen: '密碼至少 10 字元',
    sgErrAgree: '請勾選同意服務條款',
    sgBtnSubmitting: '送出中...',
    sgErrCreateFail: '建立失敗',
    sgErrNetwork: '網路錯誤',
    sgBtnVerifying: '驗證中...',
    sgErrOtpIncomplete: '請完整輸入 6 位數驗證碼',
    sgErrVerifyFail: '驗證失敗',
    sgResending: '正在重新寄送...',
    sgResendDone: '新的驗證碼已重新寄出，請查收信箱',
    sgResendRedo: '請回到上一步重新填寫表單（驗證碼有效 15 分鐘）'
  };

  var E = {
    // ----- <title> -----
    sgPageTitle: 'Create Account · RegMaster',

    // ----- state 1: create account -----
    sgH1: 'Create your account',
    sgHaveAccount: 'Already have an account? <a href="/login.html">Log in →</a>',

    // ----- plan banner -----
    sgPlanChosen: 'Selected ',
    sgPlanFreeName: 'Free',
    sgPlanStarterName: 'Starter',
    sgPlanProName: 'Pro',
    sgPlanTeamName: 'Team',
    sgPlanFreeDesc: ' · Free forever, no credit card',
    sgPlanUpgradeDesc: ' · Upgrade on the plans page after signing up',

    // ----- steps -----
    sgStep1: 'Create account',
    sgStep2: 'Verify email',
    sgStep3: 'Done',

    // ----- form fields -----
    sgLabelUsername: 'Username',
    sgPhUsername: 'e.g. cs_chen',
    sgHelpUsername: '3–30 characters; letters, numbers and underscore',
    sgLabelDisplay: 'Display name',
    sgPhDisplay: 'Your name',
    sgLabelEmail: 'Company / school email',
    sgPhEmail: 'you@company.com',
    sgHelpEmail: 'The verification email will be sent here',
    sgLabelPhone: 'Phone <span style="font:400 11px/1 var(--f-mono); color:var(--muted); margin-left:4px">(optional)</span>',
    sgPhPhone: '0912-345-678',
    sgLabelPwd: 'Set a password',
    sgPhPwd: 'At least 10 characters',

    // ----- password checklist -----
    sgPwdLen: 'At least 10 characters',
    sgPwdCase: 'Upper & lower case',
    sgPwdNum: 'Includes a number',
    sgPwdSym: 'Includes a symbol',

    // ----- consent -----
    sgAgree: 'I have read and agree to the <a href="/terms.html" target="_blank">Terms of Service</a>, <a href="/EULA.html" target="_blank">End-User License Agreement (EULA)</a> and <a href="/privacy.html" target="_blank">Privacy Policy</a>, and consent to RegMaster processing my personal data in compliance with applicable laws.',
    sgNewsletter: 'I\'d like to receive RegMaster product updates and the newsletter (unsubscribe anytime).',

    sgSubmitBtn: 'Create account →',

    // ----- state 2: verify OTP -----
    sgVerifyH1: 'Check your email',
    sgVerifySub: 'We sent a 6-digit verification code to <b id="emailEcho">your@email.com</b><br>Enter it within 15 minutes to finish verifying.',
    sgOtpExpire1: 'The code expires in ',
    sgOtpExpire2: ' · ',
    sgResendLink: 'Resend verification email',
    sgVerifyBtn: 'Verify and create account',
    sgWrongEmailPrefix: 'Wrong email? ',
    sgWrongEmailLink: 'Go back and re-enter',

    // ----- state 3: success -----
    sgSuccessH1: 'Account created!',
    sgSuccessSub: 'Your Free plan is now active.<br>Log in to start building your first event.',
    sgGoLoginBtn: 'Go to login →',
    sgNoMail: 'Didn\'t get the email? Check your spam folder, or <a href="/contact.html?topic=support" style="color:var(--acc)">contact support</a>',

    // ----- footer -----
    sgFtTerms: 'Terms of Service',
    sgFtPrivacy: 'Privacy Policy',
    sgFtContact: 'Contact Us',

    // ----- right panel -----
    sgRightH2: 'Free forever<br>No credit card — <em>start now</em>.',
    sgBenefit1H: 'Free forever to start',
    sgBenefit1P: 'The Free plan has no time limit — create events, design registration forms and send email notifications right away.',
    sgBenefit2H: 'Upgrade when you need to',
    sgBenefit2P: 'Advanced features like the AI assistant, QR check-in, online payments and scoring unlock progressively by plan.',
    sgBenefit3H: 'Up and running in minutes',
    sgBenefit3P: 'Drag-and-drop form design — no coding and no tutorial videos required.',
    sgBenefit4H: 'Delete your account anytime',
    sgBenefit4P: 'Done with it? Delete your account from settings in one click, with nothing left behind.',
    sgLogosLabel: 'Trusted by organizers of every kind',
    sgLgUni: 'Universities',
    sgLgGov: 'Government',
    sgLgAssoc: 'Associations',
    sgLgCorp: 'Corporate Training',

    // ----- dynamic JS messages -----
    sgErrUsername: 'Username: 3–30 characters, letters, numbers and underscore only',
    sgErrDisplay: 'Please enter a display name',
    sgErrEmail: 'Invalid email format',
    sgErrPwdLen: 'Password must be at least 10 characters',
    sgErrAgree: 'Please agree to the Terms of Service',
    sgBtnSubmitting: 'Submitting...',
    sgErrCreateFail: 'Creation failed',
    sgErrNetwork: 'Network error',
    sgBtnVerifying: 'Verifying...',
    sgErrOtpIncomplete: 'Please enter the full 6-digit code',
    sgErrVerifyFail: 'Verification failed',
    sgResending: 'Resending...',
    sgResendDone: 'A new verification code has been sent — please check your inbox',
    sgResendRedo: 'Please go back and fill in the form again (the code is valid for 15 minutes)'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
