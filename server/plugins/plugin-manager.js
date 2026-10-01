import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { getDatabase } from '../db.js';

/**
 * Universal safe HTTP/HTTPS GET/POST fetcher with redirect support and timeout
 */
function requestUrl(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (Nexyris-Local-WorldConnect)',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.headers || {})
      };

      const reqOptions = {
        method: options.method || 'GET',
        headers,
        timeout: options.timeout || 12000,
      };

      const req = client.request(parsedUrl, reqOptions, (res) => {
        // Handle HTTP redirects (301, 302, 303, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, parsedUrl).toString();
          const redirectCount = (options._redirectCount || 0) + 1;
          if (redirectCount > 5) {
            return reject(new Error('Too many redirects'));
          }
          return resolve(requestUrl(redirectUrl, { ...options, _redirectCount: redirectCount }));
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
          // Safeguard against unbounded memory consumption (limit to 4MB)
          if (data.length > 4 * 1024 * 1024) {
            req.destroy();
            resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
          }
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request to ${targetUrl} timed out after ${reqOptions.timeout}ms`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Strips HTML tags and script/style content to extract clean text & markdown
 */
function cleanHtmlToMarkdown(html, maxChars = 8000) {
  if (!html) return '';

  // Extract page title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

  // Remove scripts, styles, iframes, and svg
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');

  // Convert paragraphs and linebreaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  // Convert hyperlinks [text](href)
  text = text.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, anchorText) => {
    const cleanAnchor = anchorText.replace(/<[^>]+>/g, '').trim();
    if (!cleanAnchor || href.startsWith('#') || href.startsWith('javascript:')) return cleanAnchor;
    return `[${cleanAnchor}](${href})`;
  });

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode standard HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Collapse multiple whitespaces and excessive newlines
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
  text = text.trim();

  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + '\n\n...[Content truncated for length]...';
  }

  return { title, markdown: text };
}

/**
 * Built-in World Connect Plugins
 */
export const BUILTIN_PLUGINS = [
  {
    id: 'world_search',
    name: 'Live World Web Search',
    description: 'Connects AI to the live internet using DuckDuckGo to search current events, websites, and technical documentation.',
    category: 'web',
    icon: 'search',
    enabled: true,
    tools: [
      {
        name: 'web_search',
        description: 'Searches the live web for keywords and returns organic search results with titles, descriptions, and source URLs.',
        parameters: {
          query: { type: 'string', description: 'The search query or keywords', required: true },
          limit: { type: 'number', description: 'Max number of results (default: 5)', required: false }
        },
        execute: async ({ query, limit = 5 }) => {
          if (!query) throw new Error('Search query is required');
          const cleanQuery = query.trim();

          try {
            // First attempt: DuckDuckGo Instant Answer API for crisp abstract/definition
            let instantResult = null;
            try {
              const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
              const res = await requestUrl(instantUrl, { timeout: 6000 });
              if (res.statusCode === 200) {
                const parsed = JSON.parse(res.body);
                if (parsed.AbstractText) {
                  instantResult = {
                    title: parsed.Heading || cleanQuery,
                    snippet: parsed.AbstractText,
                    url: parsed.AbstractURL || '',
                    source: parsed.AbstractSource || 'DuckDuckGo Instant',
                  };
                }
              }
            } catch (e) {}

            // Second attempt: DuckDuckGo HTML search for organic live results
            const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
            const htmlRes = await requestUrl(htmlUrl, {
              headers: {
                'Referer': 'https://html.duckduckgo.com/',
              },
              timeout: 8000
            });

            const results = [];
            if (instantResult) {
              results.push(instantResult);
            }

            if (htmlRes.statusCode === 200) {
              const body = htmlRes.body;
              const resultTitleRegex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
              const titleSnippetRegex = /<a class="result__snippet[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

              let match;
              const titles = [];
              while ((match = resultTitleRegex.exec(body)) !== null && titles.length < limit + 3) {
                let actualUrl = match[1];
                if (actualUrl.includes('uddg=')) {
                  try {
                    const u = new URL('https://duckduckgo.com' + actualUrl);
                    actualUrl = decodeURIComponent(u.searchParams.get('uddg') || actualUrl);
                  } catch (e) {}
                }
                const titleText = match[2].replace(/<[^>]+>/g, '').trim();
                titles.push({ title: titleText, url: actualUrl });
              }

              const snippets = [];
              while ((match = titleSnippetRegex.exec(body)) !== null && snippets.length < limit + 3) {
                snippets.push(match[2].replace(/<[^>]+>/g, '').trim());
              }

              for (let i = 0; i < titles.length && results.length < limit; i++) {
                if (!titles[i].url.startsWith('http')) continue;
                results.push({
                  title: titles[i].title,
                  snippet: snippets[i] || 'No snippet available',
                  url: titles[i].url,
                });
              }
            }

            if (results.length === 0) {
              return {
                query: cleanQuery,
                count: 0,
                results: [],
                message: `No live search results found for "${cleanQuery}". Please check your internet connection or try different keywords.`
              };
            }

            return {
              query: cleanQuery,
              count: results.length,
              results,
              formattedSummary: results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join('\n\n')
            };
          } catch (err) {
            return {
              query: cleanQuery,
              error: `Search error: ${err.message}`,
              offlineAdvice: 'Make sure your computer is connected to the internet to perform live world web searches.',
              results: []
            };
          }
        }
      }
    ]
  },
  {
    id: 'web_fetch',
    name: 'Live Webpage Reader & Content Extractor',
    description: 'Reads any live webpage, article, blog, or API documentation by URL and converts it to clean readable text for AI analysis.',
    category: 'web',
    icon: 'article',
    enabled: true,
    tools: [
      {
        name: 'fetch_webpage',
        description: 'Fetches the content of a public URL and converts the HTML into clean readable markdown text.',
        parameters: {
          url: { type: 'string', description: 'The absolute HTTP or HTTPS URL to fetch', required: true },
          maxChars: { type: 'number', description: 'Maximum characters to extract (default: 8000)', required: false }
        },
        execute: async ({ url, maxChars = 8000 }) => {
          if (!url) throw new Error('URL is required');
          const cleanUrl = url.trim();
          if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            throw new Error('URL must begin with http:// or https://');
          }

          try {
            const res = await requestUrl(cleanUrl, { timeout: 10000 });
            if (res.statusCode >= 400) {
              return {
                url: cleanUrl,
                status: res.statusCode,
                error: `HTTP Error ${res.statusCode}`
              };
            }

            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              try {
                const jsonObj = JSON.parse(res.body);
                return {
                  url: cleanUrl,
                  status: res.statusCode,
                  contentType: 'json',
                  data: jsonObj,
                  content: JSON.stringify(jsonObj, null, 2).slice(0, maxChars)
                };
              } catch (e) {}
            }

            const extracted = cleanHtmlToMarkdown(res.body, maxChars);
            return {
              url: cleanUrl,
              status: res.statusCode,
              title: extracted.title,
              length: extracted.markdown.length,
              content: extracted.markdown
            };
          } catch (err) {
            return {
              url: cleanUrl,
              error: `Failed to fetch URL: ${err.message}`
            };
          }
        }
      }
    ]
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia Knowledge Lookup',
    description: 'Queries Wikipedia encyclopedia articles, definitions, scientific concepts, historical events, and biographical summaries in real-time.',
    category: 'knowledge',
    icon: 'menu_book',
    enabled: true,
    tools: [
      {
        name: 'wikipedia_lookup',
        description: 'Looks up a concept, person, location, or topic on Wikipedia and returns the summary and extract.',
        parameters: {
          topic: { type: 'string', description: 'The topic or title to look up', required: true },
          lang: { type: 'string', description: 'Language code (default: en)', required: false }
        },
        execute: async ({ topic, lang = 'en' }) => {
          if (!topic) throw new Error('Topic is required');
          const cleanTopic = topic.trim();
          const cleanLang = (lang || 'en').toLowerCase();

          try {
            const summaryUrl = `https://${cleanLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTopic)}`;
            const res = await requestUrl(summaryUrl, { timeout: 7000 });

            if (res.statusCode === 200) {
              const data = JSON.parse(res.body);
              return {
                title: data.title,
                description: data.description || '',
                extract: data.extract,
                pageUrl: data.content_urls?.desktop?.page || `https://${cleanLang}.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
                thumbnail: data.thumbnail?.source || null,
                source: 'Wikipedia REST API'
              };
            }

            const searchUrl = `https://${cleanLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTopic)}&format=json&utf8=1`;
            const searchRes = await requestUrl(searchUrl, { timeout: 7000 });
            if (searchRes.statusCode === 200) {
              const searchData = JSON.parse(searchRes.body);
              const items = searchData.query?.search || [];
              if (items.length > 0) {
                const first = items[0];
                return {
                  title: first.title,
                  extract: first.snippet.replace(/<[^>]+>/g, ''),
                  pageUrl: `https://${cleanLang}.wikipedia.org/wiki/${encodeURIComponent(first.title)}`,
                  related: items.slice(1, 4).map(i => ({ title: i.title, snippet: i.snippet.replace(/<[^>]+>/g, '') })),
                  source: 'Wikipedia Search API'
                };
              }
            }

            return {
              topic: cleanTopic,
              error: `No Wikipedia article found for "${cleanTopic}".`
            };
          } catch (err) {
            return {
              topic: cleanTopic,
              error: `Wikipedia lookup failed: ${err.message}`
            };
          }
        }
      }
    ]
  },
  {
    id: 'world_weather',
    name: 'Live World Weather & Timezones',
    description: 'Provides real-time weather conditions, forecasts, temperatures, and local sunrise/sunset times for any city worldwide.',
    category: 'world',
    icon: 'wb_sunny',
    enabled: true,
    tools: [
      {
        name: 'get_weather',
        description: 'Gets current weather conditions and 3-day forecast for a city or coordinates.',
        parameters: {
          location: { type: 'string', description: 'City name or country (e.g. "Tokyo", "London", "New York")', required: true }
        },
        execute: async ({ location }) => {
          if (!location) throw new Error('Location is required');
          const cleanLoc = location.trim();

          try {
            const weatherUrl = `https://wttr.in/${encodeURIComponent(cleanLoc)}?format=j1`;
            const res = await requestUrl(weatherUrl, { timeout: 8000 });

            if (res.statusCode === 200) {
              const data = JSON.parse(res.body);
              const current = data.current_condition?.[0] || {};
              const nearest = data.nearest_area?.[0] || {};
              const forecastDays = (data.weather || []).slice(0, 3).map(w => ({
                date: w.date,
                maxTempC: w.maxtempC,
                minTempC: w.mintempC,
                maxTempF: w.maxtempF,
                minTempF: w.mintempF,
                condition: w.hourly?.[4]?.weatherDesc?.[0]?.value || 'Clear',
                sunrise: w.astronomy?.[0]?.sunrise || '',
                sunset: w.astronomy?.[0]?.sunset || '',
              }));

              const areaName = nearest.areaName?.[0]?.value || cleanLoc;
              const country = nearest.country?.[0]?.value || '';

              return {
                location: `${areaName}, ${country}`.trim().replace(/^,\s*|,\s*$/g, ''),
                tempC: current.temp_C,
                tempF: current.temp_F,
                feelsLikeC: current.FeelsLikeC,
                feelsLikeF: current.FeelsLikeF,
                condition: current.weatherDesc?.[0]?.value || 'Clear',
                humidity: `${current.humidity}%`,
                windSpeedKmph: current.windspeedKmph,
                uvIndex: current.uvIndex,
                forecast: forecastDays,
                formatted: `📍 Weather for ${areaName}, ${country}:\n• Condition: ${current.weatherDesc?.[0]?.value || 'Clear'}\n• Temperature: ${current.temp_C}°C (${current.temp_F}°F), feels like ${current.FeelsLikeC}°C\n• Humidity: ${current.humidity}%, Wind: ${current.windspeedKmph} km/h\n• 3-Day Outlook: ${forecastDays.map(f => `${f.date}: ${f.condition} (${f.minTempC}°C - ${f.maxTempC}°C)`).join('; ')}`
              };
            }

            return {
              location: cleanLoc,
              error: `Could not retrieve weather for "${cleanLoc}".`
            };
          } catch (err) {
            return {
              location: cleanLoc,
              error: `Weather service error: ${err.message}`
            };
          }
        }
      }
    ]
  },
  {
    id: 'github_explorer',
    name: 'GitHub Code & Repository Explorer',
    description: 'Inspects public GitHub repositories, commits, releases, issues, and directly loads raw code files into the Nexyris workspace.',
    category: 'developer',
    icon: 'code',
    enabled: true,
    tools: [
      {
        name: 'inspect_github_repo',
        description: 'Gets information, description, stars, license, and file structure of a public GitHub repository.',
        parameters: {
          repo: { type: 'string', description: 'Repository in format "owner/repo" (e.g. "facebook/react")', required: true }
        },
        execute: async ({ repo }) => {
          if (!repo) throw new Error('Repository is required');
          const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

          try {
            const apiUrl = `https://api.github.com/repos/${cleanRepo}`;
            const res = await requestUrl(apiUrl, {
              headers: { 'Accept': 'application/vnd.github.v3+json' },
              timeout: 8000
            });

            if (res.statusCode === 200) {
              const data = JSON.parse(res.body);
              return {
                fullName: data.full_name,
                description: data.description,
                stars: data.stargazers_count,
                forks: data.forks_count,
                openIssues: data.open_issues_count,
                language: data.language,
                defaultBranch: data.default_branch,
                homepage: data.homepage,
                license: data.license?.name || 'None',
                htmlUrl: data.html_url,
                updatedAt: data.updated_at
              };
            }

            return {
              repo: cleanRepo,
              error: `GitHub repository "${cleanRepo}" not found (HTTP ${res.statusCode}).`
            };
          } catch (err) {
            return {
              repo: cleanRepo,
              error: `GitHub API error: ${err.message}`
            };
          }
        }
      },
      {
        name: 'fetch_github_file',
        description: 'Fetches raw source code of a file from any public GitHub repository.',
        parameters: {
          repo: { type: 'string', description: 'Repository "owner/repo"', required: true },
          path: { type: 'string', description: 'File path inside repository (e.g. "src/index.ts")', required: true },
          branch: { type: 'string', description: 'Branch name (default: "main")', required: false }
        },
        execute: async ({ repo, path: filePath, branch = 'main' }) => {
          if (!repo || !filePath) throw new Error('repo and path are required');
          const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
          const cleanPath = filePath.trim().replace(/^\//, '');

          try {
            const branchesToTry = [branch || 'main', 'master', 'main'];
            let content = null;
            let finalBranch = branch;

            for (const b of branchesToTry) {
              const rawUrl = `https://raw.githubusercontent.com/${cleanRepo}/${b}/${cleanPath}`;
              const res = await requestUrl(rawUrl, { timeout: 8000 });
              if (res.statusCode === 200) {
                content = res.body;
                finalBranch = b;
                break;
              }
            }

            if (content !== null) {
              return {
                repo: cleanRepo,
                path: cleanPath,
                branch: finalBranch,
                length: content.length,
                content
              };
            }

            return {
              repo: cleanRepo,
              path: cleanPath,
              error: `File "${cleanPath}" not found in ${cleanRepo}.`
            };
          } catch (err) {
            return {
              repo: cleanRepo,
              path: cleanPath,
              error: `Failed to fetch GitHub file: ${err.message}`
            };
          }
        }
      }
    ]
  },
  {
    id: 'http_webhook',
    name: 'External HTTP & Webhook Connector',
    description: 'Connects AI directly to external REST endpoints, local webhooks, IoT devices, or third-party web services.',
    category: 'integration',
    icon: 'cable',
    enabled: true,
    tools: [
      {
        name: 'call_http_endpoint',
        description: 'Executes an HTTP request to an external API or webhook and returns the parsed response.',
        parameters: {
          url: { type: 'string', description: 'Destination URL', required: true },
          method: { type: 'string', description: 'HTTP method: GET, POST, PUT, DELETE, PATCH', required: false },
          headers: { type: 'object', description: 'Custom headers object', required: false },
          body: { type: 'any', description: 'Request payload (string or JSON)', required: false }
        },
        execute: async ({ url, method = 'GET', headers = {}, body = null }) => {
          if (!url) throw new Error('URL is required');
          try {
            const res = await requestUrl(url, {
              method: (method || 'GET').toUpperCase(),
              headers,
              body,
              timeout: 12000
            });

            let parsedBody = res.body;
            try {
              parsedBody = JSON.parse(res.body);
            } catch (e) {}

            return {
              url,
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedBody
            };
          } catch (err) {
            return {
              url,
              error: `HTTP request failed: ${err.message}`
            };
          }
        }
      }
    ]
  }
];

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.initPlugins();
  }

  initPlugins() {
    for (const p of BUILTIN_PLUGINS) {
      this.plugins.set(p.id, { ...p });
    }
  }

  buildCustomPluginTools(config = {}) {
    return [
      {
        name: 'execute_custom_api',
        description: `Executes HTTP ${(config.method || 'GET').toUpperCase()} request to ${config.endpoint || 'configured URL'}`,
        parameters: {
          params: { type: 'object', description: 'Query parameters or JSON body payload', required: false }
        },
        execute: async (callParams = {}) => {
          let targetUrl = config.endpoint;
          if (!targetUrl) throw new Error('Custom plugin has no endpoint URL configured');

          const method = (config.method || 'GET').toUpperCase();
          const headers = { ...(config.headers || {}), ...(callParams.headers || {}) };
          let body = callParams.body !== undefined ? callParams.body : (method !== 'GET' ? callParams : null);

          // If GET with query parameters, append to URL
          if (method === 'GET' && callParams && typeof callParams === 'object') {
            try {
              const urlObj = new URL(targetUrl);
              for (const [k, v] of Object.entries(callParams)) {
                if (k !== 'headers' && k !== 'body' && v !== undefined && v !== null) {
                  urlObj.searchParams.set(k, String(v));
                }
              }
              targetUrl = urlObj.toString();
            } catch (e) {}
          }

          const res = await requestUrl(targetUrl, {
            method,
            headers,
            body,
            timeout: 15000
          });

          let parsedData = res.body;
          try {
            parsedData = JSON.parse(res.body);
          } catch (e) {}

          return {
            statusCode: res.statusCode,
            url: targetUrl,
            headers: res.headers,
            data: parsedData,
            summary: typeof parsedData === 'object' ? JSON.stringify(parsedData, null, 2).slice(0, 3000) : String(parsedData).slice(0, 3000)
          };
        }
      }
    ];
  }

  syncWithDatabase() {
    try {
      const db = getDatabase();
      const rows = db.prepare('SELECT * FROM plugins').all();
      for (const row of rows) {
        if (this.plugins.has(row.id)) {
          const plugin = this.plugins.get(row.id);
          plugin.enabled = Boolean(row.enabled);
          if (row.config_json) {
            try {
              plugin.config = JSON.parse(row.config_json);
              if (plugin.isCustom) {
                plugin.tools = this.buildCustomPluginTools(plugin.config);
              }
            } catch (e) {}
          }
        } else {
          try {
            const config = row.config_json ? JSON.parse(row.config_json) : {};
            this.plugins.set(row.id, {
              id: row.id,
              name: row.name,
              description: row.description,
              category: row.type || 'custom',
              enabled: Boolean(row.enabled),
              config,
              isCustom: true,
              icon: config.icon || 'cable',
              tools: this.buildCustomPluginTools(config)
            });
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  getAllPlugins() {
    this.syncWithDatabase();
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category || 'general',
      icon: p.icon || (p.isCustom ? 'cable' : 'extension'),
      enabled: p.enabled !== false,
      isCustom: Boolean(p.isCustom),
      config: p.config || {},
      tools: (p.tools || []).map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }))
    }));
  }

  createCustomPlugin({ id, name, description, category, icon, endpoint, method, headers, defaultParams }) {
    if (!name || !endpoint) throw new Error('Plugin name and endpoint URL are required');
    const pluginId = id || 'custom_' + Date.now().toString(36);
    const now = new Date().toISOString();

    let parsedHeaders = headers || {};
    if (typeof headers === 'string') {
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (e) {
        parsedHeaders = {};
      }
    }

    const config = {
      endpoint: endpoint.trim(),
      method: (method || 'GET').toUpperCase(),
      headers: parsedHeaders,
      icon: icon || 'cable',
      defaultParams: defaultParams || {}
    };

    const newPlugin = {
      id: pluginId,
      name: name.trim(),
      description: (description || `Custom Webhook API for ${endpoint}`).trim(),
      category: category || 'custom',
      icon: icon || 'cable',
      enabled: true,
      isCustom: true,
      config,
      tools: this.buildCustomPluginTools(config)
    };

    this.plugins.set(pluginId, newPlugin);

    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO plugins (id, name, description, type, enabled, config_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `).run(pluginId, newPlugin.name, newPlugin.description, newPlugin.category, JSON.stringify(config), now, now);
    } catch (e) {
      console.error('Failed to save custom plugin to database:', e);
    }

    return newPlugin;
  }

  deleteCustomPlugin(id) {
    this.syncWithDatabase();
    if (!this.plugins.has(id)) throw new Error(`Plugin "${id}" not found`);
    const plugin = this.plugins.get(id);
    if (!plugin.isCustom) throw new Error('Cannot delete built-in plugins');

    this.plugins.delete(id);

    try {
      const db = getDatabase();
      db.prepare('DELETE FROM plugins WHERE id = ?').run(id);
    } catch (e) {
      console.error('Failed to delete custom plugin from database:', e);
    }

    return { success: true, id };
  }

  togglePlugin(id, enabled) {
    this.syncWithDatabase();
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Plugin "${id}" not found`);
    plugin.enabled = Boolean(enabled);

    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      const existing = db.prepare('SELECT id FROM plugins WHERE id = ?').get(id);
      if (existing) {
        db.prepare('UPDATE plugins SET enabled = ?, updated_at = ? WHERE id = ?')
          .run(plugin.enabled ? 1 : 0, now, id);
      } else {
        db.prepare('INSERT INTO plugins (id, name, description, type, enabled, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, plugin.name, plugin.description, plugin.category || 'world', plugin.enabled ? 1 : 0, '{}', now, now);
      }
    } catch (e) {}

    return { id, enabled: plugin.enabled };
  }

  async executeTool(pluginId, toolName, params = {}) {
    this.syncWithDatabase();
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);
    if (plugin.enabled === false) throw new Error(`Plugin "${plugin.name}" is currently disabled`);

    // Smart tool resolution with fallback and aliases
    const normalizedName = (toolName || '').toLowerCase().trim();
    let tool = (plugin.tools || []).find(t => t.name.toLowerCase() === normalizedName);

    if (!tool && plugin.tools && plugin.tools.length > 0) {
      if (pluginId === 'world_search') {
        tool = plugin.tools.find(t => ['web_search', 'search_web', 'search', 'duckduckgo'].includes(t.name.toLowerCase()));
      } else if (pluginId === 'web_fetch') {
        tool = plugin.tools.find(t => ['fetch_webpage', 'web_fetch', 'fetch', 'read_url'].includes(t.name.toLowerCase()));
      } else if (pluginId === 'wikipedia') {
        tool = plugin.tools.find(t => ['wikipedia_lookup', 'wiki_lookup', 'wikipedia', 'wiki', 'lookup'].includes(t.name.toLowerCase()));
      } else if (pluginId === 'world_weather') {
        tool = plugin.tools.find(t => ['get_weather', 'weather', 'world_weather', 'forecast'].includes(t.name.toLowerCase()));
      } else if (pluginId === 'github_explorer') {
        tool = plugin.tools.find(t => t.name.includes(normalizedName)) || plugin.tools[0];
      } else {
        tool = plugin.tools[0];
      }
    }

    // If still no tool found, fallback to first tool
    if (!tool && plugin.tools && plugin.tools.length > 0) {
      tool = plugin.tools[0];
    }

    if (!tool) throw new Error(`No executable tool found in plugin "${pluginId}"`);

    const startTime = Date.now();
    try {
      const result = await tool.execute(params);
      const elapsedMs = Date.now() - startTime;
      return {
        success: true,
        pluginId,
        toolName: tool.name,
        elapsedMs,
        result
      };
    } catch (err) {
      return {
        success: false,
        pluginId,
        toolName: tool.name,
        elapsedMs: Date.now() - startTime,
        error: err.message
      };
    }
  }

  async processWorldQuery(prompt) {
    if (!prompt || typeof prompt !== 'string') return null;
    const trimmed = prompt.trim();
    this.syncWithDatabase();

    try {
      // 1. Weather Queries: slash commands or natural language ("weather in London", "what's the weather in Tokyo?")
      const weatherPlugin = this.plugins.get('world_weather');
      if (weatherPlugin && weatherPlugin.enabled !== false) {
        let weatherLoc = null;
        if (/^[\/!]weather\s+/i.test(trimmed)) {
          weatherLoc = trimmed.replace(/^[\/!]weather\s+/i, '').trim();
        } else if (/^weather:\s*/i.test(trimmed)) {
          weatherLoc = trimmed.replace(/^weather:\s*/i, '').trim();
        } else if (/^(?:what(?:'s|\s+is)\s+the\s+weather\s+(?:like\s+)?(?:in|for|at)?\s*)(.+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:what(?:'s|\s+is)\s+the\s+weather\s+(?:like\s+)?(?:in|for|at)?\s*)(.+)$/i);
          weatherLoc = m ? m[1].trim() : null;
        } else if (/^(?:how\s+is\s+the\s+weather\s+(?:in|for|at)?\s*)(.+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:how\s+is\s+the\s+weather\s+(?:in|for|at)?\s*)(.+)$/i);
          weatherLoc = m ? m[1].trim() : null;
        } else if (/^(?:forecast\s+(?:for|in)\s*)(.+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:forecast\s+(?:for|in)\s*)(.+)$/i);
          weatherLoc = m ? m[1].trim() : null;
        } else if (/^(?:current\s+)?weather\s+(?:in|for|at)\s+([a-zA-Z\s,.-]+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:current\s+)?weather\s+(?:in|for|at)\s+([a-zA-Z\s,.-]+)$/i);
          weatherLoc = m ? m[1].trim() : null;
        }

        if (weatherLoc) {
          const cleanLoc = weatherLoc.replace(/[\?\.!]+$/, '').trim();
          if (cleanLoc) {
            const toolRes = await this.executeTool('world_weather', 'get_weather', { location: cleanLoc });
            return {
              type: 'weather',
              location: cleanLoc,
              toolResult: toolRes,
              contextText: `\n[Live Weather Information for ${cleanLoc}]:\n${toolRes.result?.formatted || JSON.stringify(toolRes.result)}`
            };
          }
        }
      }

      // 2. Fetch URL command: /fetch, !fetch, fetch:, or a lone HTTP/HTTPS URL
      const fetchPlugin = this.plugins.get('web_fetch');
      if (fetchPlugin && fetchPlugin.enabled !== false) {
        let fetchUrl = null;
        if (/^[\/!]fetch\s+/i.test(trimmed)) {
          fetchUrl = trimmed.replace(/^[\/!]fetch\s+/i, '').trim();
        } else if (/^fetch:\s*/i.test(trimmed)) {
          fetchUrl = trimmed.replace(/^fetch:\s*/i, '').trim();
        } else if (/^(?:read|fetch|scrape|open)\s+(?:webpage\s+|url\s+|link\s+)?(https?:\/\/[^\s]+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:read|fetch|scrape|open)\s+(?:webpage\s+|url\s+|link\s+)?(https?:\/\/[^\s]+)$/i);
          fetchUrl = m ? m[1].trim() : null;
        } else if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
          fetchUrl = trimmed;
        }

        if (fetchUrl) {
          const cleanUrl = fetchUrl.replace(/[\>\)\.\,\"]+$/, '');
          const toolRes = await this.executeTool('web_fetch', 'fetch_webpage', { url: cleanUrl, maxChars: 6000 });
          return {
            type: 'fetch',
            url: cleanUrl,
            toolResult: toolRes,
            contextText: `\n[Live Webpage Content from ${cleanUrl}]:\nTitle: ${toolRes.result?.title || 'Unknown'}\n${toolRes.result?.content || ''}`
          };
        }
      }

      // 3. Wikipedia command: /wiki, !wiki, wiki:, or "wikipedia <topic>"
      const wikiPlugin = this.plugins.get('wikipedia');
      if (wikiPlugin && wikiPlugin.enabled !== false) {
        let wikiTopic = null;
        if (/^[\/!]wiki(?:pedia)?\s+/i.test(trimmed)) {
          wikiTopic = trimmed.replace(/^[\/!]wiki(?:pedia)?\s+/i, '').trim();
        } else if (/^wiki(?:pedia)?:\s*/i.test(trimmed)) {
          wikiTopic = trimmed.replace(/^wiki(?:pedia)?:\s*/i, '').trim();
        } else if (/^(?:search\s+)?wikipedia\s+(?:for\s+|about\s+)(.+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:search\s+)?wikipedia\s+(?:for\s+|about\s+)(.+)$/i);
          wikiTopic = m ? m[1].trim() : null;
        } else if (/^(?:tell\s+me\s+about\s+)(.+)\s+(?:on|from)\s+wikipedia$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:tell\s+me\s+about\s+)(.+)\s+(?:on|from)\s+wikipedia$/i);
          wikiTopic = m ? m[1].trim() : null;
        }

        if (wikiTopic) {
          const cleanTopic = wikiTopic.replace(/[\?\.!]+$/, '').trim();
          if (cleanTopic) {
            const toolRes = await this.executeTool('wikipedia', 'wikipedia_lookup', { topic: cleanTopic });
            return {
              type: 'wikipedia',
              topic: cleanTopic,
              toolResult: toolRes,
              contextText: `\n[Wikipedia Knowledge for "${cleanTopic}"]:\nTitle: ${toolRes.result?.title || cleanTopic}\nExtract: ${toolRes.result?.extract || 'No extract found'}\nURL: ${toolRes.result?.pageUrl || ''}`
            };
          }
        }
      }

      // 4. GitHub command: /github, !github, github: or "inspect repo owner/repo"
      const ghPlugin = this.plugins.get('github_explorer');
      if (ghPlugin && ghPlugin.enabled !== false) {
        let ghRest = null;
        if (/^[\/!]github\s+/i.test(trimmed)) {
          ghRest = trimmed.replace(/^[\/!]github\s+/i, '').trim();
        } else if (/^github:\s*/i.test(trimmed)) {
          ghRest = trimmed.replace(/^github:\s*/i, '').trim();
        } else if (/^(?:inspect\s+)?(?:github\s+repo(?:sitory)?|repo)\s+([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)(?:\s+(.+))?$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:inspect\s+)?(?:github\s+repo(?:sitory)?|repo)\s+([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)(?:\s+(.+))?$/i);
          if (m) ghRest = `${m[1]} ${m[2] || ''}`.trim();
        } else if (/^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i.test(trimmed)) {
          const m = trimmed.match(/^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
          if (m) ghRest = `${m[1]}/${m[2]}`;
        }

        if (ghRest) {
          const parts = ghRest.split(/\s+/);
          const repo = parts[0].replace(/[\?\.!]+$/, '').replace(/^https?:\/\/github\.com\//, '');
          const filePath = parts[1];

          if (filePath) {
            const toolRes = await this.executeTool('github_explorer', 'fetch_github_file', { repo, path: filePath });
            return {
              type: 'github_file',
              repo,
              filePath,
              toolResult: toolRes,
              contextText: `\n[GitHub Source File: ${repo}/${filePath}]:\n\`\`\`\n${toolRes.result?.content || ''}\n\`\`\``
            };
          } else {
            const toolRes = await this.executeTool('github_explorer', 'inspect_github_repo', { repo });
            return {
              type: 'github_repo',
              repo,
              toolResult: toolRes,
              contextText: `\n[GitHub Repository Info: ${repo}]:\nStars: ${toolRes.result?.stars} | Language: ${toolRes.result?.language}\nDescription: ${toolRes.result?.description}\nURL: ${toolRes.result?.htmlUrl}`
            };
          }
        }
      }

      // 5. Search command: /search, !search, search:, or natural query "search the web for ...", "search duckduckgo for ..."
      const searchPlugin = this.plugins.get('world_search');
      if (searchPlugin && searchPlugin.enabled !== false) {
        let searchQuery = null;
        if (/^[\/!]search\s+/i.test(trimmed)) {
          searchQuery = trimmed.replace(/^[\/!]search\s+/i, '').trim();
        } else if (/^search:\s*/i.test(trimmed)) {
          searchQuery = trimmed.replace(/^search:\s*/i, '').trim();
        } else if (/^(?:search\s+(?:the\s+web|duckduckgo|google|online|the\s+internet)\s+(?:for\s+)?)(.+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:search\s+(?:the\s+web|duckduckgo|google|online|the\s+internet)\s+(?:for\s+)?)(.+)$/i);
          searchQuery = m ? m[1].trim() : null;
        } else if (/^(?:search\s+for\s+)(.+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:search\s+for\s+)(.+)$/i);
          searchQuery = m ? m[1].trim() : null;
        } else if (/^(?:look\s+up\s+)(.+)\s+(?:online|on\s+the\s+web)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:look\s+up\s+)(.+)\s+(?:online|on\s+the\s+web)$/i);
          searchQuery = m ? m[1].trim() : null;
        } else if (/^(?:find\s+(?:information|details|news)\s+(?:about|on)\s+)(.+)$/i.test(trimmed)) {
          const m = trimmed.match(/^(?:find\s+(?:information|details|news)\s+(?:about|on)\s+)(.+)$/i);
          searchQuery = m ? m[1].trim() : null;
        }

        if (searchQuery) {
          const cleanQ = searchQuery.replace(/[\?\.!]+$/, '').trim();
          if (cleanQ) {
            const toolRes = await this.executeTool('world_search', 'web_search', { query: cleanQ, limit: 5 });
            return {
              type: 'search',
              query: cleanQ,
              toolResult: toolRes,
              contextText: `\n[Live World Search Results for "${cleanQ}"]:\n${toolRes.result?.formattedSummary || JSON.stringify(toolRes.result)}`
            };
          }
        }
      }

      // 6. Check custom plugins by slash command (e.g. /my_api or /crypto)
      if (trimmed.startsWith('/')) {
        const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
        if (match) {
          const candidateCmd = match[1].toLowerCase();
          const argText = match[2] || '';

          for (const [pId, plugin] of this.plugins.entries()) {
            const matchId = pId.toLowerCase() === candidateCmd || pId.replace(/^custom_/, '').toLowerCase() === candidateCmd;
            const matchName = plugin.name.toLowerCase().replace(/\s+/g, '_') === candidateCmd;

            if ((matchId || matchName) && plugin.enabled) {
              let params = {};
              if (argText) {
                try {
                  params = JSON.parse(argText);
                } catch (e) {
                  params = { query: argText, input: argText };
                }
              }

              const toolRes = await this.executeTool(pId, plugin.tools[0]?.name, params);
              return {
                type: 'custom_plugin',
                pluginId: pId,
                pluginName: plugin.name,
                toolResult: toolRes,
                contextText: `\n[Custom Plugin "${plugin.name}" Execution Results]:\n${toolRes.result?.summary || JSON.stringify(toolRes.result)}`
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('processWorldQuery execution error:', err.message);
    }

    return null;
  }
}

export const pluginManager = new PluginManager();
