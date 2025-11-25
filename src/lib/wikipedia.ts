import type { WikiArticle, WikiLink, GraphEdge } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const BACKEND_API_BASE = `${API_BASE_URL}/api`;
const WIKI_API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';


export class WikiAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'WikiAPIError';
  }
}

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

interface BackendResponse {
  results: Array<{ title: string; score: number }>;
  cross_edges: Array<{ source: string; target: string; score: number }>; 
}


export async function fetchArticleLinks(
  title: string,
  existingNodeLabels: string[],
  existingNodeIds: string[],
  k: number = 42
): Promise<{ links: WikiLink[]; crossEdges: GraphEdge[] }> {
  
  // Normalize to underscored format for backend
  const query = encodeURIComponent(title.replace(/ /g, '_'));
  
  // IMPORTANT: Send underscored IDs to backend
  const contextParam = existingNodeIds.length > 0 
    ? existingNodeIds.map(id => id.replace(/ /g, '_')).join(',') 
    : '';
  
  try {
    const response = await fetch(
      `${BACKEND_API_BASE}/related/${query}?k=${k}&context=${contextParam}`
    );

    if (!response.ok) {
      console.error('Backend API error:', response.status);
      return { links: [], crossEdges: [] };
    }

    const data: BackendResponse = await response.json();

    // Process new links - normalize titles for comparison
    const normalizedExistingLabels = existingNodeLabels.map(l => l.toLowerCase().replace(/ /g, '_'));
    
    const links: WikiLink[] = data.results
      .map((item) => ({
        title: item.title.replace(/_/g, ' '),  // Display format
        score: item.score,
      }))
      .filter((link) => {
        const normalized = link.title.toLowerCase().replace(/ /g, '_');
        return !normalizedExistingLabels.includes(normalized);
      });

    const crossEdges: GraphEdge[] = (data.cross_edges || []).map((edge) => ({
      id: `cross-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      score: edge.score
    }));

    return { links, crossEdges };

  } catch (error) {
    console.error('Error fetching related articles:', error);
    return { links: [], crossEdges: [] };
  }
}

  

export async function fetchArticleFullText(title: string): Promise<string> {
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
  
  try {
    // Use the Wikipedia API's text extracts module for longer content
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?` +
      `action=query&format=json&origin=*&` +
      `prop=extracts&exintro=false&explaintext=true&` +
      `titles=${encodedTitle}&redirects=1`
    );

    if (!response.ok) {
      throw new WikiAPIError(
        `Failed to fetch full text for "${title}"`,
        response.status
      );
    }

    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    
    if (pageId === '-1') {
      throw new WikiAPIError(`Article "${title}" not found`, 404);
    }

    return pages[pageId].extract || 'No content available.';
  } catch (error) {
    if (error instanceof WikiAPIError) throw error;
    
    throw new WikiAPIError(
      `Network error while fetching full text for "${title}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}















export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}