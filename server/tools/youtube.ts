/**
 * YouTube Video Resolver
 * Searches YouTube server-side and extracts the direct Video ID of the top search result
 * so playFirstVideo opens the actual video directly with autoplay=1.
 */

export async function fetchFirstYouTubeVideoId(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Regular expression to match videoId patterns in YouTube initial data JSON
    const match = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (err) {
    console.warn('[YouTubeResolver] Error fetching video ID:', err);
  }
  return null;
}
