import { useState } from 'react';
import { XMarkIcon, HeartIcon, CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  const [copiedCurrency, setCopiedCurrency] = useState<string | null>(null);

  const handleCopyAddress = (address: string, currency: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedCurrency(currency);
      setTimeout(() => setCopiedCurrency(null), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-abyss-surface border border-abyss-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-abyss-border bg-abyss flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">About wikiExplorer</h2>
            <p className="text-sm text-gray-400">Interactive Wikipedia Knowledge Graph</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-abyss-hover rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* Intro */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">What is this?</h3>
            <p className="text-gray-300 leading-relaxed text-sm">
              wikiExplorer is a free, open-source tool designed to reveal the hidden connections between topics. 
              While Wikipedia organizes information linearly, human knowledge is a network. By combining 
              <strong> 384-dimensional semantic search</strong> with <strong>force-directed graph visualization</strong>, 
              this tool allows you to wander through knowledge naturally, finding paths between concepts that traditional search engines miss.
            </p>
          </section>

          {/* Features Grid */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Key Features</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>Semantic Search (MiniLM-L6-v2)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>Real-time 3D Force Simulation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>Smart Ranking (PageRank + Views)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>Cross-Edge Detection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>Save/Load Exploration Maps</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-primary">•</span>
                <span>Performance Mode for weak GPUs</span>
              </li>
            </ul>
          </section>

          {/* Developer Info */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Built by JB</h3>
            <p className="text-gray-300 leading-relaxed text-sm">
              Data science student and full-stack developer passionate about knowledge graphs and making information discoverable. 
              This project is the culmination of research into vector embeddings and interactive WebGL visualization.
            </p>
          </section>

          {/* Donation Section */}
          <section className="bg-abyss rounded-xl p-6 border border-abyss-border/50 shadow-inner">
            <div className="flex items-center gap-3 mb-4">
              <HeartIcon className="w-6 h-6 text-pink-500 fill-pink-500/10 animate-pulse-slow" />
              <h3 className="text-lg font-semibold text-white">Support Development</h3>
            </div>
            
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              wikiExplorer is free and ad-free. Server costs for vector search and hosting are paid out of pocket. 
              If you find this tool useful for research or learning, a coffee would be greatly appreciated!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
              {/* Venmo */}
              <a 
                href="https://venmo.com/JBIII" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#008CFF]/10 hover:bg-[#008CFF]/20 text-[#008CFF] border border-[#008CFF]/30 hover:border-[#008CFF]/50 rounded-xl transition-all duration-200 font-medium text-sm group"
              >
                <span>Donate via Venmo</span>
                <span className="text-xs opacity-50 group-hover:opacity-100">↗</span>
              </a>
              

              {/* Bitcoin */}
              <button
                onClick={() => handleCopyAddress('bc1q97pqpt9lk8p7f2wj8kfnzjj9skl3z6qclexa3k', 'Bitcoin')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F7931A]/10 hover:bg-[#F7931A]/20 text-[#F7931A] border border-[#F7931A]/30 hover:border-[#F7931A]/50 rounded-xl transition-all duration-200 font-medium text-sm"
              >
                {copiedCurrency === 'Bitcoin' ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Copied BTC Address</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    <span>Copy Bitcoin Address</span>
                  </>
                )}
              </button>

              {/* Ethereum */}
              <button
                onClick={() => handleCopyAddress('0x83ee8b2b9f69aa8dbc6a26af2b5e0a1bd6cf6587', 'Ethereum')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#627EEA]/10 hover:bg-[#627EEA]/20 text-[#627EEA] border border-[#627EEA]/30 hover:border-[#627EEA]/50 rounded-xl transition-all duration-200 font-medium text-sm"
              >
                {copiedCurrency === 'Ethereum' ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Copied ETH Address</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    <span>Copy Ethereum Address</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-gray-600 mt-4 text-center">
              Donations are voluntary and non-refundable. No goods or services are provided in exchange.
            </p>
          </section>

          {/* Tech Stack Chips */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Powered By</h3>
            <div className="flex flex-wrap gap-2">
              {['Python Flask', 'FAISS', 'Sentence Transformers', 'React', 'Three.js', 'PostgreSQL', 'TypeScript', 'TailwindCSS'].map(tech => (
                <span key={tech} className="px-2.5 py-1 bg-abyss-hover text-gray-400 text-xs rounded-md border border-abyss-border/50">
                  {tech}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-abyss-border bg-abyss flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
          <span>© 2025 wikiExplorer v0.1.0</span>
          <div className="flex gap-4">
            <a 
              href="https://github.com/jblarson" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a 
              href="mailto:jb@hirejb.me" 
              className="hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}