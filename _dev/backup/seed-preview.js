/**
 * seed-preview.js — Local emulator preview seed data
 * =============================================================================
 * Purpose: populate the LOCAL Firebase emulator (Firestore @ 127.0.0.1:8085,
 * Functions @ 127.0.0.1:5001) with realistic demo data so the user can click
 * through the v3 UI for manual verification.
 *
 * SAFE: talks ONLY to the emulator (FIRESTORE_EMULATOR_HOST is forced below).
 * It will refuse to run if that env points anywhere else. Never touches prod.
 *
 * Idempotent: re-running wipes the CDEMO* demo data first, then re-creates it.
 *
 * Run:   node _dev/backup/seed-preview.js     (emulator must be running first)
 *
 * Login accounts it creates:
 *   - sys  / Sys@2026    (role: system     — sees ALL orgs, super-admin pages)
 *   - demo / Demo@2026   (role: competition — organizer, owns the demo events)
 * =============================================================================
 */
'use strict';

const admin = require('firebase-admin');
const crypto = require('crypto');

// ---- Force emulator target (refuse to run against prod) ---------------------
const EMU_FS = '127.0.0.1:8085';
const EMU_FN = 'http://127.0.0.1:5001/regmaster-pro/us-central1';
process.env.FIRESTORE_EMULATOR_HOST = EMU_FS;
if (process.env.FIRESTORE_EMULATOR_HOST !== EMU_FS) {
  console.error('REFUSING: FIRESTORE_EMULATOR_HOST is not the local emulator.');
  process.exit(1);
}

admin.initializeApp({ projectId: 'regmaster-pro' });
const db = admin.firestore();

const hashPwd = p => crypto.createHash('sha256').update(p).digest('hex');
const genToken = () => crypto.randomBytes(32).toString('hex');
const fmtNow = () => new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

async function callFn(name, payload) {
  const r = await fetch(EMU_FN + '/' + name, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: payload })
  });
  const j = await r.json();
  if (j.error) throw new Error(name + ' -> ' + JSON.stringify(j.error));
  return j.result;
}

async function upsertAccount(username, password, role, displayName, email) {
  const token = genToken();
  const existing = await db.collection('accounts').where('username', '==', username).limit(1).get();
  const base = {
    username, passwordHash: hashPwd(password), role, displayName,
    email, emailVerified: true, sessionToken: token,
    createdAt: fmtNow(), loginFails: 0, lockedUntil: ''
  };
  if (!existing.empty) { await existing.docs[0].ref.set(base, { merge: true }); }
  else { await db.collection('accounts').doc('acct_' + username).set(base); }
  console.log('  account:', username, '/', password, '(' + role + ')');
}

async function wipeDemo() {
  // Delete CDEMO* competitions and their downstream teams/members/scores
  const comps = await db.collection('competitions').get();
  const demoCompIds = comps.docs.filter(d => d.id.startsWith('CDEMO')).map(d => d.id);
  for (const cid of demoCompIds) await db.collection('competitions').doc(cid).delete();

  for (const col of ['teams', 'members', 'scores', 'campaigns', 'announcements']) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    let n = 0;
    snap.docs.forEach(d => {
      const cid = d.data().compId;
      if (cid && String(cid).startsWith('CDEMO')) { batch.delete(d.ref); n++; }
    });
    if (n) await batch.commit();
  }
  // Demo licenses
  const lic = await db.collection('licenses').where('activatedBy', '==', 'demo').get();
  for (const d of lic.docs) await d.ref.delete();
  console.log('  wiped prior CDEMO* demo data');
}

function v3FormSchema() {
  return {
    version: 'v3',
    sections: [
      { id: 'sec_student', title: '學員資料', desc: '參賽學生的基本資料', role: 'student', repeat: 2,
        fields: [
          { id: 'chineseName', type: 'text',  label: '中文姓名', legacyKey: 'chineseName', req: true,  opts: [], help: '', size: 'half' },
          { id: 'email',       type: 'email', label: 'Email',    legacyKey: 'email',       req: true,  opts: [], help: '', size: 'half' },
          { id: 'school',      type: 'text',  label: '就讀學校', legacyKey: 'school',      req: true,  opts: [], help: '', size: 'half' },
          { id: 'dietary',     type: 'select',label: '飲食習慣', legacyKey: 'dietary',     req: false, opts: ['葷食','素食','海鮮'], help: '', size: 'half' }
        ]
      },
      { id: 'sec_teacher', title: '指導老師', desc: '帶隊教練資料', role: 'teacher', repeat: 1,
        fields: [
          { id: 'tname',  type: 'text',  label: '老師姓名', legacyKey: 'chineseName', req: true,  opts: [], help: '', size: 'half' },
          { id: 'temail', type: 'email', label: '老師 Email', legacyKey: 'email',     req: true,  opts: [], help: '', size: 'half' }
        ]
      },
      { id: 'sec_custom', title: '附加問題', desc: '主辦方額外想了解的資訊', role: 'custom', repeat: 1,
        fields: [
          { id: 'motivation', type: 'select', label: '報名動機', req: true,  opts: ['興趣','競賽經驗','升學加分','其他'], help: '', size: 'full' },
          { id: 'tshirt',     type: 'select', label: 'T-Shirt 尺寸', req: false, opts: ['S','M','L','XL'], help: '', size: 'half' }
        ]
      }
    ]
  };
}

