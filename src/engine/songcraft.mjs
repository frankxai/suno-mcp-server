/**
 * Songcraft Intelligence Engine
 * Grounded in Starlight Music IS doctrine (skills/music-is/suno-prompt.md).
 * Built on SIP — Starlight Intelligence Protocol v1.1.1.
 */

export const AI_LYRIC_CLICHES = [
  // Cosmic / Atmospheric Clichés
  { pattern: /\bechoes in the dark\b/i, label: 'echoes in the dark', category: 'Atmospheric' },
  { pattern: /\bwhispers in the wind\b/i, label: 'whispers in the wind', category: 'Atmospheric' },
  { pattern: /\bshadows (falling|fade|calling|creep)\b/i, label: 'shadows falling/fading', category: 'Atmospheric' },
  { pattern: /\bneon lights\b/i, label: 'neon lights', category: 'Atmospheric' },
  { pattern: /\bcity lights\b/i, label: 'city lights', category: 'Atmospheric' },
  { pattern: /\bstars collide\b/i, label: 'stars collide', category: 'Cosmic' },
  { pattern: /\binfinite (sky|skies|space)\b/i, label: 'infinite skies', category: 'Cosmic' },
  { pattern: /\bgravity pulls\b/i, label: 'gravity pulls', category: 'Cosmic' },
  { pattern: /\blost in the stars\b/i, label: 'lost in the stars', category: 'Cosmic' },

  // Dramatic Emotional Melodrama
  { pattern: /\bbroken chains\b/i, label: 'broken chains', category: 'Melodrama' },
  { pattern: /\btears in the rain\b/i, label: 'tears in the rain', category: 'Melodrama' },
  { pattern: /\brise from the ashes\b/i, label: 'rise from the ashes', category: 'Melodrama' },
  { pattern: /\bphoenix from the flame\b/i, label: 'phoenix from the flame', category: 'Melodrama' },
  { pattern: /\bheal the scars\b/i, label: 'heal the scars', category: 'Melodrama' },
  { pattern: /\bbattleground of love\b/i, label: 'battleground of love', category: 'Melodrama' },
  { pattern: /\bignite the (fire|flame)\b/i, label: 'ignite the flame', category: 'Melodrama' },
  { pattern: /\bcast a shadow\b/i, label: 'cast a shadow', category: 'Melodrama' },

  // Music & Rhythm Metaphors
  { pattern: /\bsymphony of (dreams|tears|souls|hope)\b/i, label: 'symphony of dreams', category: 'Trope' },
  { pattern: /\brhythm of (my|our) heart(beat)?\b/i, label: 'rhythm of my heart', category: 'Trope' },
  { pattern: /\bmelody (in my head|of my soul)\b/i, label: 'melody of my soul', category: 'Trope' },
  { pattern: /\bharmony of (light|life)\b/i, label: 'harmony of light', category: 'Trope' },
  { pattern: /\bdance in the rain\b/i, label: 'dance in the rain', category: 'Trope' },
  { pattern: /\bdance with (the )?shadows\b/i, label: 'dance with shadows', category: 'Trope' },

  // Passive Fillers & Rhyme Crutches
  { pattern: /\bnowhere to (run|hide)\b/i, label: 'nowhere to run', category: 'Filler' },
  { pattern: /\btime is slipping away\b/i, label: 'time is slipping away', category: 'Filler' },
  { pattern: /\bsearching for the light\b/i, label: 'searching for the light', category: 'Filler' },
  { pattern: /\blost in the night\b/i, label: 'lost in the night', category: 'Filler' },
  { pattern: /\bdeep inside\b/i, label: 'deep inside', category: 'Filler' },
  { pattern: /\btake flight\b/i, label: 'take flight', category: 'Filler' },
  { pattern: /\bbreaking free\b/i, label: 'breaking free', category: 'Filler' },
  { pattern: /\bset me free\b/i, label: 'set me free', category: 'Filler' }
];

