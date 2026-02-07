#!/usr/bin/env node
import { runCli } from './index';

runCli().catch((error) => {
  console.error(error);
  if (process.exitCode == null) process.exitCode = 1;
});
