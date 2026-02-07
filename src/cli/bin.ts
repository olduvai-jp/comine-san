#!/usr/bin/env node
import { runCli } from './index';

runCli().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