export const GENRE_DEFAULTS = {
  'cinematic': { bpm: 72, key: 'D minor', instruments: 'Felt piano, ambient analog strings, sub-bass pulse, brass swells' },
  'indie-rock': { bpm: 124, key: 'A major', instruments: 'Fender Telecaster, overdriven bass, punchy live drums, tambourine' },
  'synthwave': { bpm: 110, key: 'F minor', instruments: 'Roland Juno-106 arpeggio, gated reverb snare, Linndrum, moog bass' },
  'neo-soul': { bpm: 84, key: 'Eb major', instruments: 'Fender Rhodes electric piano, muted hollow-body guitar, live pocket drums' },
  'melodic-techno': { bpm: 126, key: 'G minor', instruments: 'Sawtooth bassline, modular percussive clicks, 909 kick, dark reverb tail' },
  'ambient-folk': { bpm: 96, key: 'C major', instruments: 'Acoustic fingerpicked guitar, upright double bass, subtle pedal steel' }
};

/**
 * Audit and De-Slop input lyrics
 */
export function deSlopLyrics(lyrics) {
  if (!lyrics || typeof lyrics !== 'string') {
    return {
      slopScore: 0,
      detectedCliches: [],
      critique: 'No lyrics supplied.',
      rewrittenLyrics: ''
    };
  }

  const lines = lyrics.split('\n');
  const detectedCliches = [];

  lines.forEach((line, index) => {
    AI_LYRIC_CLICHES.forEach(cliche => {
      if (cliche.pattern.test(line)) {
        detectedCliches.push({
          line: index + 1,
          text: line.trim(),
          cliche: cliche.label,
          category: cliche.category
        });
      }
    });
  });

  const totalLines = lines.filter(l => l.trim().length > 0).length || 1;
  const rawScore = Math.round((detectedCliches.length / totalLines) * 150);
  const slopScore = Math.min(100, rawScore);

  let critique = '';
  if (slopScore === 0) {
    critique = 'Pristine human craft. No generic AI songwriting tropes detected. Sensory details and prosody are grounded.';
  } else if (slopScore < 30) {
    critique = `Minor AI resonance (${detectedCliches.length} cliché[s]). Lyrics carry solid rhythm but borrow predictable metaphor choices. Replace marked phrases with physical, situational actions.`;
  } else {
    critique = `High AI cliché density (${detectedCliches.length} tropes found across ${totalLines} active lines). The lyrics lean heavily on generic cosmic/melodramatic crutches ('${detectedCliches.slice(0, 3).map(c => c.cliche).join("', '")}'). Ground the singer in concrete geography, exact gestures, and conversational subtext.`;
  }

  // Generate rewrite with physical grounding
  let rewrittenLyrics = lyrics;
  const replacements = [
    { from: /\bechoes in the dark\b/gi, to: 'footsteps on the gravel drive' },
    { from: /\bwhispers in the wind\b/gi, to: 'static on the radio line' },
    { from: /\bshadows (falling|fade|calling|creep)\b/gi, to: 'streetlights flickering amber' },
    { from: /\bneon lights\b/gi, to: 'halogen diner signage' },
    { from: /\bbroken chains\b/gi, to: 'unlocked deadbolts' },
    { from: /\btears in the rain\b/gi, to: 'coffee going cold on the sill' },
    { from: /\brise from the ashes\b/gi, to: 'pack the trunk and turn the key' },
    { from: /\bignite the (fire|flame)\b/gi, to: 'strike the match against the box' },
    { from: /\bnowhere to (run|hide)\b/gi, to: 'three miles past the county line' },
    { from: /\bsearching for the light\b/gi, to: 'squinting through the windshield fog' },
    { from: /\bdeep inside\b/gi, to: 'behind locked teeth' }
  ];

  replacements.forEach(r => {
    rewrittenLyrics = rewrittenLyrics.replace(r.from, r.to);
  });

  return {
    slopScore,
    detectedCliches,
    critique,
    rewrittenLyrics
  };
}

/**
 * Craft structured lyrics
 */
