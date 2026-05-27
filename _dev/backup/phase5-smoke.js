/**
 * Phase 5 form schema smoke
 * - Create account + comp
 * - Save a v3 formSchema
 * - Verify legacy fields back-derived correctly
 * - Read back via getFormSchema
 * - Verify legacy-to-v3 conversion of a comp that has only legacy fields
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
  const username = 'p5admin';
  const token = genToken();
  // Idempotent upsert: find existing or create with deterministic doc id
  const existing = await db.collection('accounts').where('username', '==', username).limit(1).get();
  if (!existing.empty) {
    await existing.docs[0].ref.update({ sessionToken: token });
  } else {
    await db.collection('accounts').doc('acct_' + username).set({
      username, passwordHash: hashPwd('Pwd@2026'), role: 'competition',
      displayName: 'P5 Admin', email: 'p5@example.com', emailVerified: true,
      sessionToken: token, createdAt: '2026-05-27', loginFails: 0, lockedUntil: ''
    });
  }
  await db.collection('competitions').doc('CP5A').set({
    name: 'P5 Form Test', category: '其他', isOpen: false, isVisible: false,
    deadline: '', maxTeams: 0, teamCount: 0, creator: username,
    createdAt: '2026-05-27', maxCapacityLimit: 0, capacityLimitUnlocked: false,
    config: { competitionName: 'P5 Form Test', category: '其他',
              memberCount: 1, studentFields: ['chineseName'], teacherCount: 0,
              registrationFee: 0, paymentMethods: [], customQuestions: [],
              groups: [], sessions: [] }
  });
  // A second comp with only LEGACY fields for fallback conversion test
  await db.collection('competitions').doc('CP5B').set({
    name: 'P5 Legacy Test', category: '其他', isOpen: false, isVisible: false,
    deadline: '', maxTeams: 0, teamCount: 0, creator: username,
    createdAt: '2026-05-27', maxCapacityLimit: 0, capacityLimitUnlocked: false,
    config: { competitionName: 'P5 Legacy Test', category: '其他',
              memberCount: 2, studentFields: ['chineseName','email','school'],
              teacherCount: 1, teacherFields: ['chineseName','email'],
              customQuestions: [{ q: '想了解的主題', type: 'select', req: true, opts: ['前端','後端','資料'] }],
              dietaryOptions: ['豬肉','牛肉','雞肉','全素'],
              registrationFee: 0, paymentMethods: [], groups: [], sessions: [] }
  });
  console.log('+ seeded 2 comps');

  async function call(fn, payload) {
    const r = await fetch('http://127.0.0.1:5001/regmaster-pro/us-central1/' + fn, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload })
    });
    return r.json();
  }

  // Test 1: comp B has no formSchema → fallback synthesizes from legacy
  let j = await call('getFormSchema', { compId: 'CP5B', _auth: { username, token } });
  console.log('\ngetFormSchema(CP5B) - legacy fallback:');
  console.log('  success:', j.result && j.result.success, '| source:', j.result && j.result.source);
  const synthSchema = j.result && j.result.schema;
  console.log('  sections:', (synthSchema && synthSchema.sections || []).length);
  (synthSchema.sections || []).forEach(s => {
    console.log('    [' + s.role + ']', s.title, '·', (s.fields || []).length, 'fields, repeat=' + s.repeat);
  });

  // Test 2: save v3 schema to comp A
  const v3Schema = {
    version: 'v3',
    sections: [
      { id: 'sec1', title: '學員資料', role: 'student', repeat: 2,
        fields: [
          { id: 'f1', type: 'text', label: '中文姓名', legacyKey: 'chineseName', req: true, opts: [] },
          { id: 'f2', type: 'email', label: 'Email', legacyKey: 'email', req: true, opts: [] },
          { id: 'f3', type: 'select', label: '飲食習慣', legacyKey: 'dietary', req: true, opts: ['全素','葷','海鮮'] }
        ]
      },
      { id: 'sec2', title: '附加問題', role: 'custom', repeat: 1,
        fields: [
          { id: 'f4', type: 'select', label: '報名動機', req: true, opts: ['練手','拿獎','社交','其他'] },
          { id: 'f5', type: 'textarea', label: '想對主辦方說的話', req: false, opts: [] }
        ]
      }
    ]
  };
  j = await call('saveFormSchema', { compId: 'CP5A', schema: v3Schema, _auth: { username, token } });
  console.log('\nsaveFormSchema(CP5A):');
  console.log('  success:', j.result && j.result.success);
  console.log('  derived:', JSON.stringify(j.result && j.result.derived));

  // Verify Firestore dual-write
  const cpAdoc = await db.collection('competitions').doc('CP5A').get();
  const cpAcfg = cpAdoc.data().config;
  console.log('\nFirestore state for CP5A:');
  console.log('  formSchema sections:', cpAcfg.formSchema && cpAcfg.formSchema.sections.length);
  console.log('  studentFields:', cpAcfg.studentFields, '(expected [chineseName, email, dietary])');
  console.log('  customQuestions count:', (cpAcfg.customQuestions || []).length, '(expected 2)');
  console.log('  memberCount:', cpAcfg.memberCount, '(expected 2)');
  console.log('  teacherCount:', cpAcfg.teacherCount, '(expected 0)');
  console.log('  dietaryOptions:', cpAcfg.dietaryOptions, '(expected [全素,葷,海鮮])');

  // Test 3: read back via getFormSchema (should source=v3 now)
  j = await call('getFormSchema', { compId: 'CP5A', _auth: { username, token } });
  console.log('\ngetFormSchema(CP5A) - after save:');
  console.log('  source:', j.result && j.result.source, '(expected v3)');
  console.log('  sections:', (j.result.schema.sections || []).length);

  // Test 4: cross-user denial
  const otherToken = genToken();
  const exOther = await db.collection('accounts').where('username', '==', 'p5other').limit(1).get();
  if (!exOther.empty) {
    await exOther.docs[0].ref.update({ sessionToken: otherToken });
  } else {
    await db.collection('accounts').doc('acct_p5other').set({
      username: 'p5other', passwordHash: hashPwd('Other'), role: 'competition',
      displayName: 'Other', email: 'other@example.com', emailVerified: true,
      sessionToken: otherToken, createdAt: '2026-05-27', loginFails: 0, lockedUntil: ''
    });
  }
  j = await call('saveFormSchema', { compId: 'CP5A', schema: { sections: [] }, _auth: { username: 'p5other', token: otherToken } });
  console.log('\nCross-user saveFormSchema:', j.error ? '+ DENIED: ' + j.error.message : '! LEAKED');

  process.exit(0);
})();
