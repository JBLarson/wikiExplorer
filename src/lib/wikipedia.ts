import type { WikiArticle, WikiLink } from '../types';

// const WIKI_API_BASE = 'https://en.wikipedia.org/api/rest_v1';
// const LOCAL_API = 'http://localhost:5001/api'; // Your Python backend

// --- --------------------------------- ---
// ---            DEMO LOGIC             ---
// --- --------------------------------- ---
// --- This file is now in "demo mode"   ---
// --- It does not call any external APIs ---
// --- --------------------------------- ---


/**
 * [DEMO] Fetches a mock article summary
 */
export async function fetchArticleSummary(title: string): Promise<WikiArticle> {
  console.log(`[DEMO] Fetching summary for: ${title}`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 300));

  const demoArticle: WikiArticle = {
    title: title,
    extract: `This is a **demo extract** for "${title}". The real backend is busy processing terabytes of data. This dummy content allows you to test the frontend UI, click on nodes, and see the graph expand.`,
    // Use a placeholder image service
    thumbnail: `https://via.placeholder.com/300x200.png?text=${encodeURIComponent(title)}`,
    // Keep the real URL so the "Read Full Article" button still works
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };

  return demoArticle;
}

/**
 * [DEMO] Fetches a mock list of related articles
 */
export async function fetchArticleLinks(
  title: string,
  existingNodeLabels: string[]
): Promise<WikiLink[]> {
  console.log(`[DEMO] Fetching related links for: ${title}`);
  console.log(`[DEMO] Excluding nodes:`, existingNodeLabels);

  // Simulate network latency (longer for "heavier" query)
  await new Promise(resolve => setTimeout(resolve, 600));

  const allDemoLinks: WikiLink[] = [];
  const numLinks = 7; // Generate 7 demo links

  for (let i = 1; i <= numLinks; i++) {
    allDemoLinks.push({
      title: `Demo Link ${i} (from ${title})`,
      score: Math.floor(Math.random() * 40) + 60, // Random score 60-100
    });
  }

  // The original function filtered *after* the fetch. We do the same.
  const filteredLinks = allDemoLinks.filter(
    link => !existingNodeLabels.includes(link.title)
  );
  
  console.log(`[DEMO] Returning ${filteredLinks.length} new links.`);
  return filteredLinks;
}