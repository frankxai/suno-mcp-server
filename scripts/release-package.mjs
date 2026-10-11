import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const repository = 'frankxai/suno-mcp-server';
const packageName = '@frankxai/suno-mcp-server';
const environmentName = 'npm-production';
const modes = ['legacy-v1', 'v2-legacy', 'v2-modern'];
const cases = ['discovery', 'controls/80', 'controls/450', 'controls/1000', 'impossible-budget-denied',
  'recovered-all-notes', 'tempo-disabled', 'invalid-budget', 'prepared-only-authority',
  'unknown-secret-field-denied', 'unfunded-engine-denied', 'packed-resource', 'prompt', 'owned-process-exited'];
export const artifactNames = ['ubuntu', 'windows'].flatMap(os => [22, 24].map(node => `package-proof-${os}-latest-node${node}`));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const integrity = bytes => 'sha512-' + createHash('sha512').update(bytes).digest('base64');

export function validateRun(run, jobs, artifacts, source) {
  assert.match(source, /^[a-f0-9]{40}$/);
  assert.equal(run.head_repository?.full_name, repository, 'A fork is not a release source');
  assert.equal(run.head_sha, source, 'CI must verify this exact workflow/source revision');
  assert.equal(run.head_branch, 'main');
  assert.equal(run.event, 'push');
  assert.equal(run.path, '.github/workflows/ci.yml');
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
  const names = ['build', ...['ubuntu', 'windows'].flatMap(os => [22, 24].map(node => `package-compatibility (${os}-latest, ${node})`))];
  assert.deepEqual(jobs.map(job => job.name).sort(), names.sort(), 'All four compatibility jobs and aggregate are required');
  assert.ok(jobs.every(job => job.status === 'completed' && job.conclusion === 'success'));
  assert.deepEqual(artifacts.map(artifact => artifact.name).sort(), [...artifactNames].sort());
  for (const artifact of artifacts) {
    assert.equal(artifact.expired, false, 'Expired artifacts cannot be reconstructed as approved bytes');
    assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(artifact.id) && artifact.id > 0);
    assert.ok(artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 1_048_576);
    assert.equal(artifact.workflow_run?.id, run.id);
    assert.equal(artifact.workflow_run?.head_sha, source);
  }
}

export function validateEnvironment(environment, branches) {
  assert.equal(environment.name, environmentName);
  assert.equal(environment.can_admins_bypass, false, 'Environment approval must not have an administrator bypass');
  const rule = environment.protection_rules?.find(rule => rule.type === 'required_reviewers');
  assert.ok(rule?.reviewers?.some(item => item.type === 'User' && item.reviewer?.login === 'frankxai'), 'Named founder approval is required');
  assert.deepEqual(environment.deployment_branch_policy, { protected_branches: false, custom_branch_policies: true });
  assert.deepEqual(branches.map(branch => ({ name: branch.name, type: branch.type })), [{ name: 'main', type: 'branch' }], 'Only the main branch can publish');
}