export function craftLyrics({ theme, genre = 'cinematic', structure = null, vocalTags = true, antiSlop = true }) {
  const sections = structure || [
    'Intro',
    'Verse 1',
    'Pre-Chorus',
    'Chorus',
    'Verse 2',
    'Chorus',
    'Bridge',
    'Chorus',
    'Outro'
  ];

  const cleanTheme = theme || 'Quiet resolve after a difficult decision in an empty terminal';
  
  const templateBlocks = {
    'Intro': vocalTags ? '[Intro]\n[Subtle felt piano motif, ambient room tape hiss]' : '[Intro]',
    'Verse 1': `[Verse 1]${vocalTags ? '\n[Close, conversational delivery]' : ''}\nFolded paper in my coat pocket\nCounting gate numbers on the ceiling tiles\nDidn't call to say I made the morning flight\nJust let the boarding pass expire by the door`,
    'Pre-Chorus': `[Pre-Chorus]${vocalTags ? '\n[Harmonic tension builds, vocal lifts]' : ''}\nEvery second clock is ticking louder now\nShoes against the linoleum floor`,
    'Chorus': `[Chorus]${vocalTags ? '\n[Full chest resonance, open room reverb]' : ''}\nWe don't need another staged apology\nSome bridges burn to keep the highway clear\nI leave the keys upon the counter ledge\nAnd breathe the cold air standing right here`,
    'Verse 2': `[Verse 2]${vocalTags ? '\n[Dry, intimate vocal]' : ''}\nSuitcase handle worn down to the brass\nTwo missed messages waiting on the screen\nTurn the phone face down beneath the napkin\nNo more rehearsal for what might have been`,
    'Bridge': `[Bridge]${vocalTags ? '\n[Dynamic drop: drums cut, solo vocal with cello]' : ''}\nNot every silence is an empty space\nSometimes the quiet is the only honest word\n[Beat pause]`,
    'Outro': `[Outro]${vocalTags ? '\n[Breathy fade out, piano chord resolves to tonic]' : ''}\nLeave the keys.\nKeep the highway clear.\n[Fade to silence]`
  };

  const output = [];
  sections.forEach(sec => {
    if (templateBlocks[sec]) {
      output.push(templateBlocks[sec]);
    } else {
      output.push(`[${sec}]\n[Author section content here adhering to "${cleanTheme}"]`);
    }
  });

  const rawLyrics = output.join('\n\n');
  const audit = antiSlop ? deSlopLyrics(rawLyrics) : { slopScore: 0, detectedCliches: [], critique: 'Bypassed' };

  return {
    theme: cleanTheme,
    genre,
    lyrics: rawLyrics,
    slopScore: audit.slopScore,
    clicheCount: audit.detectedCliches.length,
    doctrine: 'Built on SIP — Starlight Music IS Songcraft Doctrine'
  };
}

/**
 * Structure a song timeline
 */
export function structureSong({ genre = 'cinematic', tempoBpm = null, targetDurationSeconds = 210 }) {
  const normGenre = genre.toLowerCase().replace(/\s+/g, '-');
  const profile = GENRE_DEFAULTS[normGenre] || GENRE_DEFAULTS['cinematic'];
  const bpm = tempoBpm || profile.bpm;

  const timeline = [
    { section: 'Intro', start: '0:00', end: '0:18', energy: 2, layers: 'Ambient motif, subtle low-pass pad', vocal: 'None or atmospheric vocalise' },
    { section: 'Verse 1', start: '0:18', end: '0:45', energy: 4, layers: 'Bass pulse enters, sparse percussion', vocal: 'Intimate, close-mic spoken cadence' },
    { section: 'Pre-Chorus', start: '0:45', end: '0:58', energy: 6, layers: 'Snare roll / dynamic rise, harmonic lift', vocal: 'Higher register, pushing chest resonance' },
    { section: 'Chorus', start: '0:58', end: '1:25', energy: 8, layers: 'Full arrangement, wide stereo guitars/synths', vocal: 'Lead belting with wide octave doubles' },
    { section: 'Verse 2', start: '1:25', end: '1:50', energy: 5, layers: 'Rhythm holds, subtle rhythmic variation', vocal: 'Grounded storytelling, tight rhythm' },
    { section: 'Chorus', start: '1:50', end: '2:15', energy: 8, layers: 'Main hook reprise, secondary counter-melody', vocal: 'Full power vocal with ad-libs' },
    { section: 'Bridge', start: '2:15', end: '2:45', energy: 3, layers: 'Drums drop out, stark emotional breakdown', vocal: 'Raw solo vocal, exposed vulnerability' },
    { section: 'Final Chorus / Drop', start: '2:45', end: '3:15', energy: 10, layers: 'Peak intensity, maximal saturation & bottom end', vocal: 'Climax soaring vocal + unison chant' },
    { section: 'Outro', start: '3:15', end: '3:30', energy: 2, layers: 'Deconstructed layers, decaying delay tails', vocal: 'Whisper refrain, fading out' }
  ];

  return {
    genre,
    bpm,
    estimatedTotalSeconds: targetDurationSeconds,
    sectionCount: timeline.length,
    timeline
  };
}

