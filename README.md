# wikiExplorer Frontend

A production-grade, FAANG-quality web application for exploring Wikipedia through semantic graph visualization.

<p align="center">
  <img src="src/assets/wikiExplorer-logo-300.png" alt="wikiExplorer Logo" width="300">
</p>

[![React](https://img.shields.io/badge/React-18.2-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

## 🎯 Overview

wikiExplorer transforms Wikipedia into an interactive knowledge graph, powered by vector embeddings and semantic search. Search any topic and watch as related concepts branch out in a beautiful, physics-based visualization.

**🔗 Backend Required:** [github.com/jblarson/wikiVector](https://github.com/jblarson/wikiVector)

## ✨ Features

### Core Functionality
- **🧠 Semantic Search** - Vector embeddings over 6.2M+ Wikipedia articles
- **🎨 Interactive Graph** - Physics-based COSE layout with smooth animations
- **🎯 Smart Filtering** - Hybrid ranking combining semantic similarity, backlinks, and title overlap
- **📊 Real-time Stats** - Track nodes, edges, and graph depth
- **⚡ Keyboard Shortcuts** - Press `/` to focus search instantly

### User Experience
- **🎭 Beautiful UI** - Purple-themed design with Inter font
- **🌈 Depth Visualization** - Color-coded nodes by exploration depth
- **🖼️ Rich Previews** - Article thumbnails and summaries
- **📱 Responsive** - Optimized for desktop-first workflow
- **♿ Accessible** - WCAG-compliant color contrast and keyboard navigation

### Performance
- **⚡ Lazy Loading** - Only loads child nodes on click
- **🔄 Smart Caching** - TanStack Query for optimal data fetching
- **🎬 Smooth Animations** - 60fps graph transitions
- **📦 Optimized Bundle** - Code splitting and tree shaking

## 🛠️ Tech Stack

### Frontend Framework
- **React 18** - Hooks-based architecture
- **TypeScript 5** - Full type safety
- **Vite** - Lightning-fast HMR

### Visualization
- **Cytoscape.js** - Professional graph rendering
- **COSE Algorithm** - Physics-based layout engine
- **Custom Styling** - Depth-based coloring system

### State Management
- **Zustand** - Lightweight global state
- **TanStack Query** - Server state synchronization
- **React Hooks** - Local component state

### Styling
- **Tailwind CSS** - Utility-first styling
- **Heroicons** - Beautiful SVG icons
- **Custom Animations** - Smooth transitions

### APIs
- **Wikipedia REST API** - Article content
- **Backend Vector Search** - Semantic similarity

## 🚀 Getting Started

### Prerequisites

```bash
Node.js 18+ required
Backend server running at http://localhost:5001
```

### Installation

```bash
# Clone repository
git clone https://github.com/jblarson/wikiExplorer-frontend.git
cd wikiExplorer-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## 🏗️ Architecture

### Project Structure

```
src/
├── components/
│   ├── GraphCanvas.tsx      # Cytoscape visualization
│   ├── SearchBar.tsx        # Search with autocomplete
│   └── Sidebar.tsx          # Article details panel
├── lib/
│   └── wikipedia.ts         # API integration layer
├── stores/
│   └── graphStore.ts        # Zustand state management
├── types/
│   └── index.ts             # TypeScript definitions
├── assets/
│   └── wikiExplorer-logo-300.png
└── App.tsx                  # Root component
```

### Data Flow

```
User Search → Backend API → Vector Search → Related Articles
                ↓
          Wikipedia API → Article Metadata
                ↓
          Zustand Store → Graph State
                ↓
          Cytoscape → Visual Rendering
```

### State Architecture

**Graph Store (`graphStore.ts`)**:
```typescript
{
  nodes: GraphNode[]        // All articles in graph
  edges: GraphEdge[]        // Connections between articles
  selectedNode: string      // Currently focused article
  rootNode: string          // Starting point of exploration
  history: string[]         // Navigation breadcrumbs
  isLoading: boolean        // Loading state
}
```

**Node Structure**:
```typescript
{
  id: string                // Unique identifier
  label: string             // Display name
  data: WikiArticle         // Full article metadata
  depth: number             // Distance from root (0, 1, 2...)
}
```

## 🎨 Design System

### Color Palette

```typescript
Primary Purple Gradient:
- depth 0 (root):  #9333ea (vibrant purple)
- depth 1:         #a855f7 (lighter purple)
- depth 2:         #c084fc (medium purple)
- depth 3:         #d8b4fe (light purple)
- depth 4+:        #e9d5ff (lightest purple)

UI Colors:
- Background:      #ffffff, #f9fafb, #f3f4f6
- Text:            #1f2937, #4b5563, #9ca3af
- Border:          #e5e7eb, #d1d5db
- Accent:          #3b82f6 (blue for selection)
```

### Typography

```css
Font Family: Inter (Google Fonts)
Weights: 400 (regular), 600 (semibold), 700 (bold)

Sizes:
- Headings: 2xl (24px), xl (20px), lg (18px)
- Body: sm (14px), base (16px)
- Labels: xs (12px)
```

## 🔧 Configuration

### Backend Proxy

Configure in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5001',
      changeOrigin: true,
    }
  }
}
```

### Graph Layout

Tune physics parameters in `GraphCanvas.tsx`:

```typescript
{
  idealEdgeLength: 150,      // Spacing between nodes
  nodeRepulsion: 100000,     // How much nodes push apart
  edgeElasticity: 120,       // Edge spring strength
  gravity: 1.5,              // Center pull force
  numIter: 1500,             // Simulation iterations
}
```

## 📊 Performance Optimization

### Bundle Size
- Code splitting via dynamic imports
- Tree shaking with ES modules
- Minification in production build

### Runtime Performance
- Virtualized graph rendering
- Debounced search input
- Memoized callbacks and selectors
- Lazy node expansion

### Network Optimization
- Request deduplication via TanStack Query
- Stale-while-revalidate caching
- Parallel article fetching

## 🧪 Development

### Type Checking

```bash
npx tsc --noEmit
```

### Code Quality

```bash
npm run lint
```

### Hot Module Replacement

Vite provides instant HMR for React components, CSS, and TypeScript.

## 🎯 Future Enhancements

- [ ] **Graph Persistence** - Save/load graph states
- [ ] **Export Options** - PNG, SVG, JSON export
- [ ] **Advanced Filtering** - Filter by depth, score, category
- [ ] **Search History** - Recent searches with autocomplete
- [ ] **Context Menu** - Right-click node actions
- [ ] **Graph Layouts** - Multiple layout algorithms
- [ ] **Dark Mode** - Theme switcher
- [ ] **Performance Metrics** - FPS counter and stats
- [ ] **Mobile Optimization** - Touch gestures

## 🐛 Known Issues

- Graph layout may shift slightly when adding many nodes at once
- Thumbnail loading can be slow on poor connections
- Very deep graphs (depth > 5) may impact performance

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript best practices
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

**Inspired by WikiNodes** - The pioneering iPad app from the early 2010s that introduced visual Wikipedia exploration. This project reimagines that experience with modern web technologies and semantic search.

## 📚 Related Projects

- **[wikiExplorer Backend](https://github.com/jblarson/wikiExplorer)** - Python server with FAISS vector search
- **[Cytoscape.js](https://js.cytoscape.org/)** - Graph visualization library
- **[sentence-transformers](https://www.sbert.net/)** - Semantic text embeddings

---

**Built with ❤️ by the wikiExplorer team**
