import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(import.meta.url);
const inherited = Object.fromEntries(
  ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"]
    .filter(key => process.env[key]).map(key => [key, process.env[key]]),
);
const modeIndex = process.argv.indexOf("--consumer");
const modes = ["legacy-v1", "v2-legacy", "v2-modern"];

async function verifyConsumer(consumer, mode) {
  assert.ok(modes.includes(mode), "Select an explicitly supported client mode");
  const require = createRequire(join(consumer, "package.json"));
  const entry = require.resolve("@frankxai/suno-mcp-server");
  const manifest = JSON.parse(readFileSync(join(dirname(entry), "../package.json")));
  const legacy = mode === "legacy-v1";
  const { Client } = await import(pathToFileURL(require.resolve(
    legacy ? "@modelcontextprotocol/sdk/client/index.js" : "@modelcontextprotocol/client",
  )).href);
  const { StdioClientTransport } = await import(pathToFileURL(require.resolve(
    legacy ? "@modelcontextprotocol/sdk/client/stdio.js" : "@modelcontextprotocol/client/stdio",
  )).href);
  const transport = new StdioClientTransport({
    command: process.execPath, args: [entry], cwd: consumer,
    env: inherited, stderr: "pipe",
  });
  const options = legacy ? undefined : {
    versionNegotiation: { mode: mode === "v2-modern" ? { pin: "2026-07-28" } : "legacy" },
  };
  const client = new Client({ name: "suno-package-verifier", version: "1.0.0" }, options);
  const outputs = [];
  let serverStderr = "";
  const protocolErrors = [];
  client.onerror = error => protocolErrors.push(String(error));
  transport.stderr?.on("data", data => {
    serverStderr += data.toString();
    assert.ok(serverStderr.length <= 65536, "Server stderr exceeded its verification budget");
  });
  const watchdog = setTimeout(() => { void client.close().finally(() => process.exit(124)); }, 45000);
  function value(result) {
    assert.ok(!result.isError, JSON.stringify(result));
    assert.equal(result.content[0].type, "text");
    return JSON.parse(result.content[0].text);
  }
  async function denied(name, args) {
    try {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true, "Invalid input must not be accepted");
      return result;
    } catch (error) {
      // A disconnect, timeout or verifier assertion is not a validation denial.
      if (![-32602, -32601].includes(error.code)) throw error;
      return { protocolError: error.code, message: error.message };
    }
  }
  const dna = {
    core_emotion: ["hopeful"],
    genre: "Cinematic chamber electronica with analog synthesis and acoustic percussion for an evolving instrumental film cue",
    mood: ["patient", "expansive"], vibe_dna: ["night journey"],
    textures: ["soft bowed cello with sustained harmonics and gradual crescendos", "felt piano arpeggios with spacious warm reverb and natural decay"],
    vocal: { gender: "instrumental", performance_notes: ["no choir", "no chants"] },
    production: ["warm tape saturation"],
    energy_arc: { intro: "quiet piano motif", build: "gradually layer cello and pads", peak: "wide instrumental crescendo", bridge: "return to solo piano", outro: "resolve softly" },
    bpm: 92, key: "D minor", confidence: 0.9,
  };
  let ownedPid;
  try {
    await client.connect(transport, { timeout: 10000 });
    ownedPid = transport.pid;
    assert.ok(Number.isInteger(ownedPid) && ownedPid > 0);
    if (!legacy) assert.equal(client.getProtocolEra(), mode === "v2-modern" ? "modern" : "legacy");
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(tool => tool.name).sort(), [
      "analyze_intent", "build_style_field", "map_music_dna", "match_top_patterns", "prepare_music_session", "suggest_keywords",
    ]);
    outputs.push({ case: "discovery", tools: tools.tools.map(tool => tool.name), era: legacy ? "legacy" : client.getProtocolEra() });
    for (const max_chars of [80, 450, 1000]) {
      const result = value(await client.callTool({ name: "build_style_field", arguments: { dna, max_chars } }));
      assert.ok(result.style_field.includes("instrumental only, no vocals, no choir, no chants"));
      assert.ok(result.style_field.includes("92 BPM, D minor"));
      assert.ok(result.style_field.length <= max_chars);
      assert.equal(result.char_count, result.style_field.length);
      outputs.push({ case: `controls/${max_chars}`, result });
    }
    const notes = ["no backing choir", "preserve melody", "clear consonants", "no ad libs", "restrained vibrato", "dry verses", "soft chorus", "no spoken intro"];
    const voiceDna = { ...dna, vocal: { gender: "female", character: "close dry alto", performance_notes: notes } };
    const impossible = await client.callTool({ name: "build_style_field", arguments: { dna: voiceDna, max_chars: 80 } });
    assert.equal(impossible.isError, true);
    const error = JSON.parse(impossible.content[0].text).error;
    assert.equal(error.recoverable, true);
    assert.match(error.message, /increase max_chars/);
    outputs.push({ case: "impossible-budget-denied", result: error });
    const recovered = value(await client.callTool({ name: "build_style_field", arguments: { dna: voiceDna, max_chars: 450 } }));
    for (const note of notes) assert.ok(recovered.style_field.includes(note));
    assert.ok(recovered.style_field.includes("female vocals, close dry alto"));
    outputs.push({ case: "recovered-all-notes", result: recovered });
    const disabled = value(await client.callTool({ name: "build_style_field", arguments: { dna, max_chars: 80, include_bpm_key: false } }));
    assert.ok(!disabled.style_field.includes("92 BPM"));
    outputs.push({ case: "tempo-disabled", result: disabled });
    outputs.push({ case: "invalid-budget", result: await denied("build_style_field", { dna, max_chars: 79 }) });
    const session = {
      work_id: "installed-check", owner: "FrankX", artist_profile_ref: "FrankX/session/v1", engine: "suno-supervised",
      style: "Close dry alto; swung garage-house; clean sub; short ending", lyrics: "[Chorus]\nLeave your coat here",
      instrumental: false, duration_s: 120, candidates: 1, budget_usd: 1,
    };
    const prepared = value(await client.callTool({ name: "prepare_music_session", arguments: session }));
    assert.equal(prepared.execution_status, "not_submitted");
    assert.equal(prepared.authorization, "not_authorized_by_this_packet");
    assert.equal(prepared.audio_verdict, "not_listened");
    assert.equal(prepared.owner_status, "planning_label_not_authenticated_authority");
    outputs.push({ case: "prepared-only-authority", result: prepared });
    const secretDenied = await denied("prepare_music_session", { ...session, api_key: "fixture-not-a-secret" });
    assert.match(JSON.stringify(secretDenied), /api_key/);
    outputs.push({ case: "unknown-secret-field-denied", result: secretDenied });
    const unfunded = await denied("prepare_music_session", { ...session, engine: "minimax-fal3", budget_usd: 0 });
    assert.match(JSON.stringify(unfunded), /Planned generation cost exceeds budget/);
    outputs.push({ case: "unfunded-engine-denied", result: unfunded });
    const resource = await client.readResource({ uri: "library://prompts" });
    const entries = JSON.parse(resource.contents[0].text).entries;
    assert.ok(entries.length > 0);
    outputs.push({ case: "packed-resource", entries: entries.length });
    const prompt = await client.getPrompt({ name: "intent_to_dna", arguments: { raw_intent: "a patient instrumental film cue" } });
    assert.ok(prompt.messages[0].content.text.includes("a patient instrumental film cue"));
    outputs.push({ case: "prompt", messages: prompt.messages.length });
    assert.deepEqual(protocolErrors, []);
  } finally {
    ownedPid ??= transport.pid;
    await client.close();
    clearTimeout(watchdog);
    assert.equal(transport.pid, null);
    if (ownedPid) {
      let alive = true;
      for (let attempt = 0; attempt < 20 && alive; attempt++) {
        try { process.kill(ownedPid, 0); }
        catch (error) { if (error.code !== "ESRCH") throw error; alive = false; }
        if (alive) await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.equal(alive, false, "The owned server process must have exited");
    }
  }
  outputs.push({ case: "owned-process-exited", pid: ownedPid });
  return { state: "PASS", mode, node: process.version, package: manifest.name, version: manifest.version, outputs, serverStderr };
}

