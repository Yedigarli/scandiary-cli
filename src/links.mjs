// links.mjs — Decides which links the crawler follows.

const FILE_EXTENSIONS = [
  '.pdf', '.zip', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.csv',
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.avif',
  '.mp4', '.mp3', '.webm', '.woff', '.woff2', '.ttf', '.css', '.js',
];

/** Same page, one spelling: `/about#team` and `/about/` both become `/about`. */
export function normalizeUrl(address) {
  const url = new URL(address);
  url.hash = '';
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

/*
  Query strings are skipped on purpose. Store filters (?color=red&size=M) create
  thousands of variations and would eat the page budget. The cost is missing real
  pages such as ?page=2.
*/
function shouldFollow(address, root) {
  let url;
  try {
    url = new URL(address);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.hostname !== root.hostname) return false;
  if (url.search) return false;
  const path = url.pathname.toLowerCase();
  return !FILE_EXTENSIONS.some((extension) => path.endsWith(extension));
}

export function filterLinks(links, root, seen) {
  const clean = new Set();
  for (const link of links) {
    if (!shouldFollow(link, root)) continue;
    const normalized = normalizeUrl(link);
    if (!seen.has(normalized)) clean.add(normalized);
  }
  return [...clean];
}

/**
 * After a redirect the site's real host may differ (`a.com` → `www.a.com`). Without
 * this every internal link looks external, the scan stops at one page and reports a
 * clean result that nobody earned.
 */
export function resolveRoot(typedRoot, openedAddress) {
  let opened;
  try {
    opened = new URL(openedAddress);
  } catch {
    return typedRoot;
  }
  return opened.hostname === typedRoot.hostname ? typedRoot : opened;
}
