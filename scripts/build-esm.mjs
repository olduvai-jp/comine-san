#!/usr/bin/env node
import { rmSync, cpSync, readdirSync, renameSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptsDir);
const tmpRoot = join(projectRoot, 'dist', '.esm-tmp');
const tmpSrcDir = join(tmpRoot, 'src');

rmSync(tmpRoot, { recursive: true, force: true });
cpSync(join(projectRoot, 'src'), tmpSrcDir, { recursive: true });

const renameToMts = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      renameToMts(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      const target = fullPath.replace(/\.ts$/, '.mts');
      renameSync(fullPath, target);
    }
  }
};

renameToMts(tmpSrcDir);

const toPosix = (value) => value.replace(/\\/g, '/');

const rewriteImports = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteImports(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.mts')) {
      const fileDir = dirname(fullPath);
      const original = readFileSync(fullPath, 'utf8');
      const transformed = original.replace(
        /(from\s+['"])(\.{1,2}[^'"]*)(['"])/g,
        (match, prefix, specifier, suffix) => {
          if (!specifier.startsWith('.')) return match;
          const targetBase = join(fileDir, specifier);
          const directFile = `${targetBase}.mts`;
          const indexFile = join(targetBase, 'index.mts');

          if (existsSync(directFile)) {
            return `${prefix}${toPosix(`${specifier}.mjs`)}${suffix}`;
          }

          if (existsSync(indexFile)) {
            const normalized = specifier.endsWith('/') ? specifier.slice(0, -1) : specifier;
            return `${prefix}${toPosix(`${normalized}/index.mjs`)}${suffix}`;
          }

          return match;
        }
      );

      writeFileSync(fullPath, transformed);
    }
  }
};

rewriteImports(tmpSrcDir);

const tmpTsconfigPath = join(tmpRoot, 'tsconfig.json');
const esmConfig = {
  extends: join(projectRoot, 'tsconfig.base.json'),
  compilerOptions: {
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    outDir: join(projectRoot, 'dist', 'esm'),
    declaration: false,
    sourceMap: false,
    rootDir: './src',
    types: ['node'],
  },
  include: ['./src/**/*'],
};

writeFileSync(tmpTsconfigPath, JSON.stringify(esmConfig, null, 2));

try {
  execSync(`npx tsc -p "${tmpTsconfigPath}"`, { stdio: 'inherit' });
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}