/**
 * Compile high-density Suno/Udio generation prompt
 */
export function compileSunoPrompt({ genre, mood, tempoBpm = null, instrumentation = null, vocalStyle = null, modelVersion = 'v5.5' }) {
  const normGenre = (genre || 'cinematic').toLowerCase().replace(/\s+/g, '-');
  const defaults = GENRE_DEFAULTS[normGenre] || GENRE_DEFAULTS['cinematic'];
  const bpm = tempoBpm || defaults.bpm;
  const inst = instrumentation || defaults.instruments;
  const vocals = vocalStyle || 'expressive intimate lead vocals, wide octave doubles on chorus';
  const cleanMood = mood || 'atmospheric, emotionally resolved, bittersweet';

  // Compact Style Prompt: Keep under 120 characters for Suno's style field
  const stylePrompt = `${genre}, ${cleanMood}, ${bpm} BPM, ${inst.split(',').slice(0, 2).join(',')}`.slice(0, 120);

  // Negative Prompt
  const negativePrompt = 'muddy bass, harsh autotune artifacts, crowded mid-range, cheesy synth brass, generic dance cliches';

  // Studio 2.0 instructions (separated from prompt)
  const studioPlan = {
    targetEngine: modelVersion,
    arrangementNotes: 'Keep low end monophonic below 100Hz. Vocal space carved out at 2.5kHz - 4kHz.',
    stemsExport: ['Vocals (dry/wet)', 'Drums & Percussion', 'Bass/Sub', 'Instruments & Harmonics', 'FX & Ambience'],
    takeSelectionCriteria: 'Reject takes where vocal diction blurs, consonants clip, or pitch correction warps formant.'
  };

  return {
    stylePrompt,
    negativePrompt,
    suggestedBpm: bpm,
    vocalDirection: vocals,
    studioPlan
  };
}

/**
 * Export full Songcraft Packet conforming to SIP § 1.1.1
 */
export function exportSongDna({ title, theme, genre, lyrics, bpm = null, key = null }) {
  const songTitle = title || 'Untitled Sovereign Composition';
  const songGenre = genre || 'Cinematic Ambient';
  const songBpm = bpm || 92;
  const songKey = key || 'D minor';

  const deSlop = deSlopLyrics(lyrics || '');
  const prompt = compileSunoPrompt({ genre: songGenre, mood: theme || 'Grounded', tempoBpm: songBpm });

  const packet = `# ${songTitle.toUpperCase()} — SONGCRAFT PACKET

> **Built on SIP — Starlight Intelligence Protocol v1.1.1**  
> **Substrate Engine:** Starlight Music IS / @frankxai/songcraft-mcp  
> **Slop Index Score:** ${deSlop.slopScore}/100 (${deSlop.detectedCliches.length} tropes identified)

---

## 1. TRACK CONTRACT
\`\`\`yaml
title: "${songTitle}"
genre: "${songGenre}"
tempo_bpm: ${songBpm}
key_signature: "${songKey}"
rights_clearance: "100% Sovereign / Zero Named-Artist Mimicry"
vocal_direction: "${prompt.vocalDirection}"
\`\`\`

## 2. SUNO v5.5 / UDIO GENERATION PROMPT
\`\`\`text
${prompt.stylePrompt}
\`\`\`

### Negative Exclusions:
\`\`\`text
${prompt.negativePrompt}
\`\`\`

## 3. AUTHORED LYRICS
${lyrics || '[No lyrics provided]'}

---

## 4. STUDIO 2.0 PRODUCTION PLAN
\`\`\`yaml
stems:
  - vocals_lead_dry
  - drums_percussion_stems
  - bass_low_end_mono
  - harmonic_instruments
take_rules:
  - "${prompt.studioPlan.takeSelectionCriteria}"
mix_routing:
  - "${prompt.studioPlan.arrangementNotes}"
\`\`\`
`;

  return {
    title: songTitle,
    packetMarkdown: packet,
    slopScore: deSlop.slopScore
  };
}
