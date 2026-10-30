// report.mjs — Turns raw axe results into one sorted list and prints it.

const SEVERITY_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const MAX_LOCATIONS = 20;

export const LIMITS_NOTE =
  'Automated checks find roughly a third of accessibility problems, this one included. ' +
  'The rest needs a person. This result does not say whether a site meets any legal standard.';

export const MONITOR_NOTE = 'Keep this checked every week, with a dated history: https://scandiary.com/?ref=cli';

const rank = (impact) => SEVERITY_ORDER[impact] ?? 4;

export function mergeIssues(pages) {
  const byRule = new Map();

  for (const { url, result } of pages) {
    for (const violation of result.violations) {
      if (!byRule.has(violation.id)) {
        byRule.set(violation.id, {
          id: violation.id,
          help: violation.help,
          impact: violation.impact,
          helpUrl: violation.helpUrl,
          elements: 0,
          pages: new Set(),
          locations: [],
        });
      }
      const issue = byRule.get(violation.id);
      issue.elements += violation.nodes.length;
      issue.pages.add(url);
      for (const node of violation.nodes) {
        if (issue.locations.length >= MAX_LOCATIONS) break;
        issue.locations.push({
          url,
          selector: Array.isArray(node.target) ? node.target.join(' ') : '',
          html: node.html ?? '',
        });
      }
    }
  }

  return [...byRule.values()]
    .map((issue) => ({ ...issue, pages: [...issue.pages] }))
    .sort((a, b) => rank(a.impact) - rank(b.impact) || b.elements - a.elements);
}

function coverageWarnings({ pages, failed, redirectedTo }, requestedPages) {
  const warnings = [];
  if (redirectedTo) warnings.push(`The site redirected to ${redirectedTo}, so that host was checked.`);
  if (failed.length > 0) warnings.push(`${failed.length} page(s) could not be opened and were NOT checked.`);
  if (pages.length === 1 && requestedPages > 1) {
    warnings.push('Only 1 page was reached, so a short list here does not describe the whole site.');
  }
  return warnings;
}

export function formatText(crawlResult, issues, requestedPages) {
  const lines = [''];
  const { pages } = crawlResult;
  const elements = issues.reduce((sum, issue) => sum + issue.elements, 0);

  lines.push(`Checked ${pages.length} page(s). Found ${elements} element(s) across ${issues.length} issue type(s).`);
  for (const warning of coverageWarnings(crawlResult, requestedPages)) lines.push(`Warning: ${warning}`);
  lines.push('');

  for (const issue of issues) {
    lines.push(`${(issue.impact ?? 'unknown').toUpperCase().padEnd(9)}${issue.help}`);
    lines.push(`         ${issue.id} · ${issue.elements} element(s) on ${issue.pages.length} page(s)`);
  }

  if (issues.length === 0) lines.push('The automated rules found nothing on the pages checked.');
  lines.push('', LIMITS_NOTE, '');
  if (issues.length > 0) lines.push('Next: run again with --prompt and paste the output into your AI coding tool.');
  lines.push(MONITOR_NOTE, '');
  return lines.join('\n');
}

export function formatJson(crawlResult, issues, requestedPages) {
  return JSON.stringify({
    pagesChecked: crawlResult.pages.map((page) => page.url),
    pagesFailed: crawlResult.failed,
    redirectedTo: crawlResult.redirectedTo,
    warnings: coverageWarnings(crawlResult, requestedPages),
    issues,
    note: LIMITS_NOTE,
  }, null, 2);
}
