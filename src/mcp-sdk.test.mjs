// The MCP server is hand-written (see mcp.mjs). This test talks to it with the OFFICIAL client,
// so a protocol mistake shows up here and not in a user's editor.
// It starts a real browser for one page of example.com, like the CI scan steps.

import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const BIN = fileURLToPath(new URL('../bin/scandiary.mjs', import.meta.url));

test('the official MCP client can list and call the tool', { timeout: 120000 }, async () => {
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [BIN, '--mcp'] }));
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name), ['check_accessibility']);

    const bad = await client.callTool({ name: 'check_accessibility', arguments: { url: 'ftp://example.com' } });
    assert.equal(bad.isError, true);
    assert.match(bad.content[0].text, /Only http/);

    const real = await client.callTool({ name: 'check_accessibility', arguments: { url: 'https://example.com', pages: 1 } });
    assert.notEqual(real.isError, true, real.content[0].text);
    assert.match(real.content[0].text, /roughly a third/);
  } finally {
    await client.close();
  }
});
