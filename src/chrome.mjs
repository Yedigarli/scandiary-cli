// chrome.mjs — Finds a browser already on the machine.
//
// `puppeteer-core` is used so `npx scandiary` does not download a 170 MB browser.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { VIEWPORT } from './scan.mjs';

function candidates(platform, env) {
  if (platform === 'win32') {
    const roots = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean);
    return roots.flatMap((root) => [
      join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(root, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ]);
  }
  if (platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ];
}

export function findBrowser({ platform = process.platform, env = process.env, exists = existsSync } = {}) {
  if (env.CHROME_PATH) {
    if (exists(env.CHROME_PATH)) return env.CHROME_PATH;
    throw new Error(`CHROME_PATH points to a file that does not exist: ${env.CHROME_PATH}`);
  }
  const found = candidates(platform, env).find((path) => exists(path));
  if (found) return found;
  throw new Error(
    'No Chrome, Edge or Brave found. Install one, or set CHROME_PATH to a Chromium-based browser.',
  );
}

/*
  Chrome's sandbox usually cannot start inside a Docker container, and Glama checks MCP
  servers in one. The container is then the isolation, so the Dockerfile sets this.
  It is off unless set to exactly "1": on a user's own machine the sandbox stays on.
*/
export function launchArgs(env = process.env) {
  return env.SCANDIARY_NO_SANDBOX === '1' ? ['--no-sandbox'] : [];
}

export function openBrowser() {
  return puppeteer.launch({
    headless: true,
    executablePath: findBrowser(),
    defaultViewport: VIEWPORT,
    args: launchArgs(),
  });
}
