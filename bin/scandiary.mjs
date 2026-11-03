#!/usr/bin/env node
// scandiary.mjs — Command line entry point.

import { readFileSync } from 'node:fs';
import { HELP, parseArgs } from '../src/args.mjs';
import { runCheck } from '../src/check.mjs';
import { serveStdio } from '../src/mcp.mjs';
import { formatPrompt } from '../src/prompt.mjs';
import { formatJson, formatText } from '../src/report.mjs';

// Progress goes to stderr, so `--prompt > file.md` holds only the prompt.
const log = (text) => console.error(text);

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(HELP);
    return 0;
  }
  if (options.mcp) {
    // Runs until the client closes stdin. stdout now carries only protocol messages.
    serveStdio();
    return null;
  }
  if (options.version) {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(version);
    return 0;
  }

  log(`Checking ${options.url.hostname} (up to ${options.pages} pages)`);
  const { crawlResult, issues } = await runCheck(options.url, options.pages, log);

  if (options.prompt) console.log(formatPrompt(options.url.toString(), crawlResult.pages, issues));
  else if (options.json) console.log(formatJson(crawlResult, issues, options.pages));
  else console.log(formatText(crawlResult, issues, options.pages));

  return options.strict && issues.length > 0 ? 1 : 0;
}

main().then((code) => {
  if (code !== null) process.exitCode = code;
}).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 2;
});
