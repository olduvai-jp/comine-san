import { runCli } from './src/cli';

export * from './src/lib';
export { runCli };

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
