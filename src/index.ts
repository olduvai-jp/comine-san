import { runCli as runCliImpl } from './cli';

export * from './lib';
export { runCliImpl as runCli };

if (require.main === module) {
  runCliImpl().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