export function validateProof(proof, bytes, manifest, artifactName) {
  assert.equal(proof.state, 'PASS');
  assert.equal(proof.packed.name, packageName);
  assert.equal(proof.packed.version, manifest.version);
  assert.equal(proof.packed.filename, `frankxai-suno-mcp-server-${manifest.version}.tgz`);
  assert.equal(proof.sha256, sha256(bytes), 'The physical tarball must match its receipt');
  assert.equal(proof.packed.integrity, integrity(bytes));
  assert.equal(proof.packed.shasum, createHash('sha1').update(bytes).digest('hex'));
  assert.ok(bytes.length > 0 && bytes.length <= 4_194_304);
  const node = artifactName.endsWith('node22') ? 22 : 24;
  assert.ok(artifactNames.includes(artifactName));
  assert.match(proof.node, new RegExp(`^v${node}\\.`));
  assert.deepEqual(proof.consumers.map(result => result.mode).sort(), [...modes].sort());
  for (const consumer of proof.consumers) {
    assert.equal(consumer.state, 'PASS');
    assert.equal(consumer.node, proof.node);
    assert.equal(consumer.package, packageName);
    assert.equal(consumer.version, manifest.version);
    assert.equal(consumer.serverStderr, '');
    assert.deepEqual(consumer.outputs.map(output => output.case).sort(), [...cases].sort());
    const prepared = consumer.outputs.find(output => output.case === 'prepared-only-authority').result;
    assert.equal(prepared.execution_status, 'not_submitted');
    assert.equal(prepared.authorization, 'not_authorized_by_this_packet');
    assert.equal(prepared.audio_verdict, 'not_listened');
    assert.equal(prepared.owner_status, 'planning_label_not_authenticated_authority');
  }
  const paths = proof.packed.files.map(file => file.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const path of paths) {
    assert.ok(/^(dist\/|src\/data\/|package\.json$|README\.md$|LICENSE$)/.test(path));
    assert.ok(!/(\\|:|[\x00-\x1f\x7f]|(^|\/)\.\.(\/|$)|(^|\/)(private|memory|node_modules|\.env)(\/|$))/.test(path));
  }
  assert.ok(paths.includes('package.json') && paths.includes('dist/index.js'));
}

