import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { artifactNames, publicationEnvironment, validateAttestationAudit, validateEnvironment, validateProof, validateRegistry, validateRun } from '../scripts/release-package.mjs';

const source = 'a'.repeat(40);
const run = { id: 123, head_repository: { full_name: 'frankxai/suno-mcp-server' }, head_sha: source,
  head_branch: 'main', event: 'push', path: '.github/workflows/ci.yml', status: 'completed', conclusion: 'success' };
const jobs = ['build', ...['ubuntu', 'windows'].flatMap(os => [22, 24].map(node => `package-compatibility (${os}-latest, ${node})`))]
  .map(name => ({ name, status: 'completed', conclusion: 'success' }));
const artifacts = artifactNames.map((name, id) => ({ name, id: id + 1, expired: false, digest: 'sha256:' + 'b'.repeat(64),
  size_in_bytes: 1000, workflow_run: { id: run.id, head_sha: source } }));

test('Release admission accepts the complete main-source run and denies stale, fork and incomplete authority', () => {
  validateRun(run, jobs, artifacts, source);
  for (const patch of [
    { head_sha: 'c'.repeat(40) }, { head_repository: { full_name: 'outsider/fork' } },
    { head_branch: 'feature' }, { event: 'pull_request' }, { conclusion: 'failure' },
    { status: 'in_progress' }, { path: '.github/workflows/other.yml' },
  ]) assert.throws(() => validateRun({ ...run, ...patch }, jobs, artifacts, source));
  assert.throws(() => validateRun(run, jobs.slice(1), artifacts, source));
  assert.throws(() => validateRun(run, [...jobs, jobs[0]], artifacts, source));
  assert.throws(() => validateRun(run, jobs.map((job, index) => index ? job : { ...job, conclusion: 'cancelled' }), artifacts, source));
});

test('Artifact expiration, rebinding, incomplete sets and missing digests deny release admission', () => {
  for (const patch of [{ expired: true }, { digest: undefined }, { size_in_bytes: 2 ** 30 },
    { workflow_run: { id: 999, head_sha: source } }, { workflow_run: { id: run.id, head_sha: 'c'.repeat(40) } }]) {
    assert.throws(() => validateRun(run, jobs, [{ ...artifacts[0], ...patch }, ...artifacts.slice(1)], source));
  }
  assert.throws(() => validateRun(run, jobs, artifacts.slice(1), source));
  assert.throws(() => validateRun(run, jobs, [...artifacts, artifacts[0]], source));
});

const protection = { name: 'npm-production', can_admins_bypass: false,
  protection_rules: [{ type: 'required_reviewers', prevent_self_review: false, reviewers: [{ type: 'User', reviewer: { login: 'frankxai' } }] }],
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } };
const branches = [{ name: 'main', type: 'branch' }];

test('Publication requires the named owner and exact main-only environment with no admin bypass', () => {
  validateEnvironment(protection, branches);
  for (const patch of [{ name: 'preview' }, { can_admins_bypass: true }, { protection_rules: [] },
    { deployment_branch_policy: null }]) assert.throws(() => validateEnvironment({ ...protection, ...patch }, branches));
  assert.throws(() => validateEnvironment(protection, [{ name: '*', type: 'branch' }]));
  assert.throws(() => validateEnvironment(protection, [{ name: 'main', type: 'tag' }]));
  assert.throws(() => validateEnvironment(protection, [...branches, { name: 'feature', type: 'branch' }]));
});

const bytes = Buffer.from('a bounded synthetic archive used only for pure policy tests');
const manifest = { name: '@frankxai/suno-mcp-server', version: '0.4.0' };
const caseNames = ['discovery', 'controls/80', 'controls/450', 'controls/1000', 'impossible-budget-denied', 'recovered-all-notes',
  'tempo-disabled', 'invalid-budget', 'prepared-only-authority', 'unknown-secret-field-denied', 'unfunded-engine-denied',
  'packed-resource', 'prompt', 'owned-process-exited'];
function proof() {
  const result = { execution_status: 'not_submitted', authorization: 'not_authorized_by_this_packet', audio_verdict: 'not_listened',
    owner_status: 'planning_label_not_authenticated_authority' };
  return { state: 'PASS', node: 'v22.23.3', sha256: createHash('sha256').update(bytes).digest('hex'),
    packed: { name: manifest.name, version: manifest.version, filename: 'frankxai-suno-mcp-server-0.4.0.tgz',
      integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'), shasum: createHash('sha1').update(bytes).digest('hex'),
      files: [{ path: 'package.json' }, { path: 'dist/index.js' }] },
    consumers: ['legacy-v1', 'v2-legacy', 'v2-modern'].map(mode => ({ mode, node: 'v22.23.3', package: manifest.name,
      version: manifest.version, state: 'PASS', serverStderr: '', outputs: caseNames.map(name => ({ case: name, result })) })) };
}

test('Changing physical package bytes fails even when a receipt still says PASS', () => {
  validateProof(proof(), bytes, manifest, artifactNames[0]);
  assert.throws(() => validateProof(proof(), Buffer.from('different physical bytes'), manifest, artifactNames[0]));
  const altered = proof(); altered.packed.integrity = 'sha512-forged';
  assert.throws(() => validateProof(altered, bytes, manifest, artifactNames[0]));
});

