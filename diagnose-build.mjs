import process from "node:process";
import fs from "node:fs";
import path from "node:path";

console.log(`Node.js: ${process.versions.node}`);
console.log(`Platform: ${process.platform}-${process.arch}`);
try {
  const esbuild = await import('esbuild');
  console.log(`esbuild: ${esbuild.version}`);
  console.log(`esbuild path: ${import.meta.resolve('esbuild')}`);
  await esbuild.transform('const el = <div />;', {loader:'jsx'});
  console.log('esbuild JSX transform: OK');
} catch (e) {
  console.error('esbuild check FAILED');
  console.error(e?.stack || e?.message || e);
  process.exitCode=1;
}
console.log(`package.json: ${path.resolve('package.json')}`);
console.log(`node_modules exists: ${fs.existsSync('node_modules')}`);
