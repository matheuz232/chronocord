import process from "node:process";

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`Node.js ${process.versions.node} detectado. O ChronoCord requer Node.js 18+ para esta build.`);
  process.exit(1);
}

try {
  const esbuild = await import('esbuild');
  const result = await esbuild.transform('const el = <div>Hello</div>;', { loader: 'jsx', format: 'esm', target: 'es2020' });
  if (!result.code.includes('Hello')) throw new Error('Transformação JSX não retornou código válido.');
  console.log(`Build preflight OK — Node ${process.versions.node}, esbuild ${esbuild.version}.`);
} catch (error) {
  console.error('\nFalha ao iniciar o esbuild.\n');
  console.error(error?.stack || error?.message || error);
  console.error('\nSe estiver no Windows, apague node_modules e package-lock.json e execute:\n  npm install --include=optional\n  npm rebuild esbuild\n  npm run build\n');
  process.exit(1);
}
