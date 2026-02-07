import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function collectTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const out = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectTestFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      out.push(fullPath);
    }
  }
  return out;
}

async function main() {
  const repoRoot = process.cwd();
  const testsDir = path.join(repoRoot, 'tests');
  if (!existsSync(testsDir)) {
    console.error(`Tests directory not found: ${testsDir}`);
    process.exit(1);
  }

  const testFiles = await collectTestFiles(testsDir);
  testFiles.sort((a, b) => a.localeCompare(b));

  const child = spawn(
    process.execPath,
    ['--test', '-r', 'ts-node/register', ...testFiles],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        TS_NODE_PROJECT: 'tsconfig.test.json',
      },
    },
  );

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });

  child.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
