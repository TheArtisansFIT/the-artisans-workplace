#!/usr/bin/env node
/** Export each complete mockup board to PNG with the local Chrome or Edge. */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(sourceDir, 'png');
const tempDir = path.join(sourceDir, '.png-export-tmp');
const boards = ['account', 'group-invite', 'expense', 'debt', 'vietqr', 'history'];

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error('Chrome/Edge not found. Set CHROME_PATH to the browser executable.');
  return executable;
}

function run(browser, args) {
  const result = spawnSync(browser, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Browser exited ${result.status}`);
  return result.stdout;
}

await mkdir(outputDir, { recursive: true });
await mkdir(tempDir, { recursive: true });
const browser = findBrowser();

try {
  for (const board of boards) {
    const source = await readFile(path.join(sourceDir, `${board}.html`), 'utf8');
    const css = await readFile(path.join(sourceDir, 'mockup.css'), 'utf8');
    const styledSource = source.replace('<link rel="stylesheet" href="mockup.css">', `<style>${css}</style>`);
    const html = styledSource.replace('</body>', '<script>document.documentElement.setAttribute("data-export-size", `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`);</script></body>');
    const tempFile = path.join(tempDir, `${board}.html`);
    await writeFile(tempFile, html, 'utf8');
    const common = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', '--virtual-time-budget=1500'];
    const dom = run(browser, [...common, '--window-size=1440,1000', '--dump-dom', pathToFileURL(tempFile).href]);
    const size = dom.match(/data-export-size="(\d+)x(\d+)"/);
    if (!size) throw new Error(`${board}: unable to determine page size`);
    const [, width, height] = size;
    const output = path.join(outputDir, `${board}.png`);
    run(browser, [...common, `--window-size=${width},${height}`, `--screenshot=${output}`, pathToFileURL(tempFile).href]);
    console.log(`Created png/${board}.png (${width}x${height})`);
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
