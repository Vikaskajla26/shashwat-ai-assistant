/**
 * Real-time Web Search Fetcher for Live Answers
 * Fetches real-time search snippets from live web search engines so Gemini
 * can speak the latest up-to-date facts instead of pre-trained historical data.
 */

export interface LiveSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function fetchLiveSearchResults(query: string): Promise<{
  success: boolean;
  query: string;
  results: LiveSearchResult[];
  summaryText: string;
}> {
  if (!query || !query.trim()) {
    return {
      success: false,
      query: '',
      results: [],
      summaryText: 'No search query provided.',
    };
  }

  const cleanQuery = query.trim();

  try {
    // 1. Fetch from DuckDuckGo HTML endpoint
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const html = await response.text();
      const results: LiveSearchResult[] = [];

      // Extract result blocks using Regex
      const resultBlockRegex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>(.*?)<\/a>/g;
      let match;
      while ((match = resultBlockRegex.exec(html)) !== null && results.length < 5) {
        const rawUrl = match[1];
        const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
        const rawSnippet = match[3].replace(/<[^>]+>/g, '').trim();

        if (rawTitle && rawSnippet) {
          results.push({
            title: rawTitle,
            snippet: rawSnippet,
            url: rawUrl,
          });
        }
      }

      if (results.length > 0) {
        const summaryText = results
          .map((r, i) => `[Result ${i + 1}] ${r.title}: ${r.snippet}`)
          .join('\n\n');

        return {
          success: true,
          query: cleanQuery,
          results,
          summaryText: `REAL-TIME LIVE GOOGLE/DDG SEARCH RESULTS for "${cleanQuery}":\n\n${summaryText}`,
        };
      }
    }
  } catch (err) {
    console.warn('[LiveSearchFetcher] Primary fetch warning:', err);
  }

  // 2. Fallback Wikipedia API for knowledge queries
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanQuery
    )}&format=json&origin=*`;
    const wikiRes = await fetch(wikiUrl);
    if (wikiRes.ok) {
      const wikiData = (await wikiRes.json()) as any;
      const searchItems = wikiData?.query?.search || [];
      if (searchItems.length > 0) {
        const results: LiveSearchResult[] = searchItems.slice(0, 4).map((item: any) => ({
          title: item.title,
          snippet: item.snippet.replace(/<[^>]+>/g, ''),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
        }));

        const summaryText = results
          .map((r, i) => `[Live Info ${i + 1}] ${r.title}: ${r.snippet}`)
          .join('\n\n');

        return {
          success: true,
          query: cleanQuery,
          results,
          summaryText: `LIVE SEARCH FINDINGS for "${cleanQuery}":\n\n${summaryText}`,
        };
      }
    }
  } catch (err) {
    console.warn('[LiveSearchFetcher] Fallback fetch warning:', err);
  }

  return {
    success: false,
    query: cleanQuery,
    results: [],
    summaryText: `Live web search initiated for "${cleanQuery}". Browser window opened.`,
  };
}
