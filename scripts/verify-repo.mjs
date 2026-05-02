import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';
import {
  anyMissing,
  buildAgentToml,
  buildManagedHooksConfig,
  chedexLatestVerifiedCodexVersion,
  chedexMinimumCodexVersion,
  generatedAgentPath,
  installManifestPaths,
  legacySkillNames,
  listRelativeFiles,
  listSkills,
  probeCodexHooksSupport,
  repoPath,
  roleNames,
  rolePromptPath,
  stripFrontmatter,
} from './lib.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertFileEqual(left, right, label) {
  const [leftContent, rightContent] = await Promise.all([
    readFile(left, 'utf8'),
    readFile(right, 'utf8'),
  ]);

  if (leftContent !== rightContent) {
    throw new Error(`${label} differs:\n${left}\n${right}`);
  }
}

async function assertTreeEqual(leftRoot, rightRoot, label) {
  const [leftFiles, rightFiles] = await Promise.all([
    listRelativeFiles(leftRoot),
    listRelativeFiles(rightRoot),
  ]);

  if (JSON.stringify(leftFiles) !== JSON.stringify(rightFiles)) {
    throw new Error(
      `${label} file list differs:\nleft=${leftFiles.join(', ')}\nright=${rightFiles.join(', ')}`,
    );
  }

  for (const relativePath of leftFiles) {
    await assertFileEqual(join(leftRoot, relativePath), join(rightRoot, relativePath), `${label}:${relativePath}`);
  }
}

const hookProbe = probeCodexHooksSupport();
if (!hookProbe.ok) {
  throw new Error(`native hook support check failed: ${hookProbe.reason}`);
}

