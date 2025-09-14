/* Put this file in: .obsidian/plugins/templater/user_scripts/equations.js
   Usage in templates:
     <%* await tp.user.equations_insert() %>
     <%* await tp.user.equations_send_to_master() %>
*/
const MASTER_PATH = "Core/Master Equations.md";

const slugify = (s) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

async function ensureMasterFile(app) {
  let master = app.vault.getAbstractFileByPath(MASTER_PATH);
  if (!master) {
    await app.vault.create(MASTER_PATH, "# Master Equations\n");
    master = app.vault.getAbstractFileByPath(MASTER_PATH);
  }
  return master;
}

function buildEqBlock({ title, tag, desc, sourceTitle, dateStr }) {
  // Marker style makes extraction trivial & robust
  return [
    `<!-- EQ:${tag} START -->`,
    `### ${title}  #eq/${tag}`,
    desc ? `> ${desc}` : null,
    `$$`,
    `\\begin{gather}`,
    `\\end{gather}`,
    `$$`,
    ``,
    `*Source:* [[${sourceTitle}]] | ${dateStr}`,
    `<!-- EQ:${tag} END -->`,
    ``,
  ].filter(Boolean).join("\n");
}

function findEqBlockByTag(content, tag) {
  const start = `<!-- EQ:${tag} START -->`;
  const end   = `<!-- EQ:${tag} END -->`;
  const i1 = content.indexOf(start);
  if (i1 === -1) return null;
  const i2 = content.indexOf(end, i1 + start.length);
  if (i2 === -1) return null;
  return content.slice(i1, i2 + end.length);
}

function findFirstEqBlockContaining(content, needle) {
  const re = /<!--\s*EQ:([^\s]+)\s*START\s*-->([\s\S]*?)<!--\s*EQ:\1\s*END\s*-->/g;
  let m;
  const lowNeedle = needle.toLowerCase();
  while ((m = re.exec(content)) !== null) {
    const whole = m[0];
    if (whole.toLowerCase().includes(lowNeedle)) return whole;
  }
  return null;
}

async function appendUnique(app, tfile, block, tag) {
  const existing = await app.vault.cachedRead(tfile);
  if (existing.includes(`<!-- EQ:${tag} START -->`)) {
    new Notice(`Master already has EQ:${tag}; appending duplicate avoided.`);
    return false;
  }
  await app.vault.append(tfile, `\n${block}\n`);
  return true;
}

module.exports = {
  // Inserts a fresh equation block at the cursor
  equations_insert: async (tp) => {
    const title = await tp.system.prompt("Equation title (e.g., KCL, IIP3, etc.)");
    if (!title) { new Notice("Canceled"); return; }
    const suggested = slugify(title);
    const tag = await tp.system.prompt(`Tag/slug for this equation`, suggested);
    if (!tag) { new Notice("Canceled"); return; }
    const desc = await tp.system.prompt("Short description (optional)") || "";

    const dateStr = new Date().toISOString().slice(0,10);
    const block = buildEqBlock({
      title,
      tag,
      desc,
      sourceTitle: tp.file.title,
      dateStr
    });

    await tp.editor.insertText(block);
    new Notice(`Inserted equation block: ${title} (#eq/${tag})`);
  },

  // Copies an equation block to Core/Master Equations.md by tag or snippet
  equations_send_to_master: async (tp) => {
    const tagOrText = await tp.system.prompt("Tag (e.g. iip3) OR any text snippet to locate:");
    if (!tagOrText) { new Notice("Canceled"); return; }

    const tfile = tp.file.find_tfile(tp.file.path(true));
    const content = await app.vault.cachedRead(tfile);

    // Try tag markers first (slugified)
    const tryTag = slugify(tagOrText.replace(/^#?eq\//, ""));
    let block = findEqBlockByTag(content, tryTag);
    let chosenTag = tryTag;

    // Fallback: search any equation block containing the text
    if (!block) {
      block = findFirstEqBlockContaining(content, tagOrText);
      if (!block) {
        new Notice("No equation block found by tag or containing that text.");
        return;
      }
      // Pull the tag used by that block so we can de-dupe in Master
      const m = block.match(/<!--\s*EQ:([^\s]+)\s*START\s*-->/);
      chosenTag = m ? m[1] : slugify(tagOrText);
    }

    const master = await ensureMasterFile(app);
    const added = await appendUnique(app, master, block, chosenTag);
    new Notice(added
      ? `Copied EQ:${chosenTag} to Master Equations.md`
      : `Skipped adding duplicate EQ:${chosenTag}`);
  }
};
