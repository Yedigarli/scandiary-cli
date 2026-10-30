#!/usr/bin/env node
// scandiary.mjs — Command line entry point.

import { readFileSync } from 'node:fs';
import { HELP, parseArgs } from '../src/args.mjs';
import { openBrowser } from '../src/chrome.mjs';
import { crawl } from '../src/crawl.mjs';
import { formatPrompt } from '../src/prompt.mjs';
import { formatJson, formatText, mergeIssues } from '../src/report.mjs';

// Progress goes to stderr, so `--prompt > file.md` holds only the prompt.
const log = (text) => console.error(text);

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP);
    return 0;
  }
  if (options.version) {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(version);
    return 0;
  }

  log(`Checking ${options.url.hostname} (up to ${options.pages} pages)`);
  const browser = await openBrowser();
  let crawlResult;
  try {
    crawlResult = await crawl(browser, options.url, options.pages, log);
  } finally {
    await browser.close();
  }

  if (crawlResult.pages.length === 0) {
    const reasons = crawlResult.failed.map((page) => `  ${page.url}: ${page.reason}`).join('\n');
    throw new Error(`No page could be opened, so nothing was checked.\n${reasons}`);
  }

  const issues = mergeIssues(crawlResult.pages);
  if (options.prompt) console.log(formatPrompt(options.url.toString(), crawlResult.pages, issues));
  else if (options.json) console.log(formatJson(crawlResult, issues, options.pages));
  else console.log(formatText(crawlResult, issues, options.pages));

  return options.strict && issues.length > 0 ? 1 : 0;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 2;
});
