<div align="center">
  <img src="frontend/src/assets/wikiExplorer-logo-300.png" alt="wikiExplorer" width="120" />
  <h1>wikiExplorer</h1>
  <p><strong>3D Semantic Knowledge Graph Navigator</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Python-Flask-000000?style=for-the-badge&logo=python" />
    <img src="https://img.shields.io/badge/Vector_Search-FAISS-00758F?style=for-the-badge&logo=googlecloud" />
    <img src="https://img.shields.io/badge/Frontend-React_Three_Fiber-61DAFB?style=for-the-badge&logo=react" />
    <img src="https://img.shields.io/badge/Shaders-GLSL-555555?style=for-the-badge&logo=opengl" />
  </p>
</div>

---

### 🌐 The Concept
**wikiExplorer** moves beyond linear encyclopedias. It transforms the English Wikipedia into an interactive, 3D force-directed galaxy. By leveraging **384-dimensional vector embeddings** (MiniLM-L6-v2), it discovers hidden connections between topics that traditional keyword searches miss, rendering them in a high-performance WebGL environment.

---

### 🛠️ System Architecture

```mermaid
graph TD
    subgraph Frontend [React / Three.js Client]
        UI[User Interface] -->|Query| API_REQ
        STORE[Zustand Store] -->|State| SCENE
        SCENE[3D Canvas] -->|GLSL Shaders| RENDER[Force-Directed Graph]
    end

    subgraph Backend [Python Flask API]
        API_REQ[API Endpoint] -->|Text| ENCODER
        ENCODER[Sentence Transformer] -->|Embedding| FAISS
        
        subgraph Core Logic
            FAISS[FAISS IVF Index] -->|Nearest Neighbors| RANK
            SQL[SQLite Metadata] -->|PageRank + Views| RANK
            RANK[Hybrid Ranking Engine] -->|Filtered Nodes| CROSS
            CROSS[Cross-Edge Detection] -->|Global Context| JSON
        end
        
        JSON[Response Payload] -->|Nodes + Edges| STORE
    end

    style Frontend fill:#1a1b26,stroke:#7aa2f7,color:#fff
    style Backend fill:#1a1b26,stroke:#bb9af7,color:#fff
    style Core Logic fill:#24283b,stroke:#414868,color:#c0caf5
```

---

### 🧪 Core Features

#### 1. Hybrid Search & Ranking
We don't just return the most similar words. Results are ranked via a weighted geometric mean of four signals:
* **Semantic Similarity (50%):** Vector distance via `all-MiniLM-L6-v2`.
* **PageRank (40%):** Node centrality within the full Wikipedia graph.
* **Pageviews (5%):** Popularity metrics to filter obscure trivia.
* **Title Match (5%):** Exact string matching bias.

#### 2. Context-Aware Cross-Edges
Unlike standard trees, wikiExplorer calculates **global cross-edges**. When a new node is expanded, the backend scans the *entire existing graph* to find semantic connections between the new node and previously explored nodes, creating a true mesh network rather than a simple hierarchy.

#### 3. High-Performance Visualization
* **Custom Shaders:** Nodes feature Fresnel glow effects; edges use animated GLSL particle mist that shimmers based on connection strength.
* **Dynamic LOD:** Automatically toggles between high-fidelity visuals and performant geometry based on hardware capabilities.
* **Instancing:** Capable of rendering thousands of nodes at 60FPS using `react-force-graph-3d`.

#### 4. Persistence
* **Session Management:** Save and load entire graph states to JSON.
* **Smart Caching:** The frontend implements a `LinkCacheService` that prefetches expansion candidates, allowing instant node expansions after the initial load.

---

### bsd Directory Structure

| Path | Description |
| :--- | :--- |
| `backend/core/search_engine.py` | FAISS index management & vector encoding. |
| `backend/core/ranking.py` | Multi-signal scoring logic (PageRank/Views/Semantic). |
| `backend/core/cross_edges.py` | Logic for finding links between sibling nodes. |
| `frontend/src/components/GraphCanvas.tsx` | Main Three.js renderer & physics engine. |
| `frontend/src/components/graph/MistEffect.ts` | Custom GLSL shader for particle-flow edges. |
| `data/` | *[GitIgnored]* Contains the `.faiss` index and `.db` metadata. |

---

### 🚀 Quick Start

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r reqs.txt
# Ensure index.faiss and metadata.db are in /data
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
