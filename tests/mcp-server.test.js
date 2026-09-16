import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { APPLICATION_ROOT } from '../server/dynamic-root.js';

test('Model Context Protocol (MCP) Server Tests', async (t) => {
  const mcpServerPath = path.join(APPLICATION_ROOT, 'server', 'mcp-server.js');

  await t.test('Initializes handshake and lists tools & resources over JSON-RPC 2.0 stdio', async () => {
    const child = spawn(process.execPath, [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: APPLICATION_ROOT,
    });

    const receivedResponses = [];

    child.stdout.on('data', (d) => {
      const lines = d.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            receivedResponses.push(JSON.parse(trimmed));
          } catch (e) {}
        }
      }
    });

    const send = (msg) => {
      child.stdin.write(JSON.stringify(msg) + '\n');
    };

    // 1. Initialize
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' },
    });

    // 2. Tools list
    send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    // 3. System Status Tool Call
    send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'nexyris_system_status',
        arguments: {},
      },
    });

    // 4. Resources list
    send({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/list',
    });

    // Wait for responses
    for (let i = 0; i < 30; i++) {
      if (receivedResponses.length >= 4) break;
      await new Promise(r => setTimeout(r, 100));
    }

    child.stdin.end();
    await new Promise(r => child.on('exit', r));

    assert.ok(receivedResponses.length >= 4, `Expected at least 4 responses, received ${receivedResponses.length}`);

    // Verify initialize response
    const initRes = receivedResponses.find(r => r.id === 1);
    assert.ok(initRes, 'Initialize response found');
    assert.strictEqual(initRes.result.serverInfo.name, 'nexyris-local-mcp');
    assert.ok(initRes.result.capabilities.tools);

    // Verify tools/list response
    const toolsRes = receivedResponses.find(r => r.id === 2);
    assert.ok(toolsRes, 'Tools list response found');
    const toolNames = toolsRes.result.tools.map(t => t.name);
    assert.ok(toolNames.includes('nexyris_chat'));
    assert.ok(toolNames.includes('nexyris_list_models'));
    assert.ok(toolNames.includes('nexyris_system_status'));

    // Verify tools/call response
    const callRes = receivedResponses.find(r => r.id === 3);
    assert.ok(callRes, 'Tool call response found');
    assert.strictEqual(callRes.result.isError, false);
    const content = JSON.parse(callRes.result.content[0].text);
    assert.ok(content.storage.totalGB > 0);
    assert.ok(content.hardware.cpu);

    // Verify resources/list response
    const resourcesRes = receivedResponses.find(r => r.id === 4);
    assert.ok(resourcesRes, 'Resources list response found');
    const uris = resourcesRes.result.resources.map(r => r.uri);
    assert.ok(uris.includes('nexyris://models'));
    assert.ok(uris.includes('nexyris://storage'));
  });

  await t.test('Executes code and handles prompts and external servers via MCP RPC', async () => {
    const { processMcpRpcRequest } = await import('../server/mcp-server.js');
    const { saveMcpServer, listMcpServers, deleteMcpServer } = await import('../server/db.js');

    // 1. Prompts list
    const promptsRes = await processMcpRpcRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'prompts/list',
    });
    assert.ok(promptsRes.result.prompts.length >= 2);
    const promptNames = promptsRes.result.prompts.map(p => p.name);
    assert.ok(promptNames.includes('code_review'));
    assert.ok(promptNames.includes('explain_algorithm'));

    // 2. Prompts get
    const getPromptRes = await processMcpRpcRequest({
      jsonrpc: '2.0',
      id: 11,
      method: 'prompts/get',
      params: {
        name: 'code_review',
        arguments: { language: 'typescript', code: 'const x: number = 10;' }
      }
    });
    assert.ok(getPromptRes.result.messages[0].content.text.includes('const x: number = 10;'));

    // 3. Code Execution Tool Call
    const codeExecRes = await processMcpRpcRequest({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'nexyris_execute_code',
        arguments: {
          language: 'javascript',
          code: 'console.log("Hello MCP Sandbox");'
        }
      }
    });
    assert.strictEqual(codeExecRes.result.isError, false);
    assert.ok(codeExecRes.result.content[0].text.includes('Hello MCP Sandbox'));

    // 4. MCP Servers Database Persistence
    const testServer = {
      name: 'Custom Dev Server',
      transport: 'sse',
      url: 'http://127.0.0.1:9099/sse',
      command: '',
      args: [],
      env: {},
    };
    const saved = saveMcpServer(testServer);
    assert.ok(saved.id);
    assert.strictEqual(saved.name, 'Custom Dev Server');

    const allServers = listMcpServers();
    assert.ok(allServers.some(s => s.id === saved.id));

    deleteMcpServer(saved.id);
    const afterDelete = listMcpServers();
    assert.ok(!afterDelete.some(s => s.id === saved.id));
  });
});

