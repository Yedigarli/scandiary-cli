// scan.mjs — Opens one page and runs axe-core on it.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

// Same rule set as the hosted Scandiary scan, so the two give comparable numbers.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const PAGE_TIMEOUT_MS = 30000;

// 800×600, the browser default, opens a tablet layout most visitors never see.
export const VIEWPORT = { width: 1440, height: 900 };

const SETTLE = { minMs: 1000, windowMs: 800, maxMs: 6000 };

const STOP_MOTION = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

/*
  "Network idle" does not mean the page is ready: images, cookie banners and sliders
  still move. Waiting for the DOM to stop changing keeps repeat scans comparable.
  The upper limit exists because a carousel never stops.
*/
async function waitForDomToSettle(page) {
  return page.evaluate(async ({ minMs, windowMs, maxMs }) => {
    const start = Date.now();
    await new Promise((resolve) => {
      let quietTimer;
      let observer;
      const finish = () => {
        clearTimeout(quietTimer);
        clearTimeout(hardTimer);
        observer.disconnect();
        resolve();
      };
      const checkQuiet = () => {
        const elapsed = Date.now() - start;
        if (elapsed < minMs) quietTimer = setTimeout(checkQuiet, minMs - elapsed);
        else finish();
      };
      const hardTimer = setTimeout(finish, maxMs);
      observer = new MutationObserver(() => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(checkQuiet, windowMs);
      });
      observer.observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, characterData: true,
      });
      quietTimer = setTimeout(checkQuiet, windowMs);
    });
  }, SETTLE);
}

/** Better measurement, not a requirement: a strict page should still get scanned. */
async function prepareForMeasuring(page, warn) {
  try {
    await waitForDomToSettle(page);
    await page.evaluate(async () => { if (document.fonts) await document.fonts.ready; });
    await page.addStyleTag({ content: STOP_MOTION });
  } catch (error) {
    warn(`Page was not fully settled before measuring: ${error.message}`);
  }
}

/*
  Without this check an error response still got scanned. An empty 404 makes Chrome
  show its own error page, and that page's issues were reported as the site's
  (found 2026-11-03: a 404 came back as "meta-viewport" on chrome-error://chromewebdata/).
  A site's own 404 page is refused too: it is not the page the user asked about.
*/
export function pageProblem(status, finalUrl) {
  if (!/^https?:/.test(finalUrl)) return 'The browser showed its own error page, so the page was NOT checked.';
  if (status == null) return 'The server sent no response, so the page was NOT checked.';
  if (status >= 400) return `The server answered HTTP ${status}, so the page was NOT checked.`;
  return null;
}

export async function scanPage(browser, address, warn = () => {}) {
  const page = await browser.newPage();
  try {
    // axe has to run inside the page. Without this, a strict CSP stops it from loading.
    // It only affects this private headless browser, never the site or its visitors.
    await page.setBypassCSP(true);
    const response = await page.goto(address, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT_MS });
    const problem = pageProblem(response?.status() ?? null, page.url());
    if (problem) throw new Error(problem);
    await prepareForMeasuring(page, warn);
    await page.addScriptTag({ path: AXE_PATH });

    const axeLoaded = await page.evaluate(() => typeof window.axe !== 'undefined');
    if (!axeLoaded) {
      throw new Error('axe-core could not load on this page, so the page was NOT checked.');
    }

    const result = await page.evaluate(
      async (tags) => window.axe.run(document, { runOnly: tags }),
      WCAG_TAGS,
    );
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'), (a) => a.href));

    return { result, links, finalUrl: page.url() };
  } finally {
    await page.close();
  }
}
