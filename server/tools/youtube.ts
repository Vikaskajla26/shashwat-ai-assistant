/**
 * Resolves the first real YouTube video for a search query, without opening
 * any browser window. Fetches YouTube's search results HTML (server-side,
 * plain HTTPS GET) and scrapes the first `videoId` out of the embedded
 * `ytInitialData` JSON. This lets `playFirstVideo` open the actual video
 * (`/watch?v=<id>`) in the user's real default browser instead of just
 * dropping them on a search-results page and calling that "playing".
 */

const YT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface YouTubeMatch {
  videoId: string;
  title?: string;
}

/**
 * Returns the first video result for `query`, or null if none could be
 * resolved (network failure, YouTube markup change, no results, etc.).
 * Callers should fall back to opening a plain search-results page on null.
 */
export async function resolveFirstYouTubeVideo(query: string): Promise<YouTubeMatch | null> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": YT_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Prefer a real videoRenderer match (an actual video result, not a
    // channel/playlist/shelf card), and try to grab its title alongside it.
    const rendererMatch = html.match(
      /"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]*)"/
    );
    if (rendererMatch) {
      return { videoId: rendererMatch[1], title: decodeJsonString(rendererMatch[2]) };
    }

    // Fallback: any videoId in the page (still correct almost always, just
    // without a confirmed title alongside it).
    const anyMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (anyMatch) return { videoId: anyMatch[1] };

    return null;
  } catch (err) {
    console.warn("[youtube] resolveFirstYouTubeVideo failed:", err);
    return null;
  }
}

/** Builds a direct, autoplaying watch URL for a resolved video ID. */
export function buildWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
}

function decodeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}
