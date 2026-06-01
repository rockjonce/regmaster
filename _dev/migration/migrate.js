// One-off migration: regmaster-pro  ->  regmaster-v3 , activity C3EJ62D.
// READ-ONLY on pro (GET / runQuery only). Writes ONLY to v3.
// Copies each doc's typed `fields` verbatim and preserves original doc IDs,
// so teamId / pftf: / pfpdf: / chunk parentId references stay valid.
const TOKEN = process.env.GTOKEN;
const SRC = "regmaster-pro", DST = "regmaster-v3";
const COMP = "C3EJ62D", NEW_CREATOR = "Xenia";
if (!TOKEN) { console.error("Missing GTOKEN"); process.exit(1); }

const base = p => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;
const H = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };

async function get(proj, path) {
  const r = await fetch(base(proj) + "/" + path, { headers: H });
  return r.json();
}
async function runQuery(proj, collectionId, field, value) {
  const body = { structuredQuery: { from: [{ collectionId }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } } } };
  const r = await fetch(base(proj) + ":runQuery", { method: "POST", headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  return (j || []).filter(x => x.document).map(x => x.document);
}
// PATCH (upsert) the given typed fields to v3 at collection/id.
async function put(path, fields) {
  const r = await fetch(base(DST) + "/" + path, { method: "PATCH", headers: H, body: JSON.stringify({ fields }) });
  const j = await r.json();
  if (j.error) throw new Error(path + " -> " + JSON.stringify(j.error));
  return j;
}
const idOf = doc => doc.name.split("/").pop();

(async () => {
  const report = {};

  // 1) Competition doc (override creator -> Xenia; keep everything else, incl. isVisible/isOpen)
  const comp = await get(SRC, "competitions/" + COMP);
  if (!comp.fields) throw new Error("pro competition not found");
  const compFields = comp.fields;
  const posterDocId = (compFields.posterDocId || {}).stringValue || "";
  const pdfDocId = (compFields.pdfDocId || {}).stringValue || "";
  compFields.creator = { stringValue: NEW_CREATOR };
  await put("competitions/" + COMP, compFields);
  report.competition = COMP + " (creator=" + NEW_CREATOR + ")";

  // 2) Teams
  const teams = await runQuery(SRC, "teams", "compId", COMP);
  for (const d of teams) await put("teams/" + idOf(d), d.fields);
  report.teams = teams.length;

  // 3) Members
  const members = await runQuery(SRC, "members", "compId", COMP);
  for (const d of members) await put("members/" + idOf(d), d.fields);
  report.members = members.length;

  // 4) Announcements
  const anns = await runQuery(SRC, "announcements", "compId", COMP);
  for (const d of anns) await put("announcements/" + idOf(d), d.fields);
  report.announcements = anns.length;

  // 5) Poster (single doc)
  if (posterDocId) {
    const p = await get(SRC, "posterFiles/" + posterDocId);
    if (p.fields) { await put("posterFiles/" + posterDocId, p.fields); report.poster = posterDocId; }
  }

  // 6) Rules PDF main + chunks (chunks: pdfFiles where parentId == pdfDocId)
  if (pdfDocId) {
    const main = await get(SRC, "pdfFiles/" + pdfDocId);
    if (main.fields) await put("pdfFiles/" + pdfDocId, main.fields);
    const chunks = await runQuery(SRC, "pdfFiles", "parentId", pdfDocId);
    for (const c of chunks) await put("pdfFiles/" + idOf(c), c.fields);
    report.pdf = { main: pdfDocId, chunks: chunks.length };
  }

  // 7) Team uploaded files: main docs (teamFiles where compId), each + its chunks (parentId == teamId)
  const tfMains = await runQuery(SRC, "teamFiles", "compId", COMP);
  let tfChunkCount = 0;
  for (const d of tfMains) {
    const tid = idOf(d);
    await put("teamFiles/" + tid, d.fields);
    const chunks = await runQuery(SRC, "teamFiles", "parentId", tid);
    for (const c of chunks) { await put("teamFiles/" + idOf(c), c.fields); tfChunkCount++; }
  }
  report.teamFiles = { mains: tfMains.length, chunks: tfChunkCount };

  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error("MIGRATION ERROR:", e.message); process.exit(1); });
