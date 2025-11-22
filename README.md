# wikiExplorer 

A desktop-first web application for exploring Wikipedia as a radial tree / interactive knowledge graph.

<p align="center">
  <img src="src/assets/wikiExplorer-logo-300.png" alt="wikiExplorer Logo" width="300">
</p>

## Overview

Search for any Wikipedia article and visualize its connections as an interactive knowledge graph. Click on nodes to explore related concepts and discover how topics connect through semantic relationships.

**🔗 Backend Server:** This frontend requires the [wikiVector backend](https://github.com/jblarson/wikiVector) running locally.

## Features

- **Semantic Search** - Powered by vector embeddings covering 6.2M+ Wikipedia articles
- **Interactive Graph** - Smooth physics-based layout with intelligent node positioning
- **Smart Filtering** - Shows only the most relevant connections to prevent information overload
- **Rich Previews** - Article thumbnails, summaries, and direct links to Wikipedia
- **Keyboard Shortcuts** - Press `/` to focus the search bar instantly
- **Real-time Stats** - Track your exploration with live node and edge counts

## Tech Stack

- **React 18** + TypeScript
- **Cytoscape.js** for graph visualization
- **Zustand** for state management
- **TanStack Query** for API caching
- **Tailwind CSS** for styling
- **Vite** for development
- **Wikipedia REST API** for article content

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running at `http://localhost:5001` (see [wikiExplorer](https://github.com/jblarson/wikiExplorer))

### Installation
```bash
# Clone the repository
git clone https://github.com/jblarson/wikiExplorer-frontend.git
cd wikiExplorer-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## How It Works

1. **Search** - Enter any Wikipedia topic
2. **Semantic Analysis** - Backend finds related articles using vector embeddings
3. **Graph Rendering** - Cytoscape visualizes connections with physics-based layout
4. **Exploration** - Click nodes to expand, hover to highlight connections

## Inspiration

Inspired by [WikiNodes](https://en.wikipedia.org/wiki/WikiNodes), a Wikipedia graph visualization app that was available on iPad in the early 2010s. That app offered a beautiful way to explore knowledge visually, but has since disappeared from the app store.

This is a modern, open-source, desktop-first recreation of that concept with semantic search capabilities.

Special thanks to the original WikiNodes developers for pioneering this approach to knowledge exploration.

## License

MIT
