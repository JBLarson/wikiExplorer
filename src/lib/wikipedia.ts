import type { WikiArticle, WikiLink } from '../types';

// Public Wikipedia API for content (images, extracts)
const WIKI_API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';

/**
 * Fetches article content (image, extract) from Public Wikipedia API
 */
export async function fetchArticleSummary(title: string): Promise<WikiArticle> {
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
  const response = await fetch(`${WIKI_API_BASE}/${encodedTitle}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch article summary for ${title}`);
  }

  const data = await response.json();

  return {
    title: data.title,
    extract: data.extract,
    thumbnail: data.thumbnail?.source,
    url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedTitle}`,
  };
}

/**
 * Fetches semantically related links from YOUR Local Python Backend
 */
export async function fetchArticleLinks(
  title: string,
  existingNodeLabels: string[]
): Promise<WikiLink[]> {
  // Call your local Flask server via the Vite proxy
  // Note: Your server expects underscores for titles
  const query = encodeURIComponent(title.replace(/ /g, '_'));
  
  // We request k=20 to have a buffer for filtering duplicates
  const response = await fetch(`/api/related/${query}?k=20`);

  if (!response.ok) {
    console.error('Local embedding server error');
    return [];
  }

  const data = await response.json();

  // Map backend response to frontend type
  // The backend returns { title: string, score: number }
  const newLinks: WikiLink[] = data.map((item: any) => ({
    title: item.title.replace(/_/g, ' '), // Convert DB underscores back to spaces for UI
    score: item.score
  }));

  // Filter out nodes that are already on the canvas
  return newLinks.filter(link => !existingNodeLabels.includes(link.title));
}