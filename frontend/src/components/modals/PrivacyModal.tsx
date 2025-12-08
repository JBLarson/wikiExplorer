import { XMarkIcon } from '@heroicons/react/24/outline';

interface PrivacyModalProps {
  onClose: () => void;
}

export function PrivacyModal({ onClose }: PrivacyModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-abyss-surface border border-abyss-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-abyss-border bg-abyss flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-abyss-hover rounded-lg transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar prose prose-invert prose-sm max-w-none">
          <p><strong>Last Updated:</strong> December 8, 2025</p>

          <h3>1. Introduction</h3>
          <p>
            wikiExplorer ("we") is an open-source educational tool. This policy explains how we handle your data.
            By using wikiExplorer, you agree to the collection and use of information in accordance with this policy.
          </p>

          <h3>2. Information Collection</h3>
          <ul>
            <li><strong>Technical Identifiers:</strong> We collect your IP address and User Agent to generate a cryptographic "fingerprint." This allows us to prevent abuse (DDoS/spam) and count unique visitors without permanently storing your raw IP.</li>
            <li><strong>Activity Logs:</strong> We log your search queries to build our public knowledge graph. These queries are anonymized and decoupled from your identity.</li>
          </ul>

          <h3>3. How We Use Data</h3>
          <p>We process data to operate the 3D visualization, maintain server security, and analyze aggregate usage trends. We do not sell your data to third parties.</p>

          <h3>4. International Transfers</h3>
          <p>Our servers are located in the United States. If you are visiting from the EU or elsewhere, you acknowledge that your data will be processed in the US.</p>

          <h3>5. Your Rights</h3>
          <p>
            Under CCPA (California) and GDPR (EU), you have rights regarding your data. 
            Since we do not create user accounts, we can only identify you by your current IP address. 
            You may contact us to request the deletion of raw log data associated with your IP.
          </p>

          <h3>6. Contact</h3>
          <p>For privacy concerns, please contact the developer at <a href="mailto:jb@hirejb.me" className="text-brand-glow hover:underline">jb@hirejb.me</a>.</p>
        </div>
      </div>
    </div>
  );
}