import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(sourceDir, '.figma-upload');
const css = await readFile(path.join(sourceDir, 'mockup.css'), 'utf8');
await mkdir(outputDir, { recursive: true });
for (const name of ['account', 'group-invite', 'expense', 'debt', 'vietqr', 'history']) {
  const source = await readFile(path.join(sourceDir, `${name}.html`), 'utf8');
  const html = source.replace('<link rel="stylesheet" href="mockup.css">', `<style>${css}</style>`);
  await writeFile(path.join(outputDir, `${name}.html`), html, 'utf8');
}
console.log('Prepared 6 self-contained HTML files.');