const repoSkillDirs = (await readdir(repoPath('skills'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const registeredSkills = [...listSkills()].sort();
const legacySkills = [...legacySkillNames()].sort();

const unprefixedRegisteredSkills = registeredSkills.filter((name) => !name.startsWith('cdx-'));
if (unprefixedRegisteredSkills.length > 0) {
  throw new Error(`registered Chedex skills must use the cdx- prefix: ${unprefixedRegisteredSkills.join(', ')}`);
}

const legacyRepoSkillDirs = repoSkillDirs.filter((name) => legacySkills.includes(name));
if (legacyRepoSkillDirs.length > 0) {
  throw new Error(`legacy unprefixed Chedex skill directories are not allowed: ${legacyRepoSkillDirs.join(', ')}`);
}

const bundledSystemSkills = ['imagegen', 'openai-docs', 'plugin-creator', 'skill-creator', 'skill-installer'];
const collidingBundledSkills = registeredSkills.filter((name) => bundledSystemSkills.includes(name));
if (collidingBundledSkills.length > 0) {
  throw new Error(`registered Chedex skills collide with bundled Codex system skills: ${collidingBundledSkills.join(', ')}`);
}

if (JSON.stringify(repoSkillDirs) !== JSON.stringify(registeredSkills)) {
  throw new Error(
    `registered skills do not match skills/ directory:\nregistered=${registeredSkills.join(', ')}\nrepo=${repoSkillDirs.join(', ')}`,
  );
}

const missingPrompts = anyMissing(roleNames().map((name) => rolePromptPath(name)));
const missingAgents = anyMissing(roleNames().map((name) => generatedAgentPath(name)));
const missingSkills = anyMissing(repoSkillDirs.map((name) => repoPath('skills', name, 'SKILL.md')));

if (missingPrompts.length || missingAgents.length || missingSkills.length) {
  throw new Error([
    missingPrompts.length ? `missing prompts: ${missingPrompts.join(', ')}` : '',
    missingAgents.length ? `missing agents: ${missingAgents.join(', ')}` : '',
    missingSkills.length ? `missing skills: ${missingSkills.join(', ')}` : '',
  ].filter(Boolean).join('\n'));
}

for (const name of roleNames()) {
  const prompt = await readFile(rolePromptPath(name), 'utf8');
  const agent = await readFile(generatedAgentPath(name), 'utf8');
  if (!prompt.includes('description:')) {
    throw new Error(`prompt missing frontmatter description for ${name}`);
  }
  const expectedAgent = buildAgentToml(ROLE_DEFINITIONS[name], stripFrontmatter(prompt));
  if (agent !== expectedAgent) {
    throw new Error(`generated agent is stale for ${name}: ${generatedAgentPath(name)}`);
  }
}

for (const name of repoSkillDirs) {
  const skill = await readFile(repoPath('skills', name, 'SKILL.md'), 'utf8');
  if (!skill.includes(`name: ${name}`)) {
    throw new Error(`skill frontmatter name mismatch for ${name}`);
  }
  if (!skill.includes('description:')) {
    throw new Error(`skill missing frontmatter description for ${name}`);
  }
}

const manifest = installManifestPaths();
const requiredPaths = [manifest.templateAgents, manifest.promptsDir, manifest.skillsDir, manifest.agentsDir, manifest.hooksDir];
const missingInstallPaths = anyMissing(requiredPaths);
if (missingInstallPaths.length) {
  throw new Error(`install manifest paths missing: ${missingInstallPaths.join(', ')}`);
}

const skillDocSurfaces = [
  repoPath('README.md'),
  repoPath('docs', 'install.md'),
  manifest.templateAgents,
];

for (const path of skillDocSurfaces) {
  const content = await readFile(path, 'utf8');
  for (const skill of registeredSkills) {
    if (!content.includes(`\`${skill}\``)) {
      throw new Error(`doc surface missing registered skill ${skill}: ${path}`);
    }
  }
}

const requiredContractDocs = [
  repoPath('docs', 'guidance-schema.md'),
  repoPath('docs', 'prompt-contract.md'),
  repoPath('docs', 'native-delta-audit.md'),
];
const missingContractDocs = anyMissing(requiredContractDocs);
if (missingContractDocs.length) {
  throw new Error(`instruction contract docs missing: ${missingContractDocs.join(', ')}`);
}

const nativeDeltaAudit = await readFile(repoPath('docs', 'native-delta-audit.md'), 'utf8');
for (const snippet of [
  'Decision Labels',
  'avoidable runtime delta',
  '`keep`',
  '`narrow`',
  '`replace`',
  '`remove`',
  '`defer`',
  'Current Surface Classification',
  'Productivity Enhancement Candidates',
  'npm run install:user:dry',
]) {
  if (!nativeDeltaAudit.includes(snippet)) {
    throw new Error(`native delta audit missing "${snippet}"`);
  }
}

const requiredWorkflowSchemaFiles = [
  repoPath('hooks', 'workflow-mode-schemas.mjs'),
  repoPath('registry', 'workflow-mode-schemas.mjs'),
  repoPath('registry', 'workflow-mode-schemas.ts'),
  repoPath('hooks', 'codex-release-deltas.json'),
];
const missingWorkflowSchemaFiles = anyMissing(requiredWorkflowSchemaFiles);
if (missingWorkflowSchemaFiles.length) {
  throw new Error(`workflow schema surfaces missing: ${missingWorkflowSchemaFiles.join(', ')}`);
}

const explicitUserModelIntentDocSnippet = 'If the user explicitly specifies a sub-agent model or reasoning setting, treat that as binding over inherited or default settings unless it is unavailable or incompatible.';
const explicitUserFallbackDocSnippet = 'If the explicit request cannot be honored, say so and use the closest compliant fallback instead of silently overriding it.';
const explicitUserDefaultsAreFallbackDocSnippet = 'Built-in role defaults, inherited defaults, and generated agent defaults are fallback only and must not be used to justify ignoring an explicit user request.';
const explicitCallerModelIntentPromptSnippet = 'Honor any explicit caller-specified sub-agent model or reasoning setting over inherited or default settings unless unavailable or incompatible.';
const explicitCallerFallbackPromptSnippet = 'Treat built-in agent defaults as fallback only, and say so before using the closest compliant fallback.';

const governorSurfaceChecks = [
  [repoPath('README.md'), ['codex_hooks', 'multi_agent', 'hooks.json', '_active.json', 'handoff.json', 'UserPromptSubmit', chedexLatestVerifiedCodexVersion, 'durable evidence log', 'override repo defaults unless unavailable or incompatible', 'hooks/workflow-mode-schemas.mjs', 'registry/workflow-mode-schemas.mjs', '_archive.json']],
  [repoPath('docs', 'install.md'), ['codex_hooks', 'multi_agent', 'hooks.json', 'UserPromptSubmit', chedexMinimumCodexVersion, chedexLatestVerifiedCodexVersion, '_codex_release_audit.json', '_codex_release_deltas.json', '_archive.json', 'phase-aware artifacts', 'managed:v1']],
  [repoPath('docs', 'governor.md'), ['workflow-sync', 'SessionStart', 'UserPromptSubmit', 'Stop', 'handoff.json', 'risks', 'release audit', 'multi_agent', 'durable evidence log', 'autoresearch-plan is not a governed mode', chedexMinimumCodexVersion, chedexLatestVerifiedCodexVersion, 'hooks/workflow-mode-schemas.mjs', 'registry/workflow-mode-schemas.mjs', 'verification-complete', '_archive.json', 'completion_token', 'workflow-lock-repair', 'phase-aware artifact requirements']],
  [repoPath('README.md'), ['~/.codex/workflows/deep-interview/', 'interview.md', 'not governed by `progress.json` or `handoff.json` by default']],
  [repoPath('docs', 'install.md'), ['~/.codex/workflows/deep-interview/', 'interview.md', 'does not require `progress.json` or `handoff.json` by default']],
  [repoPath('README.md'), ['~/.codex/workflows/autoresearch-plan/', '~/.codex/workflows/autoresearch-loop/', 'results.tsv']],
  [repoPath('docs', 'install.md'), ['~/.codex/workflows/autoresearch-plan/', '~/.codex/workflows/autoresearch-loop/', 'results.tsv']],
  [repoPath('docs', 'guidance-schema.md'), ['Role And Intent', 'Execution Protocol', 'Verification And Completion', 'explicitly invoked by name first', 'behavioral contract needs surface-specific wording', 'make it explicit in the prompts and their verification', 'fallback only']],
  [repoPath('docs', 'prompt-contract.md'), ['Compact, Evidence-Dense Output', 'Local Task Updates Override Locally', 'Persist With Tools Until The Claim Is Grounded', 'explicit invocation', 'Respect Explicit User Model Intent', explicitUserModelIntentDocSnippet, explicitUserFallbackDocSnippet, explicitUserDefaultsAreFallbackDocSnippet, 'Must preserve the same behaviors in role-appropriate wording.', 'explicit caller-specified sub-agent model or reasoning settings over inherited or default settings unless unavailable or incompatible', 'fallback only']],
  [repoPath('docs', 'customizing.md'), ['docs/guidance-schema.md', 'docs/prompt-contract.md', 'explicit invocation by name', 'binding over inherited or default settings unless unavailable or incompatible', 'relevant files under `prompts/`', 'generated files under `agents/` when prompts change', 'mirrored files under `.codex/` when mirrored source surfaces change', 'npm run generate:agents', 'npm run refresh:mirror', 'npm run verify', 'fallback only', 'hooks/workflow-mode-schemas.mjs', 'registry/workflow-mode-schemas.mjs']],
  [repoPath('skills', 'cdx-clarify', 'SKILL.md'), ['Recommended next step', 'cdx-ralph', 'cdx-autopilot']],
  [repoPath('skills', 'cdx-clarify', 'SKILL.md'), ['Decision boundaries']],
  [repoPath('skills', 'cdx-deep-interview', 'SKILL.md'), ['$CODEX_HOME/workflows/deep-interview', 'context.md', 'interview.md', 'spec.md', 'Decision boundaries', 'Do not implement directly inside `cdx-deep-interview`', 'source of truth']],
  [repoPath('skills', 'cdx-autoresearch-plan', 'SKILL.md'), ['$CODEX_HOME/workflows/autoresearch-plan', 'spec.md', 'results.tsv', 'research spec']],
  [repoPath('skills', 'cdx-autoresearch-loop', 'SKILL.md'), ['$CODEX_HOME/workflows/autoresearch-loop', 'results.tsv', 'handoff.json', 'progress.json', 'Use `mode: "autoresearch-loop"`', 'verification.review']],
  [repoPath('skills', 'cdx-execute', 'SKILL.md'), ['Escalate to `cdx-plan`', 'Escalate to `cdx-ralph`', 'Escalate to `cdx-autopilot`']],
  [repoPath('skills', 'cdx-review', 'SKILL.md'), ['Verdict: APPROVE / REVISE / REJECT', 'Findings first']],
  [repoPath('skills', 'cdx-tdd', 'SKILL.md'), ['Use this only when', 'cdx-execute` or `cdx-review`']],
  [repoPath('skills', 'cdx-plan', 'SKILL.md'), ['handoff.json', 'architect', 'verifier', 'Decision boundaries', 'loop contract', 'handoff.json.approvals']],
  [repoPath('skills', 'cdx-ralph', 'SKILL.md'), ['schema_version', 'workflow_root', 'verification', 'risks', 'verification.review', 'approvals']],
  [repoPath('skills', 'cdx-autopilot', 'SKILL.md'), ['governed workflow owner', 'Iteration Boundaries', 'progress.json', 'handoff.json', 'cdx-autoresearch-loop', 'verification.review', 'approvals']],
  [repoPath('skills', 'cdx-ultrawork', 'SKILL.md'), ['$CODEX_HOME/workflows/ultrawork', 'verify.md', 'handoff.json', 'cdx-autoresearch-loop', 'verification.review']],
  [repoPath('AGENTS.template.md'), ['SessionStart', 'Stop', 'terminal', 'docs/guidance-schema.md', 'docs/prompt-contract.md', 'explicitly invoked by name first', 'If the user explicitly specifies a sub-agent model, treat that choice as binding over inherited or default settings unless the requested model is unavailable or incompatible.', 'If the user explicitly specifies sub-agent reasoning effort, treat that choice as binding over inherited or default settings unless the requested setting is unavailable or incompatible.', 'Do not override, downgrade, or swap', 'fallback only; they never justify silently overriding an explicit user request', 'Non-governed requirements workflows such as `cdx-deep-interview` may persist durable artifacts there without `progress.json` or `handoff.json`.', '`cdx-autoresearch-loop` is the governed research execution mode']],
];

for (const [path, snippets] of governorSurfaceChecks) {
  const content = await readFile(path, 'utf8');
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`governor surface missing "${snippet}": ${path}`);
    }
  }
}

