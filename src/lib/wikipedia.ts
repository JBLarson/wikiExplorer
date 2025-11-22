import type { WikiArticle, WikiLink } from '../types';

const WIKI_API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const BACKEND_API_BASE = '/api';

export class WikiAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'WikiAPIError';
  }
}

/**
 * Fetches article content from Wikipedia API
 */
export async function fetchArticleSummary(title: string): Promise<WikiArticle> {
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
  
  try {
    const response = await fetch(`${WIKI_API_BASE}/${encodedTitle}`);

    if (!response.ok) {
      throw new WikiAPIError(
        `Failed to fetch article summary for "${title}"`,
        response.status
      );
    }

    const data = await response.json();

    return {
      title: data.title,
      extract: data.extract || 'No summary available.',
      thumbnail: data.thumbnail?.source,
      url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedTitle}`,
    };
  } catch (error) {
    if (error instanceof WikiAPIError) throw error;
    
    throw new WikiAPIError(
      `Network error while fetching article "${title}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetches semantically related articles from backend
 */
export async function fetchArticleLinks(
  title: string,
  existingNodeLabels: string[],
  k: number = 7
): Promise<WikiLink[]> {
  const query = encodeURIComponent(title.replace(/ /g, '_'));
  
  try {
    const response = await fetch(`${BACKEND_API_BASE}/related/${query}?k=${k}`);

    if (!response.ok) {
      console.error('Backend API error:', response.status);
      return [];
    }

    const data: WikiLink[] = await response.json();

    // Filter out nodes that already exist
    return data
      .map(item => ({
        title: item.title.replace(/_/g, ' '),
        score: item.score
      }))
      .filter(link => !existingNodeLabels.includes(link.title));
      
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

/**
 * Check backend health
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get backend stats
 */
export async function getBackendStats() {
  try {
    const response = await fetch(`${BACKEND_API_BASE}/health`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
