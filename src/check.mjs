// check.mjs — One full check: open a browser, crawl, merge. Shared by the CLI and the MCP server,
// so both report the same numbers for the same site.

import { openBrowser } from './chrome.mjs';
import { crawl } from './crawl.mjs';
import { mergeIssues } from './report.mjs';

export async function runCheck(url, pages, log) {
  const browser = await openBrowser();
  let crawlResult;
  try {
    crawlResult = await crawl(browser, url, pages, log);
  } finally {
    await browser.close();
  }

  if (crawlResult.pages.length === 0) {
    const reasons = crawlResult.failed.map((page) => `  ${page.url}: ${page.reason}`).join('\n');
    throw new Error(`No page could be opened, so nothing was checked.\n${reasons}`);
  }
  return { crawlResult, issues: mergeIssues(crawlResult.pages) };
}
