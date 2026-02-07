#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const pkgPath = path.join(repoRoot, 'package.json');
const outDir = path.join(repoRoot, 'tests', 'typecheck');
const outFile = path.join(outDir, 'public-api-imports.ts');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function listTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'))
    .map((e) => path.join(dir, e.name));
}

function listTsFilesRecursive(dir, prefixRel = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefixRel ? path.join(prefixRel, entry.name) : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFilesRecursive(full, rel));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push({ rel, full });
    }
  }
  return out;
}

function main() {
  const pkg = readJson(pkgPath);
  const exportsObj = pkg.exports ?? {};

  const specifiers = new Set();

  for (const key of Object.keys(exportsObj)) {
    if (key === '.') {
      specifiers.add('comine-san');
      continue;
    }
    if (!key.startsWith('./')) continue;

    const subpath = key.slice(2); // remove "./"

    if (subpath === 'package.json') {
      specifiers.add('comine-san/package.json');
      continue;
    }

    if (!subpath.includes('*')) {
      specifiers.add(`comine-san/${subpath}`);
      continue;
    }

    // Expand known wildcard exports to all concrete source modules.
    // This keeps the check aligned with package.json#exports while remaining build-free.
    if (subpath === 'workflow/*') {
      const workflowDir = path.join(repoRoot, 'src', 'lib', 'workflow');
      for (const f of listTsFiles(workflowDir)) {
        const base = path.basename(f, '.ts');
        specifiers.add(`comine-san/workflow/${base}`);
      }
      continue;
    }

    if (subpath === 'nodes/*') {
      const nodesDir = path.join(repoRoot, 'src', 'lib', 'workflow', 'nodes');
      for (const { rel } of listTsFilesRecursive(nodesDir)) {
        const noExt = rel.replace(/\.ts$/, '').split(path.sep).join('/');
        specifiers.add(`comine-san/nodes/${noExt}`);
      }
      continue;
    }

    // If exports change, we want type-check to fail loudly instead of silently missing coverage.
    throw new Error(`Unhandled exports pattern: ${key}`);
  }

  const sorted = [...specifiers].sort((a, b) => a.localeCompare(b));

  const lines = [];
  lines.push('/*');
  lines.push(' * GENERATED FILE: do not edit by hand.');
  lines.push(' *');
  lines.push(' * This file is generated from package.json#exports to ensure all public import');
  lines.push(' * paths compile in CI (breaking-change detection).');
  lines.push(' */');
  lines.push('');

  let i = 0;
  for (const spec of sorted) {
    if (spec.endsWith('/package.json')) {
      lines.push(`import pkg${i} from '${spec}';`);
      lines.push(`void pkg${i};`);
    } else {
      lines.push(`import type * as M${i} from '${spec}';`);
    }
    lines.push('');
    i += 1;
  }
  lines.push('export {};');
  lines.push('');

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
}

main();
