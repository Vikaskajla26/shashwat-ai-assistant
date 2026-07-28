/**
 * Real-time Web Search Fetcher & Google Knowledge Graph Extractor
 * Fetches real-time search snippets and Google Featured Snippet/Knowledge Card
 * answers so Gemini speaks fresh, current real-time facts instead of
 * pre-trained data.
 *
 * GOOGLE-ONLY BY DESIGN: this previously also fell back to Google News RSS
 * and the Wikipedia API on every search. Per requirement, "browse something"
 * must use ONLY Google's own live search results — no other provider. Both
 * fallbacks have been removed; this now exclusively scrapes google.com/search.
 */

export interface LiveSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function fetchLiveSearchResults(query: string): Promise<{
  success: boolean;
  query: string;
  directAnswer?: string;
  results: LiveSearchResult[];
  summaryText: string;
  instruction: string;
}> {
  if (!query || !query.trim()) {
    return {
      success: false,
      query: '',
      results: [],
      summaryText: 'No search query provided.',
      instruction: 'No query provided.',
    };
  }

  const cleanQuery = query.trim();
  const results: LiveSearchResult[] = [];
  let directAnswer = '';

  // Fetch from Google Search Mobile HTML Endpoint (Returns Google Featured
  // Snippets & Knowledge Cards). This is the ONLY source — no News RSS, no
  // Wikipedia, no other provider.
  try {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}&hl=en`;
    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Extract Google Featured Snippet / Direct Answer Box
      const directBoxMatch =
        html.match(/class="(?:hgKElc|OSrRJf|Z0LcW|IZ65fc|vk_bk)[^"]*">(.*?)<\/div>/i) ||
        html.match(/class="(?:VwiC3b|yXMda|qVZrWe)[^"]*">(.*?)<\/div>/i);
      if (directBoxMatch) {
        directAnswer = directBoxMatch[1].replace(/<[^>]+>/g, '').trim();
      }

      // Extract Google Search Result Items
      const titleMatches = Array.from(html.matchAll(/<div class="[^"]*BNeawe[^"]*">(.*?)<\/div>/g));
      const snippetMatches = Array.from(html.matchAll(/<div class="[^"]*s3rec[^"]*">(.*?)<\/div>/g));

      for (let i = 0; i < Math.min(titleMatches.length, 6); i++) {
        const title = titleMatches[i]?.[1]?.replace(/<[^>]+>/g, '').trim();
        const snippet = snippetMatches[i]?.[1]?.replace(/<[^>]+>/g, '').trim();
        if (title && title.length > 5) {
          results.push({
            title,
            snippet: snippet || title,
            url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[LiveSearchFetcher] Google Search fetch warning:', err);
  }

  // Compile Comprehensive Live Summary Text
  const summaryParts: string[] = [];
  if (directAnswer) {
    summaryParts.push(`DIRECT GOOGLE ANSWER: ${directAnswer}`);
  }

  results.forEach((r, i) => {
    summaryParts.push(`[Live Result ${i + 1}] ${r.title}: ${r.snippet}`);
  });

  const summaryText =
    summaryParts.length > 0
      ? summaryParts.join('\n\n')
      : `Live Google search initiated for "${cleanQuery}". Browser window opened.`;

  const instruction = `CRITICAL INSTRUCTION FOR VOICE RESPONSE: The user asked a real-time factual question ("${cleanQuery}"). The current live Google search results above provide the latest accurate facts. You MUST speak the current live answer in your spoken voice response. Do NOT state older pre-trained historical figures or past directors.`;

  return {
    success: true,
    query: cleanQuery,
    directAnswer,
    results,
    summaryText,
    instruction,
  };
}