test('Missing protocol, skipped recovery, wrong Node/package and execution authority are denied', () => {
  for (const edit of [
    p => p.consumers.pop(), p => p.consumers[0].outputs.pop(), p => p.consumers[0].state = 'SKIP',
    p => p.node = 'v24.21.0', p => p.consumers[0].package = '@other/package',
    p => p.consumers[0].outputs.find(output => output.case === 'prepared-only-authority').result.authorization = 'authorized',
  ]) { const p = proof(); edit(p); assert.throws(() => validateProof(p, bytes, manifest, artifactNames[0])); }
});

test('Private, traversal, duplicate and wrong package inventories are denied', () => {
  for (const path of ['memory/private/key.json', 'dist/../key.json', 'dist\\key.json', 'dist/private/key.json']) {
    const p = proof(); p.packed.files.push({ path }); assert.throws(() => validateProof(p, bytes, manifest, artifactNames[0]));
  }
  const duplicate = proof(); duplicate.packed.files.push({ path: 'dist/index.js' });
  assert.throws(() => validateProof(duplicate, bytes, manifest, artifactNames[0]));
  assert.throws(() => validateProof(proof(), bytes, { ...manifest, version: '0.4.1' }, artifactNames[0]));
});

test('Native npm child inherits OIDC/provenance context and never inherited auth/configuration', () => {
  const child = publicationEnvironment({ PATH: '/bin', GH_TOKEN: 'github-fixture', NODE_AUTH_TOKEN: 'fixture',
    NPM_TOKEN: 'fixture', npm_config_userconfig: '/saved/config', GITHUB_SHA: source,
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'oidc-fixture', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example',
    GITHUB_REPOSITORY: 'frankxai/suno-mcp-server', GITHUB_WORKFLOW_REF: 'frankxai/suno-mcp-server/.github/workflows/npm-release.yml@refs/heads/main' }, '/isolated');
  assert.equal(child.GITHUB_SHA, source); assert.equal(child.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'oidc-fixture');
  assert.equal(child.NODE_AUTH_TOKEN, undefined); assert.equal(child.NPM_TOKEN, undefined); assert.equal(child.GH_TOKEN, undefined);
  assert.equal(child.HOME, '/isolated'); assert.ok(child.npm_config_userconfig.endsWith('user.npmrc'));
  assert.equal(child.npm_config_ignore_scripts, 'true'); assert.equal(child.npm_config_registry, 'https://registry.npmjs.org/');
});

test('Registry metadata cannot redirect verification to another version, integrity or host', () => {
  const receipt = { version: '0.4.0', integrity: 'sha512-fixture' };
  const metadata = { name: '@frankxai/suno-mcp-server', version: receipt.version,
    dist: { integrity: receipt.integrity, signatures: [{ keyid: 'fixture' }],
      attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
      tarball: 'https://registry.npmjs.org/@frankxai/suno-mcp-server/-/suno-mcp-server-0.4.0.tgz' } };
  validateRegistry(metadata, receipt);
  for (const edit of [m => m.version = '0.4.1', m => m.dist.integrity = 'sha512-other',
    m => m.dist.signatures = [], m => delete m.dist.attestations,
    m => m.dist.tarball = 'https://example.com/other.tgz',
    m => m.dist.tarball = m.dist.tarball.replace('0.4.0.tgz', '0.4.1.tgz')]) {
    const m = structuredClone(metadata); edit(m); assert.throws(() => validateRegistry(m, receipt));
  }
});

test('Native verified attestations must bind this package, physical digest, source, workflow and release run', () => {
  const receipt = { version: '0.4.0', integrity: proof().packed.integrity, source, releaseRunId: '456' };
  const statement = { predicateType: 'https://slsa.dev/provenance/v1', subject: [{ name: 'pkg:npm/%40frankxai/suno-mcp-server@0.4.0',
    digest: { sha512: createHash('sha512').update(bytes).digest('hex') } }], predicate: {
    buildDefinition: { externalParameters: { workflow: { ref: 'refs/heads/main', repository: 'https://github.com/frankxai/suno-mcp-server', path: '.github/workflows/npm-release.yml' } },
      resolvedDependencies: [{ uri: 'git+https://github.com/frankxai/suno-mcp-server@refs/heads/main', digest: { gitCommit: source } }] },
    runDetails: { metadata: { invocationId: 'https://github.com/frankxai/suno-mcp-server/actions/runs/456/attempts/1' } } } };
  function report(payload) { return { invalid: [], missing: [], verified: [{ name: '@frankxai/suno-mcp-server', version: '0.4.0',
    attestationBundles: [{ predicateType: 'https://slsa.dev/provenance/v1', bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(payload)).toString('base64') } } }] }] }; }
  validateAttestationAudit(report(statement), receipt);
  for (const edit of [s => s.subject[0].digest.sha512 = 'wrong',
    s => s.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = 'c'.repeat(40),
    s => s.predicate.buildDefinition.externalParameters.workflow.path = '.github/workflows/other.yml',
    s => s.predicate.runDetails.metadata.invocationId = 'https://github.com/frankxai/suno-mcp-server/actions/runs/999/attempts/1']) {
    const s = structuredClone(statement); edit(s); assert.throws(() => validateAttestationAudit(report(s), receipt));
  }
  const dependencyOnly = report(statement); dependencyOnly.verified[0].name = '@modelcontextprotocol/server';
  assert.throws(() => validateAttestationAudit(dependencyOnly, receipt));
  assert.throws(() => validateAttestationAudit({ invalid: [], missing: [], verified: [] }, receipt));
});
