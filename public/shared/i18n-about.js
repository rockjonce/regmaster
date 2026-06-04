(function () {
  if (!window.I18N) return;
  var Z = {
    // ----- hero -----
    abHeroEyebrow: 'ABOUT REGMASTER',
    abHeroTitle: '讓辦活動的人，<br>能<em>專心辦活動</em>。',
    abHeroP: 'RegMaster 是<strong>廣天國際有限公司</strong>打造的線上活動報名平台。我們相信，主辦方該把時間花在內容與參與者身上，而不是表單、Excel 與一封封通知信。',
    // ----- our story -----
    abStoryEyebrow: 'OUR STORY',
    abStoryH2: '從一場 500 人的<br>競賽開始',
    abStoryLead: '廣天國際有限公司創立於 2010 年，是一家以「教育」為核心的公司（<a href="https://www.calculator.com.tw" target="_blank" rel="noopener" style="color:var(--acc)">www.calculator.com.tw</a>）。多年來，我們陪伴老師、學生與各類單位，把學習與活動辦得更好。',
    abStoryP1: '2022 年，我們正在籌辦一場 500 人的風力能源競賽。報名用表單、繳費靠 ATM 人工對帳、名單散落在好幾份 Excel、通知只能一封封發 —— 行政流程把人累壞了，真正重要的「活動內容」反而沒時間好好打磨。',
    abStoryP2: '我們想：辦活動的人從來不缺熱忱，缺的是一套讓熱忱不被瑣事消耗的工具。於是我們動手做 RegMaster，把報名、收費、對帳、通知、報到整合成一個後台，並導入 AI，讓科技實質地幫助每一個想把活動辦好的人。',
    abStoryQuote: '我們只是單純地想把一場活動辦好。每一個主辦方，都值得一套更好、更簡單的系統。',
    abStoryCite: '— 廣天國際有限公司',
    // ----- timeline -----
    abTl2010H: '廣天國際成立',
    abTl2010P: '以教育為核心，陪伴各類學習與活動。',
    abTl2022H: '500 人風力能源競賽',
    abTl2022P: '籌辦過程被繁瑣的報名與行政流程拖累，萌生自製系統的念頭。',
    abTl2324H: '打造 RegMaster',
    abTl2324P: '從自身辦活動的痛點出發，把報名、收費、對帳、通知、報到整合成一個後台。',
    abTl2025H: '導入 AI 助理',
    abTl2025P: '整合 Gemini，協助回覆報名者問題、產生摘要與洞察。',
    abTl2026H: 'RegMaster v3 上線',
    abTl2026P: '全新介面與方案制度，讓更多主辦方都能簡單上手。',
    // ----- why regmaster / metrics -----
    abWhyEyebrow: 'WHY REGMASTER',
    abWhyH2: '把複雜的行政，<br>變成幾個步驟。',
    abMetric1Lbl: '一個後台',
    abMetric1Desc: '報名、收費、對帳、通知、報到，一處搞定',
    abMetric2Lbl: '不用寫程式',
    abMetric2Desc: '拖拉式表單設計，幾分鐘就能上線',
    abMetric3Lbl: '智慧助理',
    abMetric3Desc: '由 Gemini 驅動，協助回覆與分析',
    abMetric4Lbl: '在地設計',
    abMetric4Desc: '懂統編、身分證驗證、台灣金流與對帳',
    // ----- values -----
    abValuesEyebrow: 'OUR VALUES',
    abValuesH2: '我們在意的<br>幾件事',
    abVal1H: '為主辦方省時間',
    abVal1P: '把重複的行政自動化，讓主辦方把心力放回活動內容與參與者身上。',
    abVal2H: '簡單好上手',
    abVal2P: '不需要工程師、不需要教學影片，打開就會用。複雜留給系統，簡單留給你。',
    abVal3H: '讓 AI 真正幫上忙',
    abVal3P: 'AI 不是噱頭。它幫你回答報名者的問題、摘要動態、看見該注意的地方。',
    abVal4H: '資料安全',
    abVal4P: '全程 SSL 加密傳輸、嚴謹的存取控制。客戶與報名者的個資，是我們最在意的事。',
    abVal5H: '誠實的定價',
    abVal5P: 'Free 版永久免費，價目表寫什麼就是什麼，沒有藏起來的隱藏費用。',
    abVal6H: '在地深耕',
    abVal6P: '我們在台灣，懂統編、發票、退費、身分驗證與本地金流，而不是照搬國外的 SaaS。',
    // ----- closing cta -----
    abCtaH2: '準備好辦下一場活動了嗎？',
    abCtaP: 'Free 版永久免費，幾分鐘就能讓你的活動上線。',
    abCtaFree: '免費開始',
    abCtaExplore: '探索活動',
    // ----- page title -----
    abPageTitle: '關於我們 · RegMaster'
  };
  var E = {
    // ----- hero -----
    abHeroEyebrow: 'ABOUT REGMASTER',
    abHeroTitle: 'So the people who run events<br>can <em>focus on the event</em>.',
    abHeroP: 'RegMaster is the online event registration platform built by <strong>Kuang-Tien International Co., Ltd.</strong> We believe organizers should spend their time on content and on their attendees — not on forms, spreadsheets and one notification email after another.',
    // ----- our story -----
    abStoryEyebrow: 'OUR STORY',
    abStoryH2: 'It started with a<br>500-person contest',
    abStoryLead: 'Kuang-Tien International was founded in 2010 as a company built around education (<a href="https://www.calculator.com.tw" target="_blank" rel="noopener" style="color:var(--acc)">www.calculator.com.tw</a>). For years we have worked alongside teachers, students and organizations of every kind to make learning and events better.',
    abStoryP1: 'In 2022, we were organizing a 500-person wind-energy competition. Registrations came in through a form, payments were reconciled by hand against ATM transfers, the roster was scattered across several spreadsheets, and notices had to be sent one at a time. The admin work wore everyone out — and the thing that really mattered, the event itself, never got the attention it deserved.',
    abStoryP2: 'We realized organizers never lack passion; what they lack is a set of tools that keeps that passion from being drained by busywork. So we built RegMaster, bringing registration, payment, reconciliation, notifications and check-in together in a single dashboard — and added AI, so technology genuinely helps everyone who wants to run a great event.',
    abStoryQuote: 'We simply wanted to run one event well. Every organizer deserves a better, simpler system.',
    abStoryCite: '— Kuang-Tien International Co., Ltd.',
    // ----- timeline -----
    abTl2010H: 'Kuang-Tien International founded',
    abTl2010P: 'Built around education, supporting learning and events of every kind.',
    abTl2022H: '500-person wind-energy contest',
    abTl2022P: 'Bogged down by tedious registration and admin work, we set out to build our own system.',
    abTl2324H: 'Building RegMaster',
    abTl2324P: 'Starting from our own event-running pain points, we unified registration, payment, reconciliation, notifications and check-in into one dashboard.',
    abTl2025H: 'AI assistant introduced',
    abTl2025P: 'Integrated Gemini to help answer registrant questions and generate summaries and insights.',
    abTl2026H: 'RegMaster v3 launches',
    abTl2026P: 'A brand-new interface and plan structure, so even more organizers can get started with ease.',
    // ----- why regmaster / metrics -----
    abWhyEyebrow: 'WHY REGMASTER',
    abWhyH2: 'Complex admin work,<br>turned into a few steps.',
    abMetric1Lbl: 'One dashboard',
    abMetric1Desc: 'Registration, payment, reconciliation, notices and check-in — all in one place',
    abMetric2Lbl: 'No coding',
    abMetric2Desc: 'Drag-and-drop form design, live in minutes',
    abMetric3Lbl: 'Smart assistant',
    abMetric3Desc: 'Powered by Gemini to help with replies and analysis',
    abMetric4Lbl: 'Built for Taiwan',
    abMetric4Desc: 'Understands business tax IDs, ID verification, local payments and reconciliation',
    // ----- values -----
    abValuesEyebrow: 'OUR VALUES',
    abValuesH2: 'A few things<br>we care about',
    abVal1H: 'Save organizers time',
    abVal1P: 'Automate the repetitive admin work so organizers can put their energy back into the event and its attendees.',
    abVal2H: 'Simple to pick up',
    abVal2P: 'No engineers, no tutorial videos — open it and you can use it. We keep the complexity in the system and the simplicity for you.',
    abVal3H: 'Make AI genuinely useful',
    abVal3P: 'AI is not a gimmick here. It answers registrants for you, summarizes activity, and surfaces the things worth your attention.',
    abVal4H: 'Data security',
    abVal4P: 'End-to-end SSL encryption and strict access control. The personal data of our customers and registrants is what we care about most.',
    abVal5H: 'Honest pricing',
    abVal5P: 'The Free plan is free forever, the price list says exactly what you pay, and there are no hidden fees.',
    abVal6H: 'Rooted in Taiwan',
    abVal6P: 'We are based in Taiwan and understand business tax IDs, invoices, refunds, identity verification and local payments — not a foreign SaaS dropped in as-is.',
    // ----- closing cta -----
    abCtaH2: 'Ready to run your next event?',
    abCtaP: 'The Free plan is free forever, and your event can be live in minutes.',
    abCtaFree: 'Start free',
    abCtaExplore: 'Explore events',
    // ----- page title -----
    abPageTitle: 'About Us · RegMaster'
  };
  Object.keys(Z).forEach(function (k) { window.I18N.zh[k] = Z[k]; });
  Object.keys(E).forEach(function (k) { window.I18N.en[k] = E[k]; });
})();
