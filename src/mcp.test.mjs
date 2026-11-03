import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleMessage, TOOL_NAME } from './mcp.mjs';

const fakeCheck = async (url, pages) => ({ text: `checked ${url.hostname} ${pages}` });
const call = (args, check = fakeCheck) =>
  handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: TOOL_NAME, arguments: args } }, { check });

test('initialize answers with the version the client asked for and a tools capability', async () => {
  const reply = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, {});
  assert.equal(reply.id, 1);
  assert.equal(reply.result.protocolVersion, '2025-06-18');
  assert.ok(reply.result.capabilities.tools);
  assert.equal(reply.result.serverInfo.name, 'scandiary');
});

test('notifications get no reply', async () => {
  assert.equal(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, {}), null);
});

test('tools/list describes one tool that needs a url', async () => {
  const reply = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, {});
  const [tool] = reply.result.tools;
  assert.equal(tool.name, TOOL_NAME);
  assert.deepEqual(tool.inputSchema.required, ['url']);
  assert.doesNotMatch(tool.description, /compliant|guaranteed/i);
});

test('tools/call runs the check and returns its text', async () => {
  const reply = await call({ url: 'localhost:3000', pages: 2 });
  assert.equal(reply.result.isError, undefined);
  assert.equal(reply.result.content[0].text, 'checked localhost 2');
});

test('tools/call defaults to 5 pages', async () => {
  const reply = await call({ url: 'example.com' });
  assert.match(reply.result.content[0].text, / 5$/);
});

test('bad input and failed checks come back as tool errors, not crashes', async () => {
  for (const args of [{}, { url: 'ftp://x.com' }, { url: 'a.com', pages: 500 }]) {
    const reply = await call(args);
    assert.equal(reply.result.isError, true, JSON.stringify(args));
  }
  const failing = await call({ url: 'a.com' }, async () => { throw new Error('No page could be opened'); });
  assert.equal(failing.result.isError, true);
  assert.match(failing.result.content[0].text, /No page could be opened/);
});

test('unknown methods and tools get JSON-RPC errors', async () => {
  const reply = await handleMessage({ jsonrpc: '2.0', id: 9, method: 'resources/list' }, {});
  assert.equal(reply.error.code, -32601);
  const tool = await handleMessage({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'nope' } }, {});
  assert.equal(tool.error.code, -32602);
});

test('ping answers with an empty result', async () => {
  assert.deepEqual((await handleMessage({ jsonrpc: '2.0', id: 4, method: 'ping' }, {})).result, {});
});