for (const name of roleNames()) {
  const prompt = await readFile(rolePromptPath(name), 'utf8');
  if (!prompt.includes(explicitCallerModelIntentPromptSnippet)) {
    throw new Error(`role prompt missing explicit caller model-intent rule for ${name}: ${rolePromptPath(name)}`);
  }
  if (!prompt.includes(explicitCallerFallbackPromptSnippet)) {
    throw new Error(`role prompt missing explicit caller fallback rule for ${name}: ${rolePromptPath(name)}`);
  }
}

for (const name of roleNames()) {
  const agent = await readFile(generatedAgentPath(name), 'utf8');
  if (!agent.includes(explicitCallerModelIntentPromptSnippet)) {
    throw new Error(`generated agent missing explicit caller model-intent rule for ${name}: ${generatedAgentPath(name)}`);
  }
  if (!agent.includes(explicitCallerFallbackPromptSnippet)) {
    throw new Error(`generated agent missing explicit caller fallback rule for ${name}: ${generatedAgentPath(name)}`);
  }
}

const installScript = await readFile(repoPath('scripts', 'install-user.mjs'), 'utf8');
if (!installScript.includes('mergeManagedHooksConfig') || !installScript.includes('probeCodexHooksSupport')) {
  throw new Error('install-user.mjs is missing native hook wiring');
}
if (!installScript.includes('stripManagedFeaturesSection') || installScript.includes('upsertFeaturesSection')) {
  throw new Error('install-user.mjs must strip legacy managed feature flags instead of writing 0.128 native feature flags');
}

