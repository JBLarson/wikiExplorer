import type { WikiArticle, WikiLink, GraphEdge } from '../types';

const WIKI_API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const BACKEND_API_BASE = '/api';

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
  cross_edges: Array<{ source: number; target: number; score: number }>;
}

export async function fetchArticleLinks(
  title: string,
  existingNodeLabels: string[],
  existingNodeIds: string[],
  k: number = 7
): Promise<{ links: WikiLink[]; crossEdges: GraphEdge[] }> {
  
  const query = encodeURIComponent(title.replace(/ /g, '_'));
  const contextParam = existingNodeIds.length > 0 ? existingNodeIds.join(',') : '';
  
  try {
    const response = await fetch(
      `${BACKEND_API_BASE}/related/${query}?k=${k}&context=${contextParam}`
    );

    if (!response.ok) {
      console.error('Backend API error:', response.status);
      return { links: [], crossEdges: [] };
    }

    const data: BackendResponse = await response.json();

    // Process new links (Parent -> Child)
    const links: WikiLink[] = data.results
      .map((item) => ({
        title: item.title.replace(/_/g, ' '),
        score: item.score,
      }))
      .filter((link) => !existingNodeLabels.includes(link.title));

    // Process cross-edges (Child <-> Existing Graph)
    // Note: Backend returns numeric IDs, but frontend uses string IDs (titles/underscored)
    // You might need to map these IDs if your frontend IDs aren't numeric. 
    // Assuming frontend uses string IDs like "Title_of_Page", we might need logic in App.tsx 
    // to match these numeric IDs back to those strings if the backend provides that mapping,
    // OR simply assume the backend edge response uses the same ID format as the nodes.
    // 
    // based on your API, it returns source/target as INTs. 
    // If your frontend uses strings as IDs, this part will need adjustment in App.tsx 
    // to find the node by its internal article_id, OR you update the backend to return titles.
    //
    // For now, we pass them through as-is, but you will likely need to map them in App.tsx
    const crossEdges: GraphEdge[] = data.cross_edges.map((edge) => ({
      id: `cross-${edge.source}-${edge.target}`,
      source: edge.source.toString(), 
      target: edge.target.toString(),
      score: edge.score
    }));

    return { links, crossEdges };

  } catch (error) {
    console.error('Error fetching related articles:', error);
    return { links: [], crossEdges: [] };
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