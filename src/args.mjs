// args.mjs — Reads the command line. Bad input fails here, before a browser starts.

export const DEFAULT_PAGES = 5;
export const MAX_PAGES = 100;

export const HELP = `scandiary <url> [options]

Checks a site with axe-core and writes a fix prompt for your AI coding tool.

Options:
  --pages <n>      Pages to check (default ${DEFAULT_PAGES}, max ${MAX_PAGES})
  --prompt         Print only the fix prompt, for piping into a file or clipboard
  --json           Print the full result as JSON
  --strict         Exit with code 1 when issues are found (for CI)
  -h, --help       Show this help
  -v, --version    Show the version

Examples:
  npx scandiary https://example.com
  npx scandiary localhost:3000 --pages 10
  npx scandiary https://example.com --prompt > fix-a11y.md
`;

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i;

/** Accepts `example.com` and `localhost:3000`, because that is what people type. */
export function parseUrl(raw) {
  if (!raw) throw new Error('Give me a URL. Example: npx scandiary https://example.com');

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  const withScheme = hasScheme ? raw : `${LOCAL_HOST.test(raw) ? 'http' : 'https'}://${raw}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`That URL is not valid: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Only http and https URLs can be checked. Got: ${raw}`);
  }
  return url;
}

export function parsePages(raw) {
  const pages = Number(raw);
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) {
    throw new Error(`--pages must be a whole number from 1 to ${MAX_PAGES}. Got: ${raw}`);
  }
  return pages;
}

export function parseArgs(argv) {
  const options = { pages: DEFAULT_PAGES, prompt: false, json: false, strict: false };
  let target;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') return { ...options, help: true };
    if (arg === '-v' || arg === '--version') return { ...options, version: true };
    if (arg === '--prompt') options.prompt = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--pages') {
      i += 1;
      options.pages = parsePages(argv[i]);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (target) {
      throw new Error(`Give me one URL at a time. Got a second one: ${arg}`);
    } else {
      target = arg;
    }
  }

  if (options.prompt && options.json) throw new Error('Use --prompt or --json, not both.');
  return { ...options, url: parseUrl(target) };
}