const uninstallScript = await readFile(repoPath('scripts', 'uninstall-user.mjs'), 'utf8');
if (!uninstallScript.includes('stripManagedHooksConfig')) {
  throw new Error('uninstall-user.mjs is missing managed hook cleanup');
}

const mirrorScript = await readFile(repoPath('scripts', 'refresh-repo-mirror.mjs'), 'utf8');
for (const snippet of ['copyTree', '.codex', 'mirrorHookAssetsDir']) {
  if (!mirrorScript.includes(snippet)) {
    throw new Error(`refresh-repo-mirror.mjs missing "${snippet}"`);
  }
}

const governorRuntime = await readFile(repoPath('hooks', 'chedex-governor.mjs'), 'utf8');
for (const snippet of ['session-start', 'workflow-sync', 'workflow-clear', 'workflow-lock-repair', 'verification-complete', 'risks must be an array', 'buildReleaseAudit', 'MODE_SCHEMAS', '_archive.json', 'repairStaleWorkflowLocks', 'collectRequiredArtifactsForProgress', 'active workflow owner replacement requires --replace']) {
  if (!governorRuntime.includes(snippet)) {
    throw new Error(`governor runtime missing "${snippet}"`);
  }
}

const releaseAuditRuntime = await readFile(repoPath('hooks', 'codex-release-audit.mjs'), 'utf8');
for (const snippet of ['registry.npmjs.org', 'renderReleaseAuditAdvisory', 'CODEX_RELEASE_DELTAS_URL', 'codex-release-deltas.json', 'CHEDEX_RELEASE_DELTA_COMPAT_VERSION', 'codex update']) {
  if (!releaseAuditRuntime.includes(snippet)) {
    throw new Error(`release audit runtime missing "${snippet}"`);
  }
}