async function main() {
  console.log('Seeding LOCAL emulator (' + EMU_FS + ')\n');

  console.log('[1] accounts');
  await upsertAccount('sys',  'Sys@2026',  'system',      '系統管理員', 'sys@example.com');
  await upsertAccount('demo', 'Demo@2026', 'competition', 'Demo 主辦方', 'demo@example.com');

  console.log('[2] wipe + license');
  await wipeDemo();
  await db.collection('licenses').add({
    code: 'DEMO-LIFETIME', type: 'subscription', years: 99, status: '已啟用',
    activatedBy: 'demo', activatedAt: fmtNow(), expiresAt: '', createdAt: fmtNow()
  });
  console.log('  granted lifetime license -> demo');

  console.log('[3] competitions');
  // --- CDEMO1: open + v3 formSchema, sessions, fee ---
  await db.collection('competitions').doc('CDEMO1').set({
    name: '2026 全國機器人大賽', category: '競賽', isOpen: true, isVisible: true,
    deadline: '2026-12-31', maxTeams: 30, teamCount: 0, creator: 'demo',
    createdAt: '2026-05-01', maxCapacityLimit: 300, capacityLimitUnlocked: false,
    viewCount: 128,
    config: {
      competitionName: '2026 全國機器人大賽', category: '競賽', eventType: 'team_coach',
      isVisible: true, openDate: '2026-05-01', competitionDate: '2026-08-15',
      description: '<h2>賽事簡介</h2><p>面向全國中小學的機器人競技賽，分國小組與國中組。</p><p>歡迎踴躍報名！</p>',
      groups: ['國小組', '國中組'], requireTeamNameCN: true, requireTeamNameEN: false,
      memberCount: 2, studentFields: ['chineseName', 'email', 'school', 'dietary'],
      teacherCount: 1, teacherFields: ['chineseName', 'email'],
      dietaryOptions: ['葷食', '素食', '海鮮'], tshirtOptions: ['S', 'M', 'L', 'XL'],
      customQuestions: [
        { q: '報名動機', type: 'select', req: true, opts: ['興趣', '競賽經驗', '升學加分', '其他'] },
        { q: 'T-Shirt 尺寸', type: 'select', req: false, opts: ['S', 'M', 'L', 'XL'] }
      ],
      registrationFee: 500, paymentMethods: ['transfer'],
      bankInfo: { bank: '玉山銀行 (808)', account: '1234-567-890123', name: 'Demo 主辦方' },
      creditCardLink: '', posterUrl: '', sessions: [], formSchema: v3FormSchema()
    }
  });
  // --- CDEMO2: open, LEGACY-only config (no formSchema → tests legacy→v3 derive) ---
  await db.collection('competitions').doc('CDEMO2').set({
    name: 'AI 創新工作坊', category: '研討會', isOpen: true, isVisible: true,
    deadline: '2026-11-30', maxTeams: 50, teamCount: 0, creator: 'demo',
    createdAt: '2026-05-10', maxCapacityLimit: 300, capacityLimitUnlocked: false,
    viewCount: 64,
    config: {
      competitionName: 'AI 創新工作坊', category: '研討會', eventType: 'single_no_coach',
      isVisible: true, openDate: '2026-05-10', competitionDate: '2026-09-20',
      description: '一日 AI 實作工作坊，適合對生成式 AI 有興趣的開發者。',
      groups: [], requireTeamNameCN: false, requireTeamNameEN: false,
      memberCount: 1, studentFields: ['chineseName', 'email', 'school'],
      teacherCount: 0, customQuestions: [
        { q: '熟悉的程式語言', type: 'select', req: true, opts: ['Python', 'JavaScript', 'Java', '其他'] }
      ],
      dietaryOptions: ['葷食', '素食'], registrationFee: 0, paymentMethods: [], sessions: []
    }
  });
  // --- CDEMO3: draft (not open, not visible) ---
  await db.collection('competitions').doc('CDEMO3').set({
    name: '草稿活動（未發布）', category: '其他', isOpen: false, isVisible: false,
    deadline: '', maxTeams: 0, teamCount: 0, creator: 'demo',
    createdAt: '2026-05-25', maxCapacityLimit: 300, capacityLimitUnlocked: false,
    config: {
      competitionName: '草稿活動（未發布）', category: '其他', eventType: 'single_no_coach',
      isVisible: false, memberCount: 1, studentFields: ['chineseName'], teacherCount: 0,
      customQuestions: [], registrationFee: 0, paymentMethods: [], groups: [], sessions: []
    }
  });
  console.log('  CDEMO1 (open, v3 schema) / CDEMO2 (open, legacy) / CDEMO3 (draft)');

  console.log('[4] registrations (via submitRegistration callable)');
  const reg1 = [
    { teamNameCN: '鋼鐵雄心', group: '國中組',
      students: [
        { chineseName: '王小明', email: 'ming@example.com', school: '建國中學', dietary: '葷食' },
        { chineseName: '李小華', email: 'hua@example.com',  school: '建國中學', dietary: '素食' }
      ],
      teachers: [{ chineseName: '張老師', email: 'teacher.zhang@example.com' }],
      paymentMethod: 'transfer', remitterName: '王小明', remitterBank: '玉山', remitterAccount: '901234',
      customAnswers: { '報名動機': '競賽經驗', 'T-Shirt 尺寸': 'L' } },
    { teamNameCN: '未來戰隊', group: '國小組',
      students: [
        { chineseName: '陳大同', email: 'datong@example.com', school: '中正國小', dietary: '海鮮' },
        { chineseName: '林美美', email: 'mei@example.com',     school: '中正國小', dietary: '葷食' }
      ],
      teachers: [{ chineseName: '黃老師', email: 'teacher.huang@example.com' }],
      paymentMethod: 'transfer', remitterName: '陳大同', remitterBank: '台新', remitterAccount: '556677',
      customAnswers: { '報名動機': '興趣', 'T-Shirt 尺寸': 'M' } },
    { teamNameCN: '電光火石', group: '國中組',
      students: [
        { chineseName: '吳啟翔', email: 'qixiang@example.com', school: '師大附中', dietary: '葷食' },
        { chineseName: '蔡宜君', email: 'yijun@example.com',   school: '師大附中', dietary: '素食' }
      ],
      teachers: [{ chineseName: '劉老師', email: 'teacher.liu@example.com' }],
      paymentMethod: 'transfer', remitterName: '吳啟翔', remitterBank: '國泰', remitterAccount: '112233',
      customAnswers: { '報名動機': '升學加分', 'T-Shirt 尺寸': 'S' } }
  ];
  const team1Ids = [];
  for (const fd of reg1) {
    const res = await callFn('submitRegistration', { compId: 'CDEMO1', fd });
    if (res && res.success) { team1Ids.push(res.teamId); console.log('  + CDEMO1 team', res.teamId, fd.teamNameCN, '(' + res.status + ')'); }
    else console.log('  ! CDEMO1 reg failed:', JSON.stringify(res));
  }

  const reg2 = [
    { teamNameCN: '', students: [{ chineseName: '趙志強', email: 'zhao@example.com', school: '台灣大學' }],
      teachers: [], paymentMethod: '', customAnswers: { '熟悉的程式語言': 'Python' } },
    { teamNameCN: '', students: [{ chineseName: '孫雅婷', email: 'sun@example.com', school: '政治大學' }],
      teachers: [], paymentMethod: '', customAnswers: { '熟悉的程式語言': 'JavaScript' } }
  ];
  for (const fd of reg2) {
    const res = await callFn('submitRegistration', { compId: 'CDEMO2', fd });
    if (res && res.success) console.log('  + CDEMO2 team', res.teamId, '(' + res.status + ')');
    else console.log('  ! CDEMO2 reg failed:', JSON.stringify(res));
  }

  console.log('[5] judge scores for CDEMO1 (via submitJudgeScore as demo)');
  const demoAcct = await db.collection('accounts').where('username', '==', 'demo').limit(1).get();
  const demoToken = demoAcct.docs[0].data().sessionToken;
  const scoreItems = [
    { key: 'creativity', label: '創意' }, { key: 'technical', label: '技術' },
    { key: 'completion', label: '完成度' }, { key: 'presentation', label: '簡報' }
  ];
  const scoreSets = [[88, 90, 85, 80], [75, 82, 78, 88], [92, 85, 90, 87]];
  for (let i = 0; i < team1Ids.length; i++) {
    const items = scoreItems.map((it, j) => ({ key: it.key, label: it.label, score: scoreSets[i][j], maxScore: 100, weight: 1 }));
    const total = scoreSets[i].reduce((a, b) => a + b, 0);
    try {
      const res = await callFn('submitJudgeScore', {
        compId: 'CDEMO1', teamId: team1Ids[i], items, totalScore: total,
        comment: '表現優異', _auth: { username: 'demo', token: demoToken }
      });
      console.log('  + score', team1Ids[i], '=', total, res && res.success ? '' : JSON.stringify(res));
    } catch (e) { console.log('  ! score failed:', e.message); }
  }

  console.log('\nDONE. Login at http://localhost:5000  ->  demo / Demo@2026  (or sys / Sys@2026)\n');
  process.exit(0);
}

main().catch(e => { console.error('SEED ERROR:', e); process.exit(1); });