if (modeIndex >= 0) {
  const result = await verifyConsumer(resolve(process.argv[modeIndex + 1]), process.argv[modeIndex + 2]);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} else {
  const npm = process.env.npm_execpath;
  assert.ok(npm?.endsWith("npm-cli.js"), "Run this verification with npm run verify:package");
  const parent = process.env.SUNO_PROOF_ROOT || tmpdir();
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, "suno-package-proof-"));
  const userConfig = join(root, "user.npmrc");
  const globalConfig = join(root, "global.npmrc");
  writeFileSync(userConfig, ""); writeFileSync(globalConfig, "");
  const env = { ...inherited, npm_config_userconfig: userConfig, npm_config_globalconfig: globalConfig, npm_config_cache: join(root, "npm-cache") };
  const packed = JSON.parse(execFileSync(process.execPath, [npm, "pack", "--json", "--pack-destination", root], { env, timeout: 60000, maxBuffer: 1048576 }).toString())[0];
  const tarball = join(root, packed.filename);
  const bytes = readFileSync(tarball);
  assert.equal(packed.integrity, "sha512-" + createHash("sha512").update(bytes).digest("base64"));
  for (const file of packed.files) {
    assert.ok(/^(dist\/|src\/data\/|package\.json$|README\.md$|LICENSE$)/.test(file.path), `Unexpected package file: ${file.path}`);
    assert.ok(!/(^|\/)(node_modules|memory|private|\.env)(\/|$)/.test(file.path));
  }
  const consumer = join(root, "consumer");
  mkdirSync(consumer);
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  const install = execFileSync(process.execPath, [npm, "install", "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", tarball, "@modelcontextprotocol/sdk@1.32.1", "@modelcontextprotocol/client@2.3.1"], { cwd: consumer, env, timeout: 120000, maxBuffer: 1048576 }).toString();
  const consumers = modes.map(mode => JSON.parse(execFileSync(process.execPath, [script, "--consumer", consumer, mode], { env, timeout: 60000, maxBuffer: 1048576 }).toString()));
  const proof = { state: "PASS", node: process.version, packed, sha256: createHash("sha256").update(bytes).digest("hex"), install, consumers };
  writeFileSync(join(root, "package-proof.json"), JSON.stringify(proof, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ state: "PASS", proofDirectory: root, version: packed.version, integrity: packed.integrity, sha256: proof.sha256, consumers: consumers.map(result => ({ mode: result.mode, cases: result.outputs.length, state: result.state })) }, null, 2) + "\n");
}
