import test from 'node:test';
import assert from 'node:assert';
import { pluginManager, BUILTIN_PLUGINS } from '../server/plugins/plugin-manager.js';

test('World Connect Plugin Architecture Tests', async (t) => {
  await t.test('Loads all built-in world plugins', () => {
    const plugins = pluginManager.getAllPlugins();
    assert.ok(plugins.length >= 6);

    const ids = plugins.map(p => p.id);
    assert.ok(ids.includes('world_search'), 'Must include world_search');
    assert.ok(ids.includes('web_fetch'), 'Must include web_fetch');
    assert.ok(ids.includes('wikipedia'), 'Must include wikipedia');
    assert.ok(ids.includes('world_weather'), 'Must include world_weather');
    assert.ok(ids.includes('github_explorer'), 'Must include github_explorer');
    assert.ok(ids.includes('http_webhook'), 'Must include http_webhook');
  });

  await t.test('Toggles plugin enabled/disabled status', () => {
    const toggled = pluginManager.togglePlugin('http_webhook', false);
    assert.strictEqual(toggled.enabled, false);

    const plugins = pluginManager.getAllPlugins();
    const webhookPlugin = plugins.find(p => p.id === 'http_webhook');
    assert.strictEqual(webhookPlugin.enabled, false);

    // Re-enable
    pluginManager.togglePlugin('http_webhook', true);
  });

  await t.test('Parses slash commands for world queries', async () => {
    // Test slash query parser
    const searchRes = await pluginManager.processWorldQuery('/search nodejs latest');
    assert.ok(searchRes);
    assert.strictEqual(searchRes.type, 'search');
    assert.strictEqual(searchRes.query, 'nodejs latest');
    assert.ok(searchRes.contextText.length > 0);

    const weatherRes = await pluginManager.processWorldQuery('/weather London');
    assert.ok(weatherRes);
    assert.strictEqual(weatherRes.type, 'weather');
    assert.strictEqual(weatherRes.location, 'London');

    const wikiRes = await pluginManager.processWorldQuery('/wiki Quantum_computing');
    assert.ok(wikiRes);
    assert.strictEqual(wikiRes.type, 'wikipedia');
    assert.strictEqual(wikiRes.topic, 'Quantum_computing');

    // Test natural language query triggers
    const naturalWeather = await pluginManager.processWorldQuery("what's the weather in Tokyo?");
    assert.ok(naturalWeather);
    assert.strictEqual(naturalWeather.type, 'weather');
    assert.strictEqual(naturalWeather.location, 'Tokyo');

    const naturalSearch = await pluginManager.processWorldQuery('search for quantum computing');
    assert.ok(naturalSearch);
    assert.strictEqual(naturalSearch.type, 'search');
    assert.strictEqual(naturalSearch.query, 'quantum computing');
  });

  await t.test('Handles mock tool execution safely', async () => {
    const result = await pluginManager.executeTool('github_explorer', 'inspect_github_repo', { repo: 'facebook/react' });
    assert.ok(result);
    assert.strictEqual(result.pluginId, 'github_explorer');
    assert.strictEqual(result.toolName, 'inspect_github_repo');
  });
});
