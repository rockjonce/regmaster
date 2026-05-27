/**
 * Phase 4 admin smoke test
 * Seeds 3 comps + 14 teams under 'phase4admin', then exercises:
 *   listCompetitions / getDashboardStats / getAiInsights / getTodoList
 * + cross-user denial.
 */
const admin = require('firebase-admin');
const crypto = require('crypto');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
admin.initializeApp({ projectId: 'regmaster-pro' });
const db = admin.firestore();
const hashPwd = p => crypto.createHash('sha256').update(p).digest('hex');
const genToken = () => crypto.randomBytes(32).toString('hex');

(async () => {
  const fetch = (await import('node-fetch')).default;
  const username = 'phase4admin';
  const password = 'AdminPwd@2026';
  const token = genToken();

  await db.collection('accounts').add({
    username, passwordHash: hashPwd(password), role: 'competition',
    displayName: 'Phase 4 Admin', email: 'phase4@example.com',
    emailVerified: true, sessionToken: token,
    createdAt: '2026-05-27', loginFails: 0, lockedUntil: ''
  });
  console.log('+ created account', username);

  const inDays = d => new Date(Date.now() + 86400000 * d).toISOString().slice(0, 10);

  await db.collection('competitions').doc('CL4FULL').set({
    name: '即將額滿黑客松 2026', category: '程式競賽', isOpen: true, isVisible: true,
    deadline: inDays(2), maxTeams: 10, teamCount: 9, creator: username,
    createdAt: '2026-05-27', maxCapacityLimit: 10, capacityLimitUnlocked: false,
    config: {
      competitionName: '即將額滿黑客松 2026', category: '程式競賽',
      competitionDate: '2026-06-15', deadline: inDays(2),
      memberCount: 1, studentFields: ['chineseName', 'email'], teacherCount: 0,
      registrationFee: 0, paymentMethods: [], customQuestions: [], groups: [], sessions: []
    }
  });
  await db.collection('competitions').doc('CL4LOW').set({
    name: '春季程式競賽 v3 smoke', category: '程式競賽', isOpen: true, isVisible: true,
    deadline: inDays(5), maxTeams: 50, teamCount: 5, creator: username,
    createdAt: '2026-05-27', maxCapacityLimit: 50, capacityLimitUnlocked: false,
    config: {
      competitionName: '春季程式競賽 v3 smoke', category: '程式競賽',
      competitionDate: '2026-06-18', deadline: inDays(5),
      memberCount: 1, studentFields: ['chineseName', 'email'], teacherCount: 0,
      registrationFee: 600, paymentMethods: ['atm'], bankInfo: {},
      customQuestions: [], groups: [], sessions: []
    }
  });
  await db.collection('competitions').doc('CL4DRAFT').set({
    name: '草稿活動', category: '其他', isOpen: false, isVisible: false,
    deadline: '', maxTeams: 0, teamCount: 0, creator: username,
    createdAt: '2026-05-27', maxCapacityLimit: 300, capacityLimitUnlocked: false,
    config: {
      competitionName: '草稿活動', category: '其他',
      memberCount: 1, studentFields: ['chineseName'], teacherCount: 0,
      registrationFee: 0, paymentMethods: [], customQuestions: [], groups: [], sessions: []
    }
  });

  for (let i = 0; i < 9; i++) {
    const tid = 'T4F' + String(i).padStart(3, '0');
    await db.collection('teams').doc(tid).set({
      teamId: tid, compId: 'CL4FULL', registrationTime: new Date().toISOString(),
      teamNameCN: '隊伍 ' + (i + 1), status: '正取',
      paymentStatus: i < 5 ? '已確認' : '待確認', paymentMethod: '', password: 'p',
      selectedSessions: [0], customAnswers: {}
    });
    await db.collection('members').add({
      teamId: tid, compId: 'CL4FULL', role: '學生', seq: 1,
      chineseName: '學員' + i, email: 'student' + i + '@example.com'
    });
  }
  for (let i = 0; i < 5; i++) {
    const tid = 'T4L' + String(i).padStart(3, '0');
    await db.collection('teams').doc(tid).set({
      teamId: tid, compId: 'CL4LOW', registrationTime: new Date().toISOString(),
      teamNameCN: '低報名 ' + (i + 1), status: '正取',
      paymentStatus: '待確認', paymentMethod: '', password: 'p',
      selectedSessions: [0], customAnswers: {}
    });
  }
  console.log('+ created 3 comps + 14 teams');

  async function call(fn, payload) {
    const url = 'http://127.0.0.1:5001/regmaster-pro/us-central1/' + fn;
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload })
    });
    return r.json();
  }

  // listCompetitions
  let j = await call('listCompetitions', { _auth: { username, token } });
  console.log('\nlistCompetitions:', (j.result || []).length, 'comps');
  (j.result || []).forEach(c => console.log('  -', c.compId, '|', c.name, '| open:', c.isOpen, '| teamCount:', c.teamCount));

  // getDashboardStats
  j = await call('getDashboardStats', { compId: 'CL4FULL', _auth: { username, token } });
  console.log('\ngetDashboardStats(CL4FULL):');
  console.log('  total:', j.result && j.result.total, '(expected 9)');
  console.log('  accepted:', j.result && j.result.accepted);
  console.log('  payWait:', j.result && j.result.payWait, '(expected 4)');

  // getAiInsights
  j = await call('getAiInsights', { _auth: { username, token } });
  const insights = (j.result && j.result.insights) || [];
  console.log('\ngetAiInsights:', insights.length, 'insights');
  insights.forEach(i => console.log('  [' + i.severity + ']', i.title));

  // getTodoList
  j = await call('getTodoList', { _auth: { username, token } });
  const todos = (j.result && j.result.todos) || [];
  console.log('\ngetTodoList:', todos.length, 'todos');
  todos.forEach(t => console.log('  [' + t.priority + ']', t.title));

  // Cross-user denial
  const otherToken = genToken();
  await db.collection('accounts').add({
    username: 'otherUser', passwordHash: hashPwd('Other@2026'), role: 'competition',
    displayName: 'Other', email: 'other@example.com', emailVerified: true,
    sessionToken: otherToken, createdAt: '2026-05-27', loginFails: 0, lockedUntil: ''
  });
  j = await call('getDashboardStats', { compId: 'CL4FULL', _auth: { username: 'otherUser', token: otherToken } });
  console.log('\nCross-user (other → CL4FULL):', j.error ? '+ DENIED: ' + j.error.message : '! LEAKED');
  j = await call('getAiInsights', { _auth: { username: 'otherUser', token: otherToken } });
  console.log('Cross-user getAiInsights:', (j.result && j.result.insights || []).length, 'insights (expected 0)');

  process.exit(0);
})();
