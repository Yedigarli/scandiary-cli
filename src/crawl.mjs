// crawl.mjs — Walks a site from its first page until the page limit is reached.

import { filterLinks, normalizeUrl, resolveRoot } from './links.mjs';
import { scanPage } from './scan.mjs';

const PAUSE_MS = 500;
const pause = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * @param {object} [hooks] `scan` and `pauseMs` exist so tests can run without a browser.
 * @returns {{pages, failed, redirectedTo}} a page that fails is recorded, never dropped.
 */
export async function crawl(browser, startUrl, pageLimit, log, hooks = {}) {
  const { scan = scanPage, pauseMs = PAUSE_MS } = hooks;
  const pages = [];
  const failed = [];
  const queue = [normalizeUrl(startUrl.toString())];
  const seen = new Set(queue);
  let root = startUrl;
  let redirectedTo = null;

  while (queue.length > 0 && pages.length < pageLimit) {
    const address = queue.shift();
    const isFirstPage = pages.length === 0;

    try {
      const { result, links, finalUrl } = await scan(browser, address, log);

      // Only the first page may move the root. A later redirect could be a partner
      // link, and following it would mean scanning someone else's site.
      if (isFirstPage) {
        const resolved = resolveRoot(root, finalUrl);
        if (resolved !== root) {
          root = resolved;
          redirectedTo = resolved.hostname;
        }
        if (finalUrl) seen.add(normalizeUrl(finalUrl));
      }

      const url = finalUrl || address;
      pages.push({ url, result });
      log(`[${pages.length}/${pageLimit}] ${result.violations.length} issue types · ${url}`);

      for (const link of filterLinks(links, root, seen)) {
        if (pages.length + queue.length >= pageLimit) break;
        seen.add(link);
        queue.push(link);
      }
    } catch (error) {
      failed.push({ url: address, reason: String(error.message).split('\n')[0] });
      log(`Could not open ${address}: ${failed.at(-1).reason}`);
    }

    await pause(pauseMs);
  }

  return { pages, failed, redirectedTo };
}
