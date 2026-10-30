# scandiary

Check the accessibility of a site you built with Claude Code, Cursor, Lovable or by hand, then paste the result into your AI tool as a fix prompt.

```bash
npx scandiary https://your-site.com
npx scandiary localhost:3000
```

No signup and no API key. It uses the Chrome, Edge or Brave already on your machine.

## Get a fix prompt

```bash
npx scandiary https://your-site.com --prompt > fix-a11y.md
```

Paste that file into your coding tool. Each issue comes with real examples from your pages and a note on how to fix it properly. The prompt also tells your tool what not to do: no overlay scripts, no hiding elements just to pass, and no saying the work is done until a new scan confirms it.

## Options

| Option | What it does |
|---|---|
| `--pages <n>` | Pages to check. Default 5, max 100 |
| `--prompt` | Print only the fix prompt |
| `--json` | Print the full result as JSON |
| `--strict` | Exit with code 1 when issues are found, for CI |

Exit codes: `0` finished, `1` issues found with `--strict`, `2` the check could not run.

## What this can and cannot tell you

Automated checks find roughly a third of accessibility problems, this one included. The rest needs a person using a keyboard and a screen reader.

A short list, or an empty one, does not mean your site is accessible. It does not say whether you meet any legal standard.

Rules come from [axe-core](https://github.com/dequelabs/axe-core): WCAG 2.0 and 2.1, levels A and AA.

Page content in the prompt is treated as untrusted data. It is flattened, shortened and marked so your AI tool should not follow anything written inside it. Review what your tool changes, as you would with any generated code.

## Privacy

The check runs on your machine. This tool sends no telemetry and has no analytics. Your browser opens the pages you asked it to check, along with whatever those pages load, as in a normal visit.

## Weekly checks

A one-off scan tells you where you stand today. [Scandiary](https://scandiary.com) runs the check every week and emails what changed, so you keep a dated history. The free plan covers 25 pages.

## License

MIT
