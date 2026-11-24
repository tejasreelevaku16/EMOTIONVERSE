import { Sparkles } from 'lucide-react';

interface InteractionPromptProps {
  artifactName: string;
  onInteract: () => void;
  visible?: boolean;
}

export function InteractionPrompt({
  artifactName,
  onInteract,
  visible = true,
}: InteractionPromptProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-bounce">
      <button
        onClick={onInteract}
        className="glass-panel px-6 py-3 rounded-full flex items-center space-x-3 border border-cyan-glow/40 hover:border-cyan-glow shadow-glow-cyan text-sm sm:text-base cursor-pointer group transition-all"
        aria-label={`Interact with ${artifactName}`}
      >
        <span className="w-7 h-7 rounded-full bg-cyan-glow/20 border border-cyan-glow flex items-center justify-center font-mono font-bold text-cyan-200 group-hover:scale-110 transition-transform">
          E
        </span>
        <span className="text-gray-200 font-medium">
          Inspect <strong className="text-cyan-200 font-semibold">{artifactName}</strong>
        </span>
        <Sparkles className="w-4 h-4 text-emerald-glow animate-pulse" />
      </button>
    </div>
  );
}