const libContent = await readFile(repoPath('scripts', 'lib.mjs'), 'utf8');
if (!libContent.includes("return process.env.CODEX_HOME || join(homedir(), '.codex');")) {
  throw new Error('codexHome() no longer resolves to ~/.codex');
}
for (const snippet of ['chedexMinimumCodexVersion', 'mergeManagedHooksConfig', 'probeCodexHooksSupport', 'detectInlineManagedHookDuplicates', 'managed:v1']) {
  if (!libContent.includes(snippet)) {
    throw new Error(`lib.mjs missing ${snippet}`);
  }
}
if (libContent.includes('function upsertFeaturesSection') || libContent.includes('chedexUserPromptSubmitMinimumCodexVersion')) {
  throw new Error('lib.mjs still contains pre-0.128 feature-flag or conditional UserPromptSubmit install logic');
}

const mirrorRequiredPaths = [
  repoPath('.codex', 'AGENTS.md'),
  repoPath('.codex', 'prompts'),
  repoPath('.codex', 'skills'),
  repoPath('.codex', 'agents'),
  repoPath('.codex', 'hooks', 'chedex'),
];
const missingMirrorPaths = anyMissing(mirrorRequiredPaths);
if (missingMirrorPaths.length) {
  throw new Error(`.codex mirror is incomplete: ${missingMirrorPaths.join(', ')}`);
}

await assertFileEqual(manifest.templateAgents, repoPath('.codex', 'AGENTS.md'), '.codex/AGENTS.md');
await assertTreeEqual(manifest.promptsDir, repoPath('.codex', 'prompts'), '.codex/prompts');
await assertTreeEqual(manifest.skillsDir, repoPath('.codex', 'skills'), '.codex/skills');
await assertTreeEqual(manifest.agentsDir, repoPath('.codex', 'agents'), '.codex/agents');
await assertTreeEqual(manifest.hooksDir, repoPath('.codex', 'hooks', 'chedex'), '.codex/hooks/chedex');

