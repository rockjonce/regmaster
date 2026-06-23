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
    adAiCreateFail: '建立對話失敗，請稍後再試。'
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
    adAiCreateFail: 'Failed to create the conversation, please try again later.'
  };

  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
