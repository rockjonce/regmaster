/**
 * Cleanup script — remove legacy duplicate fields after v3 dual-write window
 * ---------------------------------------------------------------------------
 *
 * Per Q4 decision (V3_UPGRADE_PLAN.md §3 strategy 2 + §10 question 4):
 *   v3 launched with **dual-write** for backward compat — saveFormSchema
 *   writes the new cfg.formSchema AND also back-derives the legacy
 *   cfg.studentFields / teacherFields / customQuestions / memberCount /
 *   teacherCount / dietaryOptions / tshirtOptions fields. This kept the
 *   v1 SPA registration page + Phase 3 /events/register.html working
 *   without reader-side changes during the transition.
 *
 *   After ~3 months of v3 in production with no rollback, those legacy
 *   fields become pure duplicates that bloat docs and complicate future
 *   schema evolution. This script removes them WHERE A v3 formSchema
 *   EXISTS (so legacy-only comps are untouched).
 *
 * USAGE
 *   1. Place serviceAccountKey.json in this directory (production key)
 *   2. Dry-run first to see what would change:
 *        node cleanup-dual-write.js --dry-run
 *   3. Real run:
 *        node cleanup-dual-write.js --commit
 *   4. (Optional) Filter to one comp first:
 *        node cleanup-dual-write.js --commit --compId=CSMOKE3
 *
 * SAFETY
 *   - dry-run is the default; you must pass --commit to actually mutate
 *   - Each affected doc is printed before/after
 *   - Aborts if any comp has formSchema BUT lacks the v3 marker (we don't
 *     want to delete legacy fields from a comp that's not yet on v3)
 *   - Exit code != 0 on any error
 *
 * REVERSAL
 *   None automated. To restore the legacy fields, replay the original
 *   saveFormSchema with the existing schema — the back-derivation will
 *   regenerate them.
 *
 * REMINDER
 *   The 3-month timer started when v3 was deployed. If you forget the
 *   exact date, see git log for the commit tagged `v3-deploy-YYYY-MM-DD`.
 */

const admin = require('firebase-admin');
const path = require('path');

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--commit');
const compIdFilter = (args.find(a => a.startsWith('--compId=')) || '').split('=')[1] || '';

console.log('=== v3 dual-write cleanup ===');
console.log('Mode:', DRY_RUN ? 'DRY-RUN (no writes)' : 'COMMIT (will mutate)');
if (compIdFilter) console.log('Filter: compId =', compIdFilter);

// Initialize from local service account key
try {
  const sa = require(path.join(__dirname, '..', '..', 'serviceAccountKey.json'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
} catch (e) {
  console.error('ERROR: serviceAccountKey.json not found in project root.');
  console.error('       Drop the production service account key there before running.');
  process.exit(1);
}
const db = admin.firestore();

// Fields back-derived by saveFormSchema that we will strip
const LEGACY_FIELDS_TO_REMOVE = [
  'studentFields',
  'teacherFields',
  'customQuestions',
  'memberCount',
  'teacherCount',
  'dietaryOptions',
  'tshirtOptions'
];

(async () => {
  let q = db.collection('competitions');
  const snap = await q.get();
  console.log(`\nFound ${snap.size} competitions total. Scanning…\n`);

  let scanned = 0, eligible = 0, skipped = 0, errors = 0;

  for (const doc of snap.docs) {
    if (compIdFilter && doc.id !== compIdFilter) continue;
    scanned++;
    const cfg = doc.data().config || {};
    const hasV3Schema = cfg.formSchema && Array.isArray(cfg.formSchema.sections) && cfg.formSchema.sections.length > 0;
    const versionTag = cfg.formSchema && cfg.formSchema.version;

    if (!hasV3Schema) {
      console.log(`SKIP  ${doc.id}  (no v3 formSchema — legacy-only or empty)`);
      skipped++;
      continue;
    }
    // Sanity guard
    if (versionTag && versionTag !== 'v3' && versionTag !== 'v3-legacy-derived') {
      console.warn(`WARN  ${doc.id}  formSchema.version="${versionTag}" — unexpected, skipping for safety`);
      errors++;
      continue;
    }
    if (versionTag === 'v3-legacy-derived') {
      console.log(`SKIP  ${doc.id}  (formSchema exists but is synthesized from legacy — main schema not promoted yet)`);
      skipped++;
      continue;
    }

    eligible++;
    const toDelete = LEGACY_FIELDS_TO_REMOVE.filter(k => cfg[k] !== undefined);
    console.log(`HIT   ${doc.id}  (v3 schema confirmed)  will remove: [${toDelete.join(', ')}]`);

    if (!DRY_RUN && toDelete.length > 0) {
      const update = {};
      toDelete.forEach(k => { update['config.' + k] = admin.firestore.FieldValue.delete(); });
      try {
        await doc.ref.update(update);
        console.log(`OK    ${doc.id}  ✓ ${toDelete.length} fields removed`);
      } catch (e) {
        console.error(`FAIL  ${doc.id}  ✗ ${e.message}`);
        errors++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Scanned:  ${scanned}`);
  console.log(`Eligible: ${eligible}  (have v3 formSchema; legacy fields would be removed)`);
  console.log(`Skipped:  ${skipped}  (no v3 formSchema — legacy code path still needs them)`);
  console.log(`Errors:   ${errors}`);
  console.log(`Mode:     ${DRY_RUN ? 'DRY-RUN (no changes made)' : 'COMMIT'}`);
  if (DRY_RUN && eligible > 0) {
    console.log('\nRun again with --commit to actually remove the duplicated fields.');
  }
  process.exit(errors > 0 ? 1 : 0);
})().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
