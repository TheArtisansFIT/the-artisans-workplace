#!/usr/bin/env node
/**
 * Export the static SplitNest mockups as native, editable SVG files for Figma.
 * No npm dependencies are required; a local Chrome or Edge installation is used
 * to calculate the browser layout before serialising it to SVG primitives.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(sourceDir, 'figma');
const tempDir = path.join(sourceDir, '.figma-export-tmp');

const jobs = [
  { source: 'account.html', board: 'account', screens: [
    ['a1', 'A1-sign-up'],
    ['a2', 'A2-sign-in-error'],
    ['a3', 'A3-bank-details-empty'],
    ['a4', 'A4-bank-details-saved'],
  ] },
  { source: 'group-invite.html', board: 'group-invite', screens: [
    ['g1', 'G1-my-groups'],
    ['g2', 'G2-create-group'],
    ['g3', 'G3-group-members'],
    ['g4', 'G4-invite-members'],
    ['g5', 'G5-join-signed-in'],
    ['g6', 'G6-join-signed-out'],
    ['g7', 'G7-invalid-invite'],
  ] },
  { source: 'expense.html', board: 'expense', screens: [
    ['e1', 'E1-expenses-list'],
    ['e2', 'E2-add-expense'],
    ['e3', 'E3-expense-validation'],
    ['e4', 'E4-expense-detail'],
    ['e5', 'E5-expense-locked'],
    ['e6', 'E6-delete-expense'],
  ] },
  { source: 'debt.html', board: 'debt', screens: [
    ['d1', 'D1-debt-list'],
    ['d2', 'D2-report-repayment'],
    ['d3', 'D3-review-repayment'],
    ['d4', 'D4-repayment-confirmed'],
    ['d5', 'D5-repayment-rejected'],
  ] },
  { source: 'vietqr.html', board: 'vietqr', screens: [
    ['q1', 'Q1-vietqr-details'],
    ['q2', 'Q2-vietqr-generated'],
  ] },
  { source: 'history.html', board: 'history', screens: [
    ['h1', 'H1-history-all-activity'],
    ['h2', 'H2-history-repayments'],
  ] },
];

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

// This function is stringified and run inside the browser. Keep it self-contained.
function exportInBrowser(config) {
  const target = document.querySelector(config.selector);
  if (!target) throw new Error(`Missing export target: ${config.selector}`);

  const crop = config.selector === 'body'
    ? { left: 0, top: 0, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }
    : target.getBoundingClientRect();
  const defs = [];
  let gradientCount = 0;
  let clipCount = 0;
  let layerCount = 0;

  const num = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const esc = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const layerName = (tag, classes) => `${tag}${classes ? `-${classes}` : ''}`
    .toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'layer';
  const rectOf = element => {
    const r = element.getBoundingClientRect();
    return { x: r.left - crop.left, y: r.top - crop.top, width: r.width, height: r.height, right: r.right - crop.left, bottom: r.bottom - crop.top };
  };
  const visible = (r, style) => style.display !== 'none' && style.visibility !== 'hidden' &&
    Number(style.opacity) !== 0 && r.width > 0 && r.height > 0 &&
    r.right > 0 && r.bottom > 0 && r.x < crop.width && r.y < crop.height;
  const radius = (style, r) => {
    const value = parseFloat(style.borderTopLeftRadius) || 0;
    return Math.min(value, r.width / 2, r.height / 2);
  };
  const rectTag = (r, style, fill, extra = '') => {
    const rx = radius(style, r);
    return `<rect x="${num(r.x)}" y="${num(r.y)}" width="${num(r.width)}" height="${num(r.height)}"${rx ? ` rx="${num(rx)}"` : ''} fill="${fill}"${extra}/>`;
  };
  const colorWithOpacity = (color, opacity) => {
    if (opacity === 1) return color;
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) return color;
    const parts = match[1].split(/[ ,/]+/).filter(Boolean);
    const alpha = parts.length > 3 ? Number(parts[3]) * opacity : opacity;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  };

  function gradientFill(style, r) {
    const image = style.backgroundImage;
    if (!image || image === 'none' || !image.startsWith('linear-gradient')) return null;
    const match = image.match(/linear-gradient\((.*)\)$/);
    if (!match) return null;
    const parts = match[1].split(/,\s*(?![^()]*\))/);
    if (parts.length < 2) return null;
    let angle = 180;
    let start = 0;
    if (/^-?[\d.]+deg$/.test(parts[0].trim())) {
      angle = parseFloat(parts[0]);
      start = 1;
    }
    const stops = parts.slice(start).map((part, index, all) => {
      const color = part.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+/)?.[0] || '#000000';
      const percent = part.match(/([\d.]+)%/)?.[1] || String(index * 100 / (all.length - 1));
      return `<stop offset="${percent}%" stop-color="${color}"/>`;
    }).join('');
    const radians = (angle - 90) * Math.PI / 180;
    const x = Math.cos(radians) * 50;
    const y = Math.sin(radians) * 50;
    const id = `gradient-${++gradientCount}`;
    defs.push(`<linearGradient id="${id}" x1="${50 - x}%" y1="${50 - y}%" x2="${50 + x}%" y2="${50 + y}%">${stops}</linearGradient>`);
    return `url(#${id})`;
  }

  function borders(r, style) {
    const widths = ['Top', 'Right', 'Bottom', 'Left'].map(side => parseFloat(style[`border${side}Width`]) || 0);
    const colors = ['Top', 'Right', 'Bottom', 'Left'].map(side => style[`border${side}Color`]);
    if (!widths.some(Boolean)) return '';
    const uniform = widths.every(value => value === widths[0]) && colors.every(value => value === colors[0]);
    if (uniform) {
      const fill = 'none';
      const rx = radius(style, r);
      return `<rect x="${num(r.x + widths[0] / 2)}" y="${num(r.y + widths[0] / 2)}" width="${num(Math.max(0, r.width - widths[0]))}" height="${num(Math.max(0, r.height - widths[0]))}"${rx ? ` rx="${num(rx)}"` : ''} fill="${fill}" stroke="${colors[0]}" stroke-width="${widths[0]}"/>`;
    }
    const lines = [];
    if (widths[0]) lines.push(`<line x1="${num(r.x)}" y1="${num(r.y)}" x2="${num(r.right)}" y2="${num(r.y)}" stroke="${colors[0]}" stroke-width="${widths[0]}"/>`);
    if (widths[1]) lines.push(`<line x1="${num(r.right)}" y1="${num(r.y)}" x2="${num(r.right)}" y2="${num(r.bottom)}" stroke="${colors[1]}" stroke-width="${widths[1]}"/>`);
    if (widths[2]) lines.push(`<line x1="${num(r.x)}" y1="${num(r.bottom)}" x2="${num(r.right)}" y2="${num(r.bottom)}" stroke="${colors[2]}" stroke-width="${widths[2]}"/>`);
    if (widths[3]) lines.push(`<line x1="${num(r.x)}" y1="${num(r.y)}" x2="${num(r.x)}" y2="${num(r.bottom)}" stroke="${colors[3]}" stroke-width="${widths[3]}"/>`);
    return lines.join('');
  }

  function fontAttributes(style) {
    const family = style.fontFamily.includes('Segoe UI') ? 'Segoe UI' : style.fontFamily.split(',')[0].replaceAll('"', '');
    const spacing = style.letterSpacing === 'normal' ? '' : ` letter-spacing="${style.letterSpacing}"`;
    return `font-family="${esc(family)}" font-size="${style.fontSize}" font-weight="${style.fontWeight}" font-style="${style.fontStyle}"${spacing}`;
  }

  function transformedText(text, transform) {
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    return text;
  }

  function textTag(text, x, baseline, style, color) {
    const value = transformedText(text.replace(/\s+/g, ' ').trim(), style.textTransform);
    if (!value) return '';
    return `<text x="${num(x)}" y="${num(baseline)}" fill="${color || style.color}" ${fontAttributes(style)}>${esc(value)}</text>`;
  }

  function textNode(node) {
    const style = getComputedStyle(node.parentElement);
    const value = node.nodeValue;
    if (!value || !value.trim()) return '';
    const tokens = [];
    const expression = /\s+|\S+/g;
    let match;
    while ((match = expression.exec(value))) {
      const token = match[0];
      if (/^\s+$/.test(token)) {
        tokens.push({ token, whitespace: true });
        continue;
      }
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + token.length);
      const r = range.getBoundingClientRect();
      tokens.push({ token, whitespace: false, x: r.left - crop.left, y: r.top - crop.top, height: r.height });
    }
    const lines = [];
    let current = [];
    let currentY = null;
    for (const token of tokens) {
      if (token.whitespace) {
        if (current.length) current.push(token);
        continue;
      }
      if (currentY === null || Math.abs(token.y - currentY) < 2) {
        if (!current.length) currentY = token.y;
        current.push(token);
      } else {
        lines.push({ tokens: current, y: currentY });
        current = [token];
        currentY = token.y;
      }
    }
    if (current.length) lines.push({ tokens: current, y: currentY });
    const fontSize = parseFloat(style.fontSize);
    return lines.map(line => {
      const content = line.tokens.map(token => token.token).join('');
      const first = line.tokens.find(token => !token.whitespace);
      if (!first) return '';
      return textTag(content, first.x, line.y + fontSize * 0.8, style);
    }).join('');
  }

  function input(element, r, style) {
    if (element.type === 'checkbox') {
      const checked = element.checked;
      const box = `<rect x="${num(r.x)}" y="${num(r.y)}" width="${num(r.width)}" height="${num(r.height)}" rx="3" fill="${checked ? '#167d75' : '#fffefd'}" stroke="${checked ? '#167d75' : '#7b918b'}" stroke-width="1.2"/>`;
      const tick = checked ? `<path d="M ${num(r.x + 3.5)} ${num(r.y + 8.5)} L ${num(r.x + 7)} ${num(r.y + 12)} L ${num(r.x + 13.5)} ${num(r.y + 4.5)}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '';
      return box + tick;
    }
    const placeholder = element.getAttribute('placeholder');
    let value = element.value || placeholder || '';
    if (!value) return '';
    if (element.type === 'password' && element.value) value = '•'.repeat(element.value.length);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const color = element.value ? style.color : '#607474';
    return textTag(value, r.x + paddingLeft, r.y + r.height / 2 + parseFloat(style.fontSize) * 0.35, style, color);
  }

  function inlineSvg(svg) {
    const r = rectOf(svg);
    const style = getComputedStyle(svg);
    if (!visible(r, style)) return '';
    const use = svg.querySelector('use');
    const href = use?.getAttribute('href') || use?.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    const source = href?.startsWith('#') ? document.querySelector(href) : svg;
    if (!source) return '';
    const viewBox = (source.getAttribute('viewBox') || svg.getAttribute('viewBox') || '0 0 24 24').split(/[ ,]+/).map(Number);
    const scaleX = r.width / viewBox[2];
    const scaleY = r.height / viewBox[3];
    const serializer = new XMLSerializer();
    const content = Array.from(source.children).map(child => serializer.serializeToString(child)).join('');
    return `<g id="icon-${++layerCount}" transform="translate(${num(r.x)} ${num(r.y)}) scale(${num(scaleX)} ${num(scaleY)})" fill="${style.color}" color="${style.color}">${content}</g>`;
  }

  function pseudo(element, which, parentRect) {
    const style = getComputedStyle(element, which);
    if (!style || style.content === 'none' || style.display === 'none') return '';
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    if (!width || !height || style.position !== 'absolute') return '';
    const r = { width, height };
    r.x = style.left !== 'auto' ? parentRect.x + parseFloat(style.left) : parentRect.right - parseFloat(style.right) - width;
    r.y = style.top !== 'auto' ? parentRect.y + parseFloat(style.top) : parentRect.bottom - parseFloat(style.bottom) - height;
    r.right = r.x + width;
    r.bottom = r.y + height;
    let result = '';
    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') result += rectTag(r, style, style.backgroundColor);
    result += borders(r, style);
    return result;
  }

  function selectArrow(element, r) {
    if (!element.classList.contains('select')) return '';
    const x = r.right - 18;
    const y = r.y + r.height / 2 - 2;
    return `<path d="M ${num(x - 3)} ${num(y - 3)} L ${num(x)} ${num(y)} L ${num(x + 3)} ${num(y - 3)}" fill="none" stroke="#4a6060" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function walk(element) {
    if (!(element instanceof Element)) return '';
    if (element.tagName.toLowerCase() === 'svg') return inlineSvg(element);
    if (['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'SYMBOL'].includes(element.tagName)) return '';
    const style = getComputedStyle(element);
    const r = rectOf(element);
    if (!visible(r, style)) return '';
    const classes = Array.from(element.classList || []).slice(0, 2).join('-');
    const id = `${layerName(element.tagName.toLowerCase(), classes)}-${++layerCount}`;
    const opacity = Number(style.opacity) || 1;
    let clip = '';
    if (['hidden', 'auto', 'scroll', 'clip'].includes(style.overflow) || ['hidden', 'auto', 'scroll', 'clip'].includes(style.overflowX)) {
      const clipId = `clip-${++clipCount}`;
      defs.push(`<clipPath id="${clipId}">${rectTag(r, style, '#fff')}</clipPath>`);
      clip = ` clip-path="url(#${clipId})"`;
    }
    let before = '';
    const background = style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
    const gradient = gradientFill(style, r);
    if (background || gradient) before += rectTag(r, style, gradient || colorWithOpacity(style.backgroundColor, opacity));
    before += borders(r, style);
    before += pseudo(element, '::before', r);
    if (element.tagName === 'INPUT') before += input(element, r, style);

    let children = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) children += textNode(child);
      else if (child.nodeType === Node.ELEMENT_NODE) children += walk(child);
    }
    children += selectArrow(element, r);
    children += pseudo(element, '::after', r);
    return `<g id="${id}"${clip}>${before}${children}</g>`;
  }

  const content = walk(target);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(crop.width)}" height="${num(crop.height)}" viewBox="0 0 ${num(crop.width)} ${num(crop.height)}" role="img" aria-labelledby="title desc">
<title id="title">${esc(config.name)}</title>
<desc id="desc">SplitNest editable mockup exported from ${esc(config.source)}.</desc>
<defs>${defs.join('')}</defs>
<g id="${esc(config.name)}">${content}</g>
</svg>`;
}

function decodeHtml(value) {
  return value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');
}

async function render(browser, sourceHtml, config) {
  const html = sourceHtml.replace('</body>', `<script>document.body.textContent = (${exportInBrowser.toString()})(${JSON.stringify(config)});</script></body>`);
  const tempFile = path.join(tempDir, `${config.name}.html`);
  await writeFile(tempFile, html, 'utf8');
  const result = spawnSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', '--window-size=1440,1000', '--virtual-time-budget=1500',
    '--dump-dom', pathToFileURL(tempFile).href,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${config.name}: ${result.stderr || result.stdout}`);
  const match = result.stdout.match(/<body>([\s\S]*)<\/body>/);
  if (!match) throw new Error(`${config.name}: no SVG returned by browser`);
  const svg = decodeHtml(match[1]).trim();
  if (!svg.startsWith('<svg') || svg.includes('<foreignObject')) throw new Error(`${config.name}: invalid SVG export`);
  return `${svg}\n`;
}

await mkdir(path.join(outputDir, 'screens'), { recursive: true });
await mkdir(path.join(outputDir, 'boards'), { recursive: true });
await mkdir(tempDir, { recursive: true });
const browser = findBrowser();
let count = 0;

try {
  for (const job of jobs) {
    const source = await readFile(path.join(sourceDir, job.source), 'utf8');
    const css = await readFile(path.join(sourceDir, 'mockup.css'), 'utf8');
    const sourceHtml = source.replace('<link rel="stylesheet" href="mockup.css">', `<style>${css}</style>`);
    for (const [id, name] of job.screens) {
      const svg = await render(browser, sourceHtml, { selector: `#${id} > .browser`, name, source: job.source });
      await writeFile(path.join(outputDir, 'screens', `${name}.svg`), svg, 'utf8');
      console.log(`Created screens/${name}.svg`);
      count++;
    }
    const name = `${job.board}-board`;
    const svg = await render(browser, sourceHtml, { selector: 'body', name, source: job.source });
    await writeFile(path.join(outputDir, 'boards', `${name}.svg`), svg, 'utf8');
    console.log(`Created boards/${name}.svg`);
    count++;
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log(`Done: ${count} editable SVG files in ${outputDir}`);
