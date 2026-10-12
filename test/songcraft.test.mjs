import test from 'node:test';
import assert from 'node:assert/strict';
import {
  craftLyrics,
  deSlopLyrics,
  structureSong,
  compileSunoPrompt,
  exportSongDna
} from '../src/engine/songcraft.mjs';
import { handleToolCall, TOOLS } from '../src/index.mjs';

test('TOOLS exports all 5 core songcraft tools with compliant schemas', () => {
  assert.equal(TOOLS.length, 5);
  const names = TOOLS.map(t => t.name);
  assert.deepEqual(names, [
    'craft_lyrics',
    'de_slop_lyrics',
    'structure_song',
    'compile_suno_prompt',
    'export_song_dna'
  ]);

  for (const tool of TOOLS) {
    assert.ok(tool.description);
    assert.equal(tool.inputSchema.type, 'object');
    assert.ok(tool.inputSchema.properties);
  }
});

test('deSlopLyrics accurately detects AI lyric clichés and computes Slop Score', () => {
  const sloppyLyrics = `
[Verse 1]
I hear the echoes in the dark
Walking beneath the neon lights
Broken chains around my heart
Searching for the light in endless nights
`;

  const audit = deSlopLyrics(sloppyLyrics);
  assert.ok(audit.slopScore > 50, `Expected high slop score, got ${audit.slopScore}`);
  assert.equal(audit.detectedCliches.length, 4);
  assert.match(audit.critique, /density/i);
  assert.ok(audit.rewrittenLyrics.includes('footsteps on the gravel drive'));
});

test('deSlopLyrics recognizes pristine human-crafted lyrics', () => {
  const cleanLyrics = `
[Verse 1]
Old copper kettle whistling on the front stove
Two tickets to Munich left on the hall table
Your coat still hanging on the second peg
I didn't turn the porch bulb off this morning
`;

  const audit = deSlopLyrics(cleanLyrics);
  assert.equal(audit.slopScore, 0);
  assert.equal(audit.detectedCliches.length, 0);
  assert.match(audit.critique, /Pristine human craft/i);
});

test('craftLyrics generates structured section-tagged lyrics adhering to theme', () => {
  const res = craftLyrics({
    theme: 'Leaving the city at 4 AM without looking back',
    genre: 'indie-rock'
  });

  assert.ok(res.lyrics.includes('[Intro]'));
  assert.ok(res.lyrics.includes('[Verse 1]'));
  assert.ok(res.lyrics.includes('[Chorus]'));
  assert.ok(res.lyrics.includes('[Bridge]'));
  assert.equal(res.genre, 'indie-rock');
});

test('structureSong outputs realistic timeline with energy curve and instrumentation', () => {
  const res = structureSong({
    genre: 'synthwave',
    tempoBpm: 112
  });

  assert.equal(res.bpm, 112);
  assert.ok(res.timeline.length >= 8);
  assert.ok(res.timeline.some(t => t.section === 'Final Chorus / Drop' && t.energy === 10));
});

test('compileSunoPrompt enforces compact style prompt without artist names', () => {
  const res = compileSunoPrompt({
    genre: 'Neo-Classical Ambient',
    mood: 'Contemplative, quiet grandeur',
    tempoBpm: 68
  });

  assert.ok(res.stylePrompt.length <= 120, `Prompt exceeds 120 chars: ${res.stylePrompt.length}`);
  assert.ok(res.negativePrompt.includes('muddy'));
  assert.ok(res.studioPlan.stemsExport.length >= 4);
});

test('exportSongDna produces valid markdown packet with SIP attestation', () => {
  const res = exportSongDna({
    title: 'Midnight Crossing',
    theme: 'Solitary drive through rain',
    genre: 'Synthwave',
    lyrics: '[Verse 1]\nRain against the glass.'
  });

  assert.match(res.packetMarkdown, /Built on SIP/);
  assert.match(res.packetMarkdown, /TRACK CONTRACT/);
  assert.match(res.packetMarkdown, /STUDIO 2\.0 PRODUCTION PLAN/);
});

test('handleToolCall executes MCP requests and formats responses correctly', async () => {
  const res = await handleToolCall('compile_suno_prompt', {
    genre: 'Cinematic Ambient',
    mood: 'Ethereal'
  });

  assert.ok(Array.isArray(res.content));
  assert.equal(res.content[0].type, 'text');
  assert.match(res.content[0].text, /Style of Music Prompt/);
});