const quotedHookCommand = buildManagedHooksConfig({
  hookRuntimePath: '/tmp/Codex Home/hooks/chedex/chedex-governor.mjs',
}).hooks.SessionStart[0].hooks[0].command;
assert(quotedHookCommand.startsWith("'"), 'managed hook commands must shell-quote the node executable');
assert(quotedHookCommand.includes("'/tmp/Codex Home/hooks/chedex/chedex-governor.mjs'"), 'managed hook commands must shell-quote governor paths');
const quotedUserPromptSubmitCommand = buildManagedHooksConfig({
  hookRuntimePath: '/tmp/Codex Home/hooks/chedex/chedex-governor.mjs',
}).hooks.UserPromptSubmit[0].hooks[0].command;
assert(quotedUserPromptSubmitCommand.includes(' user-prompt-submit'), 'managed hook config should expose the prompt-submit governor command');

for (const path of [repoPath('README.md'), repoPath('docs', 'customizing.md')]) {
  const content = await readFile(path, 'utf8');
  if (!content.includes('registry/agent-definitions.mjs')) {
    throw new Error(`doc surface missing registry/agent-definitions.mjs guidance: ${path}`);
  }
}

const architectAgentBeforeDryRun = await readFile(repoPath('agents', 'architect.toml'), 'utf8');
execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs'), '--dry-run'], {
  cwd: repoPath(),
  env: process.env,
  encoding: 'utf8',
});
const architectAgentAfterDryRun = await readFile(repoPath('agents', 'architect.toml'), 'utf8');
assert(architectAgentBeforeDryRun === architectAgentAfterDryRun, 'install-user --dry-run must not rewrite generated agents');

const installHomeRoot = await mkdtemp(join(tmpdir(), 'chedex verify '));
const installHome = join(installHomeRoot, 'Codex Home');
const customAgents = '# custom user agents\n';
const customHook = '#!/usr/bin/env node\nprocess.stdout.write("custom hook\\n");\n';
const siblingHookAsset = join(installHome, 'hooks', 'chedex', 'custom-helper.txt');
await mkdir(join(installHome, 'hooks', 'chedex'), { recursive: true });
await writeFile(join(installHome, 'AGENTS.md'), customAgents);
await writeFile(join(installHome, 'hooks', 'chedex', 'chedex-governor.mjs'), customHook);
await writeFile(siblingHookAsset, 'keep me\n');

const installEnv = {
  ...process.env,
  CODEX_HOME: installHome,
};

execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs')], {
  cwd: repoPath(),
  env: installEnv,
  encoding: 'utf8',
});

const installedHooksConfig = JSON.parse(await readFile(join(installHome, 'hooks.json'), 'utf8'));
const sessionStartCommand = installedHooksConfig.hooks.SessionStart[0].hooks[0].command;
assert(sessionStartCommand.includes(`'${join(installHome, 'hooks', 'chedex', 'chedex-governor.mjs')}'`), 'install-user should quote managed hook runtime paths');
assert(installedHooksConfig.hooks.SessionStart[0].matcher === '^(startup|resume|clear)$', 'install-user should preserve the SessionStart startup/resume/clear matcher');
if (hookProbe.supportedHookEvents.includes('UserPromptSubmit')) {
  assert(installedHooksConfig.hooks.UserPromptSubmit[0].hooks[0].command.includes('user-prompt-submit'), 'install-user should wire the prompt-submit governor command when supported');
}

execFileSync(process.execPath, [repoPath('scripts', 'uninstall-user.mjs')], {
  cwd: repoPath(),
  env: installEnv,
  encoding: 'utf8',
});

assert((await readFile(join(installHome, 'AGENTS.md'), 'utf8')) === customAgents, 'uninstall-user should restore a pre-existing AGENTS.md');
assert((await readFile(join(installHome, 'hooks', 'chedex', 'chedex-governor.mjs'), 'utf8')) === customHook, 'uninstall-user should restore a pre-existing hook runtime');
assert((await readFile(siblingHookAsset, 'utf8')) === 'keep me\n', 'uninstall-user should not remove sibling hook assets');
assert(anyMissing([join(installHome, 'config.toml')]).length === 1, 'uninstall-user should remove config.toml when install created it and no user config remains');
assert(anyMissing([join(installHome, 'hooks.json')]).length === 1, 'uninstall-user should remove hooks.json when install created it and no user hooks remain');

process.stdout.write(`verify-ok roles=${Object.keys(ROLE_DEFINITIONS).length} skills=${repoSkillDirs.length}\n`);
