// =============================================================================
// RegMaster · I18N additions for /admin/ai.html (organiser AI assistant console)
// =============================================================================
// Adds adAi* keys to the shared dictionary. Loaded AFTER /shared/i18n.js.
// zh values are EXACT copies of the original page text; en values are fluent.
// Inline-markup values are applied via [data-i18n-html].
// =============================================================================
(function () {
  if (!window.I18N) return;

  var Z = {
    // ----- left column: conversation history -----
    adAiHistory: '對話歷史',
    adAiNewConv: '＋ 新對話',
    adAiNoConv: '尚無對話<br>點上方「＋ 新對話」開始',
    adAiConvDefaultTitle: '新對話',
    adAiConvNoSnippet: '(尚無訊息)',
    adAiConvUnit: '則',
    adAiConvActivity: '活動',
    adAiDelTitle: '刪除',
    // ----- center column: chat header -----
    adAiChatTitle: 'RegMaster AI 助理',
    adAiChatSub: '由 Gemini 驅動 · 可協助活動規劃 / 報名問題 / 數據分析',
    // ----- empty state -----
    adAiEmptyTitle: '有什麼可以幫你的？',
    adAiEmptyDesc: '新建對話或從左側選擇歷史對話開始。',
    adAiEmptyTitleStarted: '開始對話',
    adAiEmptyDescStarted: '從下方輸入框送出第一則訊息',
    adAiEmptyDescPlain: '新建對話或從左側選擇歷史對話開始',
    // ----- suggestion chips -----
    adAiSg1: '如何提升報名轉換率？',
    adAiSg2: '幫我擬一封報名提醒信',
    adAiSg3: '哪些功能可以提升活動體驗？',
    adAiSg4: '分析我目前的活動表現',
    // ----- input area -----
    adAiInputPlaceholder: '輸入問題⋯ (Enter 送出，Shift+Enter 換行)',
    // ----- right column: scope + knowledge base -----
    adAiScopeTitle: '查詢範圍',
    adAiScopeAdmin: '主辦後台',
    adAiCrumbHome: '主辦後台', adAiCrumbHere: 'AI 助理',
    adAiScopeComp: '特定活動',
    adAiSelectComp: '選擇活動⋯',
    adAiKbTitle: '知識庫',
    adAiKbTitleComp: '知識庫 · 此活動',
    // ----- knowledge-base items -----
    adAiKbRulesH: '📋 活動規章',
    adAiKbRulesP: '報名規則與規章內容（含上傳的規章 PDF）',
    adAiKbDescH: '📝 活動說明',
    adAiKbDescP: '活動介紹、梯次與報名截止等資訊',
    adAiKbRegDataH: '📊 報名資料與統計',
    adAiKbRegDataP1: '此活動即時報名／付款數據（',
    adAiKbRegDataP2: ' 筆），可詢問轉換率與提升建議',
    adAiKbOrgH: '🏢 主辦單位資訊',
    adAiKbOrgP: '單位名稱與聯絡方式（Email／電話）',
    adAiKbManualH: '📘 操作手冊',
    adAiKbManualP: '所有功能的詳細說明文件，點擊開啟完整手冊',
    adAiKbAllRegH: '📊 所有活動報名數據',
    adAiKbAllRegP: '跨所有活動的即時報名／付款統計，可詢問轉換率、付款問題與提升建議',
    // ----- knowledge-base helper / hint / empty text -----
    adAiKbEmptyComp: '此活動尚未設定知識庫內容（規章 / 說明），也尚無報名資料。可至活動設定補齊。',
    adAiKbPickComp: '請先於上方選擇活動 — AI 將依該活動的報名數據、規章與說明回答。',
    adAiKbLoadingComp: '載入此活動知識庫⋯',
    adAiHintAdmin: 'AI 會參考「操作手冊」與你所有活動的報名數據作答，並可提供跨活動的報名／轉換建議。',
    adAiHintCompA: 'AI 會依此活動的',
    adAiHintCompRegData: '報名數據、',
    adAiHintCompB: '規章與說明回答，並可提供報名轉換率分析與提升建議。',
    // ----- dynamic JS messages -----
    adAiAvAi: '✦',
    adAiThinking: '思考中⋯',
    adAiNoReply: '（AI 暫時無法回應，請稍後再試）',
    adAiCreating: '建立中⋯',
    adAiConfirmDel: '刪除此對話？',
    adAiConfirmDelTitle: '刪除對話',
    adAiConfirmDelOk: '刪除',
    adAiDelFail: '刪除失敗，請稍後再試。',
    adAiCreateFail: '建立對話失敗，請稍後再試。',
    // ----- 2026-09-02：載入狀態／範圍切換確認／截斷提示／mobile 抽屜 -----
    adAiLoadingConv: '載入對話中⋯',
    adAiLoadFail: '載入對話失敗，請稍後再試。',
    adAiCompDeleted: '（此活動已刪除）',
    adAiTruncated: '回答過長已被截斷，請縮小問題範圍或分段詢問。',
    adAiScopeSwitchTitle: '切換查詢範圍',
    adAiScopeSwitchMsg: '切換範圍會離開目前對話並開始新對話。原對話不會被刪除，切回原範圍即可在歷史清單找到。要繼續嗎？',
    adAiScopeSwitchOk: '開始新對話',
    adAiBusy: 'AI 回覆中，請稍候。',
    adAiHistoryBtn: '歷史',
    adAiScopeBtn: '範圍',
    adAiScopeChipPick: '未選擇活動',
    // ----- 後端錯誤碼對應文案（外審 L3）-----
    adAiErrEmpty: '請輸入問題。',
    adAiErrTooLong: '問題過長，請縮短後再送出（上限 10,000 字）。',
    adAiErrNoKey: 'AI 尚未設定，請聯絡系統管理員。',
    adAiErrApi: 'AI 暫時無法使用，請稍後再試。',
    adAiErrNoAnswer: 'AI 無法回答這個問題，請換個問法。',
    adAiErrNotFound: '找不到此活動（可能已被刪除）。',
    adAiErrAuth: '登入已失效，請重新登入。',
    adAiErrDenied: '權限不足或目前方案未包含此功能。',
    adAiErrTimeout: 'AI 回應逾時，請縮小問題範圍後再試。',
    // ----- 已刪除活動（孤兒對話）-----
    adAiCompGone: '此對話所屬的活動已被刪除，無法繼續提問；請切換範圍或開始新對話。',
    adAiKbCompGone: '此活動已被刪除，知識庫與報名資料已不存在。',
    adAiKbStatusFail: '知識庫狀態載入失敗，請稍後再試。',
    adAiScopeChipLoading: '活動載入中⋯',
    adAiCreatingWait: '新對話建立中，請稍候。'
  };

  var E = {
    // ----- left column: conversation history -----
    adAiHistory: 'Conversations',
    adAiNewConv: '＋ New chat',
    adAiNoConv: 'No conversations yet<br>Click “＋ New chat” above to start',
    adAiConvDefaultTitle: 'New chat',
    adAiConvNoSnippet: '(no messages)',
    adAiConvUnit: 'msgs',
    adAiConvActivity: 'Event',
    adAiDelTitle: 'Delete',
    // ----- center column: chat header -----
    adAiChatTitle: 'RegMaster AI Assistant',
    adAiChatSub: 'Powered by Gemini · helps with event planning / registration questions / data analysis',
    // ----- empty state -----
    adAiEmptyTitle: 'How can I help you?',
    adAiEmptyDesc: 'Start a new chat or pick one from the history on the left.',
    adAiEmptyTitleStarted: 'Start the conversation',
    adAiEmptyDescStarted: 'Send your first message from the input box below',
    adAiEmptyDescPlain: 'Start a new chat or pick one from the history on the left',
    // ----- suggestion chips -----
    adAiSg1: 'How can I improve my registration conversion rate?',
    adAiSg2: 'Help me draft a registration reminder email',
    adAiSg3: 'Which features can improve the event experience?',
    adAiSg4: 'Analyze my current event performance',
    // ----- input area -----
    adAiInputPlaceholder: 'Type a question… (Enter to send, Shift+Enter for a new line)',
    // ----- right column: scope + knowledge base -----
    adAiScopeTitle: 'Query Scope',
    adAiScopeAdmin: 'Organizer Console',
    adAiCrumbHome: 'Organizer Console', adAiCrumbHere: 'AI Assistant',
    adAiScopeComp: 'Specific Event',
    adAiSelectComp: 'Select an event…',
    adAiKbTitle: 'Knowledge Base',
    adAiKbTitleComp: 'Knowledge Base · This Event',
    // ----- knowledge-base items -----
    adAiKbRulesH: '📋 Event Regulations',
    adAiKbRulesP: 'Registration rules and regulations (including the uploaded regulations PDF)',
    adAiKbDescH: '📝 Event Description',
    adAiKbDescP: 'Event introduction, sessions, registration deadlines and more',
    adAiKbRegDataH: '📊 Registration Data & Statistics',
    adAiKbRegDataP1: 'Real-time registration / payment data for this event (',
    adAiKbRegDataP2: ' records) — ask about conversion rates and improvement tips',
    adAiKbOrgH: '🏢 Organizer Information',
    adAiKbOrgP: 'Organization name and contact details (email / phone)',
    adAiKbManualH: '📘 User Manual',
    adAiKbManualP: 'Detailed documentation for every feature — click to open the full manual',
    adAiKbAllRegH: '📊 All-Event Registration Data',
    adAiKbAllRegP: 'Real-time registration / payment statistics across all events — ask about conversion rates, payment issues and improvement tips',
    // ----- knowledge-base helper / hint / empty text -----
    adAiKbEmptyComp: 'This event has no knowledge-base content yet (regulations / description) and no registration data. You can fill these in under event settings.',
    adAiKbPickComp: 'Please select an event above first — the AI will answer based on that event’s registration data, regulations and description.',
    adAiKbLoadingComp: 'Loading this event’s knowledge base…',
    adAiHintAdmin: 'The AI answers using the User Manual and the registration data across all your events, and can offer cross-event registration / conversion suggestions.',
    adAiHintCompA: 'For this event, the AI answers based on its ',
    adAiHintCompRegData: 'registration data, ',
    adAiHintCompB: 'regulations and description, and can provide conversion-rate analysis and improvement tips.',
    // ----- dynamic JS messages -----
    adAiAvAi: '✦',
    adAiThinking: 'Thinking…',
    adAiNoReply: '(The AI is temporarily unavailable, please try again later)',
    adAiCreating: 'Creating…',
    adAiConfirmDel: 'Delete this conversation?',
    adAiConfirmDelTitle: 'Delete Conversation',
    adAiConfirmDelOk: 'Delete',
    adAiDelFail: 'Delete failed, please try again later.',
    adAiCreateFail: 'Failed to create the conversation, please try again later.',
    // ----- 2026-09-02: loading state / scope-switch confirm / truncation notice / mobile drawers -----
    adAiLoadingConv: 'Loading conversation…',
    adAiLoadFail: 'Failed to load the conversation, please try again later.',
    adAiCompDeleted: '(this event has been deleted)',
    adAiTruncated: 'The answer was too long and got cut off — please narrow the question or ask in parts.',
    adAiScopeSwitchTitle: 'Switch scope',
    adAiScopeSwitchMsg: 'Switching scope will leave this conversation and start a new one. The current conversation is not deleted — switch back to its scope to find it in the history list. Continue?',
    adAiScopeSwitchOk: 'Start new chat',
    adAiBusy: 'The AI is still replying, please wait.',
    adAiHistoryBtn: 'History',
    adAiScopeBtn: 'Scope',
    adAiScopeChipPick: 'No event selected',
    // ----- backend error codes → copy (review L3) -----
    adAiErrEmpty: 'Please enter a question.',
    adAiErrTooLong: 'The question is too long, please shorten it (limit 10,000 characters).',
    adAiErrNoKey: 'The AI is not configured yet, please contact the system administrator.',
    adAiErrApi: 'The AI is temporarily unavailable, please try again later.',
    adAiErrNoAnswer: 'The AI could not answer this question, please rephrase it.',
    adAiErrNotFound: 'This event could not be found (it may have been deleted).',
    adAiErrAuth: 'Your session has expired, please sign in again.',
    adAiErrDenied: 'Permission denied, or this feature is not included in your current plan.',
    adAiErrTimeout: 'The AI timed out — please narrow the question and try again.',
    // ----- deleted event (orphan conversation) -----
    adAiCompGone: 'The event this conversation belongs to has been deleted, so you can no longer ask questions here. Switch scope or start a new chat.',
    adAiKbCompGone: 'This event has been deleted; its knowledge base and registration data no longer exist.',
    adAiKbStatusFail: 'Failed to load the knowledge-base status, please try again later.',
    adAiScopeChipLoading: 'Loading events…',
    adAiCreatingWait: 'Creating the conversation, please wait.'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
