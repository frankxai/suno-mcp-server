'use strict';

// Offline planning only. This module never calls a provider or spends credits.
function prepareSession(x) {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const keys = (v, allowed, name) => {
    assert(object(v), `${name} must be an object`);
    assert(Object.keys(v).every(k => allowed.includes(k)), `${name}: unknown field`);
  };
  const string = (v, max, name) => assert(typeof v === 'string' && v.trim().length > 0 && v.length <= max, `Invalid ${name}`);
  keys(x, ['work_id','owner','artist_profile_ref','engine','style','lyrics','instrumental','duration_s','candidates','budget_usd','sections'], 'session');
  string(x.work_id, 80, 'work_id');
  assert(/^[a-zA-Z0-9_-]+$/.test(x.work_id), 'work_id must be a portable identifier');
  assert(['FrankX','Arcanea','Starlight','GenCreator'].includes(x.owner), 'Unknown portfolio owner');
  string(x.artist_profile_ref, 250, 'artist_profile_ref');
  assert(x.artist_profile_ref.startsWith(`${x.owner}/`), 'Artist profile must belong to the owner');
  string(x.style, 2000, 'style');
  assert(typeof x.instrumental === 'boolean', 'instrumental must be boolean');
  assert(typeof x.lyrics === 'string' && x.lyrics.length <= 3500, 'Invalid lyrics');
  assert(x.instrumental ? x.lyrics.trim() === '' : x.lyrics.trim().length > 0, 'Lyrics must agree with instrumental mode');
  assert(Number.isInteger(x.duration_s) && x.duration_s >= 3 && x.duration_s <= 600, 'duration_s must be 3–600');
  assert(Number.isInteger(x.candidates) && x.candidates >= 1 && x.candidates <= 8, 'candidates must be 1–8');
  assert(typeof x.budget_usd === 'number' && Number.isFinite(x.budget_usd) && x.budget_usd >= 0, 'Invalid budget_usd');
  const engines = ['lyria-clip','lyria-full','eleven-music','minimax-fal3','suno-supervised'];
  assert(engines.includes(x.engine), 'Engine is unavailable in this planner; direct MiniMax requires verified existing-account eligibility');
  let request, unitCost, warnings = [], model;
  if (x.sections !== undefined) {
    assert(x.engine === 'eleven-music', 'Only Eleven Music sections are compiled here');
    assert(Array.isArray(x.sections) && x.sections.length > 0 && x.sections.length <= 30, 'Invalid sections');
    let sum = 0;
    for (const s of x.sections) {
      keys(s, ['name','lyrics','duration_s','styles','exclude'], 'section');
      string(s.name, 60, 'section name');
      assert(!/[\[\]\r\n]/.test(s.name), 'Section name must be plain text');
      assert(typeof s.lyrics === 'string' && s.lyrics.length <= 3500, 'Invalid section lyrics');
      assert(x.instrumental ? s.lyrics.trim() === '' : true, 'Instrumental sections cannot contain lyrics');
      assert(Number.isInteger(s.duration_s) && s.duration_s >= 3 && s.duration_s <= 120, 'Section duration must be 3–120');
      for (const a of [s.styles,s.exclude]) assert(Array.isArray(a) && a.length <= 50 && a.every(v => typeof v === 'string' && v.trim() && v.length <= 300), 'Invalid section styles');
      sum += s.duration_s;
    }
    assert(sum === x.duration_s, 'Section durations must equal session duration');
    assert(x.sections.map(s => s.lyrics).filter(Boolean).join('\n') === x.lyrics, 'Section lyrics must preserve the exact approved lyrics');
  }
  if (x.engine.startsWith('lyria')) {
    assert(x.engine !== 'lyria-clip' || x.duration_s === 30, 'Lyria Clip is exactly 30 seconds');
    assert(x.engine !== 'lyria-full' || x.duration_s <= 240, 'Planner full-song guardrail is 240s; duration is a prompt hint, not a provider guarantee');
    model = x.engine === 'lyria-clip' ? 'lyria-3-clip-preview' : 'lyria-3.5';
    unitCost = x.engine === 'lyria-clip' ? 0.04 : 0.08;
    request = {method:'POST',url:'https://generativelanguage.googleapis.com/v1beta/interactions',credential:'GEMINI_API_KEY via n8n credential header x-goog-api-key',body:{model,input:`${x.style}\nTarget duration: ${x.duration_s} seconds. ${x.instrumental ? 'Instrumental only, no vocals.' : `Sing these original lyrics; keep musical instructions separate from the lyrics:\n${x.lyrics}`}`}};
    warnings.push('Single-turn generation; a later clip is a new render, not an edit.', 'Full-song duration is approximate; verify the returned audio.');
  } else if (x.engine === 'eleven-music') {
    model = 'music_v2_5'; unitCost = x.duration_s / 60 * 0.15;
    assert(!x.sections || x.sections[0].styles.length < 50, 'First chunk needs room for global style');
    const body = x.sections ? {model_id:model,composition_plan:{chunks:x.sections.map((s,i) => ({text:`[${s.name}]${s.lyrics ? '\n'+s.lyrics : ''}`,duration_ms:s.duration_s*1000,positive_styles:i === 0 ? [x.style,...s.styles] : s.styles,negative_styles:s.exclude,context_adherence:'high'}))},store_for_inpainting:true} : {model_id:model,prompt:`${x.style}${x.instrumental ? '' : '\nOriginal lyrics:\n'+x.lyrics}`,music_length_ms:x.duration_s*1000,force_instrumental:x.instrumental,store_for_inpainting:true};
    assert(!body.prompt || body.prompt.length <= 4100, 'Eleven Music prompt is too long; use sections');
    request = {method:'POST',url:'https://api.elevenlabs.io/v1/music',credential:'ELEVENLABS_API_KEY via n8n credential header xi-api-key',body};
    warnings.push('Pricing is a planning estimate; confirm account entitlements and billable rounding.', 'Composition-plan instrumental style is a direction, not force_instrumental verification.');
  } else if (x.engine === 'minimax-fal3') {
    assert(!x.instrumental, 'Instrumental-only MiniMax Music 3 input is not validated by this packet');
    assert(x.duration_s <= 300, 'MiniMax Music 3 maximum is five minutes');
    assert(!/\[[^\]\n]+\][^\S\n]*\S/.test(x.lyrics), 'MiniMax section tags must be on their own line');
    model = 'minimax/music-3'; unitCost = x.duration_s * 0.002;
    request = {method:'POST',url:'https://queue.fal.run/minimax/music-3',credential:'FAL_KEY via n8n credential header Authorization: Key …',body:{prompt:x.style,lyrics:x.lyrics,duration:x.duration_s}};
    warnings.push('Duration is an upper bound. Archive returned audio immediately.', 'Hosted-provider availability is documented; your account has not been smoke-tested.');
  } else {
    assert(x.duration_s <= 480, 'Suno v6 supports up to eight minutes per generation');
    model = 'v6'; unitCost = null;
    request = {mode:'supervised',url:'https://suno.com/create',model,style:x.style,lyrics:x.lyrics,instrumental:x.instrumental,target_duration_s:x.duration_s};
    warnings.push('No official public Suno generation API was verified. This packet prepares inputs only.', 'USD budget does not authorize Suno credits; use a separate explicit credit envelope.');
  }
  const estimated = unitCost === null ? null : Math.round(unitCost*x.candidates*1e6)/1e6;
  assert(estimated === null || estimated <= x.budget_usd, 'Planned generation cost exceeds budget');
  return {schema_version:'1.0',work_id:x.work_id,owner:x.owner,artist_profile_ref:x.artist_profile_ref,status:'prepared',model,engine:x.engine,candidates:x.candidates,budget_usd:x.budget_usd,estimated_render_cost_usd:estimated,estimate_date:'2026-10-01',cost_exclusions:['LLM API calls','edits','stems','storage','compute','tax'],authorization:'not_authorized_by_this_packet',requests:Array.from({length:x.candidates},(_,i)=>({candidate_id:`${x.work_id}-c${i+1}`,request:JSON.parse(JSON.stringify(request))})),warnings,next:'Review the brief, then reserve an owner-approved budget in the execution ledger before any paid submission.'};
}

module.exports = {prepareSession};
if (require.main === module) {
  const fs = require('node:fs');
  try { console.log(JSON.stringify(prepareSession(JSON.parse(fs.readFileSync(0,'utf8'))), null, 2)); }
  catch (e) { console.error(e.message); process.exitCode=1; }
}