function jsonFile(path, limit = 262_144) {
  const stat = lstatSync(path);
  assert.ok(stat.isFile() && stat.size <= limit, `Invalid or oversized JSON: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function findFiles(root, depth = 0) {
  assert.ok(depth <= 4, 'Unexpected artifact nesting');
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(), 'Artifact roots must be real directories');
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'Artifact symlinks are forbidden');
    return entry.isDirectory() ? findFiles(path, depth + 1) : [path];
  });
}

function inspectTarball(path, packed, manifest) {
  // GNU tar reads to stdout only. Nothing from the package is extracted or executed.
  const options = { timeout: 10_000, maxBuffer: 1_048_576 };
  const paths = execFileSync('tar', ['--list', '--file', path], options).toString().trim().split(/\r?\n/);
  assert.deepEqual(paths.sort(), packed.files.map(file => 'package/' + file.path).sort());
  const details = execFileSync('tar', ['--list', '--verbose', '--file', path], options).toString().trim().split(/\r?\n/);
  assert.ok(details.every(line => line.startsWith('-')), 'Only regular package files are accepted');
  const content = execFileSync('tar', ['--extract', '--to-stdout', '--file', path, 'package/package.json'], { ...options, maxBuffer: 16_384 });
  assert.deepEqual(JSON.parse(content), manifest, 'Packed manifest must equal the reviewed source manifest');
}

async function github(path) {
  assert.ok(process.env.GH_TOKEN, 'A read-only GitHub job token is required');
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `GitHub metadata is unavailable (${response.status}): ${path}`);
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.byteLength; assert.ok(length <= 1_048_576, 'GitHub metadata exceeded its byte budget');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks, length).toString());
}

function inputs() {
  assert.equal(process.env.GITHUB_REPOSITORY, repository);
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main', 'Release dispatch must use main');
  assert.match(process.env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.match(process.env.CI_RUN_ID ?? '', /^[1-9][0-9]{0,15}$/);
  assert.ok(['verify', 'stage', 'publish'].includes(process.env.RELEASE_OPERATION));
  return { source: process.env.GITHUB_SHA, runId: process.env.CI_RUN_ID, operation: process.env.RELEASE_OPERATION };
}

async function environment() {
  const data = await github(`environments/${environmentName}`);
  const branches = await github(`environments/${environmentName}/deployment-branch-policies`);
  validateEnvironment(data, branches.branch_policies);
  return data;
}

async function preflight() {
  const input = inputs();
  const main = await github('branches/main');
  assert.equal(main.commit.sha, input.source, 'Main advanced; select the new reviewed CI run');
  const run = await github(`actions/runs/${input.runId}`);
  const jobs = await github(`actions/runs/${input.runId}/jobs?per_page=100`);
  const artifacts = await github(`actions/runs/${input.runId}/artifacts?per_page=100`);
  assert.equal(jobs.total_count, jobs.jobs.length);
  assert.equal(artifacts.total_count, artifacts.artifacts.length);
  validateRun(run, jobs.jobs, artifacts.artifacts, input.source);
  if (input.operation !== 'verify') await environment();
  return { ...input, artifacts: artifacts.artifacts };
}

async function prepare(artifactRoot, out) {
  const receipt = await preflight();
  const manifest = jsonFile('package.json');
  assert.equal(manifest.name, packageName);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.notEqual(manifest.private, true);
  let selected;
  for (const name of artifactNames) {
    const files = findFiles(join(artifactRoot, name));
    const proofs = files.filter(path => path.endsWith('/package-proof.json') || path.endsWith('\\package-proof.json'));
    const tarballs = files.filter(path => path.endsWith('.tgz'));
    assert.equal(files.length, 2, 'Exactly one receipt and one archive are expected');
    assert.equal(proofs.length, 1); assert.equal(tarballs.length, 1);
    const proof = jsonFile(proofs[0]);
    assert.ok(lstatSync(tarballs[0]).isFile() && lstatSync(tarballs[0]).size <= 4_194_304);
    const bytes = readFileSync(tarballs[0]);
    validateProof(proof, bytes, manifest, name);
    inspectTarball(tarballs[0], proof.packed, manifest);
    if (selected) assert.equal(selected.sha256, proof.sha256, 'Windows/Linux and Node22/24 archives must be identical');
    else selected = { path: tarballs[0], sha256: proof.sha256, integrity: proof.packed.integrity };
  }
  mkdirSync(out, { recursive: true });
  copyFileSync(selected.path, join(out, 'package.tgz'));
  const result = { repository, package: packageName, version: manifest.version, source: receipt.source,
    runId: receipt.runId, releaseRunId: process.env.GITHUB_RUN_ID, sha256: selected.sha256, integrity: selected.integrity, artifacts: receipt.artifacts,
    installedCases: 168, state: 'VERIFIED_ARTIFACT_NOT_PUBLISHED' };
  writeFileSync(join(out, 'release.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}

export function publicationEnvironment(inherited, root) {
  const keys = ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP',
    'GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_REPOSITORY_ID', 'GITHUB_REPOSITORY_OWNER_ID',
    'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SERVER_URL', 'GITHUB_WORKFLOW_REF', 'GITHUB_WORKFLOW_SHA',
    'GITHUB_EVENT_NAME', 'GITHUB_REF', 'GITHUB_REF_TYPE', 'GITHUB_SHA', 'GITHUB_ACTOR', 'RUNNER_ENVIRONMENT',
    'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_URL'];
  const result = Object.fromEntries(keys.filter(key => inherited[key]).map(key => [key, inherited[key]]));
  return { ...result, HOME: root, USERPROFILE: root, npm_config_userconfig: join(root, 'user.npmrc'),
    npm_config_globalconfig: join(root, 'global.npmrc'), npm_config_cache: join(root, 'cache'),
    npm_config_registry: 'https://registry.npmjs.org/', npm_config_ignore_scripts: 'true' };
}

export function validateRegistry(metadata, receipt) {
  assert.equal(metadata.name, packageName); assert.equal(metadata.version, receipt.version);
  assert.equal(metadata.dist?.integrity, receipt.integrity, 'Registry bytes must be the approved archive');
  assert.ok(metadata.dist.signatures?.length > 0, 'Registry signature metadata is missing');
  assert.equal(metadata.dist.attestations?.provenance?.predicateType, 'https://slsa.dev/provenance/v1');
  const url = new URL(metadata.dist.tarball);
  assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, 'registry.npmjs.org');
  assert.equal(url.username + url.password, '');
  assert.equal(decodeURIComponent(url.pathname), `/@frankxai/suno-mcp-server/-/suno-mcp-server-${receipt.version}.tgz`);
}

export function validateAttestationAudit(report, receipt) {
  assert.deepEqual(report.invalid, []); assert.deepEqual(report.missing, []);
  const target = report.verified?.find(item => item.name === packageName && item.version === receipt.version);
  assert.ok(target, 'Native verification must include this package, not only its dependencies');
  const attestation = target.attestationBundles?.find(item => item.predicateType === 'https://slsa.dev/provenance/v1');
  assert.ok(attestation?.bundle?.dsseEnvelope?.payload, 'Verified provenance payload is missing');
  const statement = JSON.parse(Buffer.from(attestation.bundle.dsseEnvelope.payload, 'base64').toString());
  assert.equal(statement.predicateType, 'https://slsa.dev/provenance/v1');
  const expectedDigest = Buffer.from(receipt.integrity.slice('sha512-'.length), 'base64').toString('hex');
  assert.ok(statement.subject?.some(subject => subject.name === `pkg:npm/%40frankxai/suno-mcp-server@${receipt.version}`
    && subject.digest?.sha512 === expectedDigest), 'Provenance must bind the approved archive');
  const definition = statement.predicate?.buildDefinition;
  assert.deepEqual(definition?.externalParameters?.workflow,
    { ref: 'refs/heads/main', repository: `https://github.com/${repository}`, path: '.github/workflows/npm-release.yml' });
  assert.ok(definition.resolvedDependencies?.some(item => item.uri === `git+https://github.com/${repository}@refs/heads/main`
    && item.digest?.gitCommit === receipt.source), 'Verified provenance must bind the reviewed source');
  assert.match(receipt.releaseRunId ?? '', /^[1-9][0-9]{0,15}$/);
  const invocation = statement.predicate?.runDetails?.metadata?.invocationId;
  assert.ok(invocation?.startsWith(`https://github.com/${repository}/actions/runs/${receipt.releaseRunId}/attempts/`));
  assert.match(invocation.split('/attempts/')[1], /^[1-9][0-9]*$/);
}

async function publicResponse(url, limit) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, `Public registry request failed: ${response.status}`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength; assert.ok(size <= limit, 'Public registry response exceeded its byte budget'); chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

async function verifyRegistry(out, destination) {
  const receipt = jsonFile(join(out, 'release.json'));
  assert.equal(receipt.repository, repository); assert.equal(receipt.package, packageName);
  assert.match(receipt.version, /^\d+\.\d+\.\d+$/);
  const metadata = JSON.parse(await publicResponse(`https://registry.npmjs.org/@frankxai%2Fsuno-mcp-server/${receipt.version}`, 1_048_576));
  validateRegistry(metadata, receipt);
  const bytes = await publicResponse(metadata.dist.tarball, 4_194_304);
  assert.equal(sha256(bytes), receipt.sha256); assert.equal(integrity(bytes), receipt.integrity);
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'package.tgz'), bytes);
  writeFileSync(join(destination, 'registry.json'), JSON.stringify(metadata, null, 2) + '\n');
  copyFileSync(join(out, 'release.json'), join(destination, 'release.json'));
  const npm = resolve(process.env.NPM_CLI_PATH ?? '');
  assert.equal(jsonFile(join(dirname(npm), '../package.json')).version, '12.2.0');
  const root = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'suno-public-consumer-'));
  writeFileSync(join(root, 'user.npmrc'), ''); writeFileSync(join(root, 'global.npmrc'), '');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  const env = publicationEnvironment(process.env, root);
  const commands = [
    ['install', [npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', `${packageName}@${receipt.version}`, '@modelcontextprotocol/sdk@1.32.1', '@modelcontextprotocol/client@2.3.1']],
    ['signature-audit', [npm, 'audit', 'signatures', '--json', '--include-attestations']],
    ...modes.map(mode => [mode, [resolve('tests/installed-consumer.mjs'), '--consumer', root, mode]]),
  ];
  const results = [];
  for (const [name, args] of commands) {
    const result = spawnSync(process.execPath, args, { cwd: root, env, timeout: 120_000, maxBuffer: 1_048_576, encoding: 'utf8' });
    results.push({ name, exitCode: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error?.message });
    writeFileSync(join(destination, 'public-consumer.json'), JSON.stringify({ state: 'INCOMPLETE', source: receipt.source, results }, null, 2) + '\n');
    assert.equal(result.status, 0, `Published-package verification failed: ${name}; inspect the preserved receipt`);
    if (name === 'signature-audit') validateAttestationAudit(JSON.parse(result.stdout), receipt);
    if (modes.includes(name)) {
      const consumer = JSON.parse(result.stdout);
      assert.equal(consumer.state, 'PASS'); assert.equal(consumer.version, receipt.version);
      assert.equal(consumer.outputs.length, cases.length); assert.equal(consumer.serverStderr, '');
    }
  }
  writeFileSync(join(destination, 'public-consumer.json'), JSON.stringify({ state: 'PASS', source: receipt.source, integrity: receipt.integrity, results }, null, 2) + '\n');
  console.log(JSON.stringify({ state: 'PUBLIC_REGISTRY_BYTES_AND_CONSUMER_PASS', version: receipt.version, sha256: receipt.sha256 }));
}

async function publish(out) {
  const input = inputs();
  assert.ok(input.operation === 'stage' || input.operation === 'publish');
  const receipt = jsonFile(join(out, 'release.json'));
  assert.equal(receipt.repository, repository); assert.equal(receipt.package, packageName);
  assert.equal(receipt.source, input.source); assert.equal(receipt.runId, input.runId);
  assert.equal(receipt.state, 'VERIFIED_ARTIFACT_NOT_PUBLISHED');
  const tarball = resolve(out, 'package.tgz'); const bytes = readFileSync(tarball);
  assert.equal(sha256(bytes), receipt.sha256); assert.equal(integrity(bytes), receipt.integrity);
  // Recheck authoritative state after the approval wait; do not trust an old preflight alone.
  await preflight();
  const protection = await environment();
  const approvals = await github(`actions/runs/${process.env.GITHUB_RUN_ID}/approvals`);
  assert.ok(approvals.some(approval => approval.state === 'approved' && approval.user?.login === 'frankxai'
    && approval.environments?.some(item => item.id === protection.id)), 'The run needs the named environment approval record');
  assert.ok(process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'OIDC authority is missing');
  const npm = resolve(process.env.NPM_CLI_PATH ?? '');
  assert.equal(jsonFile(join(dirname(npm), '../package.json')).version, '12.2.0', 'Use the pinned publisher CLI');
  const root = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'suno-publisher-'));
  writeFileSync(join(root, 'user.npmrc'), ''); writeFileSync(join(root, 'global.npmrc'), '');
  const env = publicationEnvironment(process.env, root);
  const args = [...(input.operation === 'stage' ? ['stage', 'publish'] : ['publish']), tarball,
    '--access=public', '--tag=latest', '--provenance', '--ignore-scripts', '--json'];
  const result = spawnSync(process.execPath, [npm, ...args], { cwd: root, env, timeout: 120_000, maxBuffer: 1_048_576, encoding: 'utf8' });
  const output = { ...receipt, operation: input.operation, exitCode: result.status,
    state: result.status === 0 ? (input.operation === 'stage' ? 'STAGED_NOT_PUBLIC' : 'PUBLISHED_REQUIRES_REGISTRY_VERIFICATION') : 'PUBLICATION_FAILED_RECONCILE_BEFORE_RETRY',
    stdout: result.stdout, stderr: result.stderr, error: result.error?.message };
  writeFileSync(join(out, 'publication.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ state: output.state, source: receipt.source, sha256: receipt.sha256, exitCode: result.status }));
  assert.equal(result.status, 0, 'Publication failed; inspect the preserved receipt before any retry');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, first, second] = process.argv.slice(2);
  if (command === 'preflight') console.log(JSON.stringify(await preflight()));
  else if (command === 'prepare') await prepare(resolve(first), resolve(second));
  else if (command === 'publish') await publish(resolve(first));
  else if (command === 'verify-registry') await verifyRegistry(resolve(first), resolve(second));
  else throw new Error('Use preflight, prepare ARTIFACT_ROOT OUT, publish OUT, or verify-registry OUT DESTINATION');
}
