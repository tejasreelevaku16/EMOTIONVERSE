import { useMemo } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { useTypewriter } from '../hooks/useTypewriter';
import { getNode } from '../story/storyEngine';
import { Sparkles, ArrowRight, Clock, BookOpen, Gem, User } from 'lucide-react';

interface StoryPanelProps {
  onChoiceMade?: (choiceId: string) => void;
}

const SPEAKER_ICONS = {
  narrator: User,
  clock: Clock,
  book: BookOpen,
  crystal: Gem,
};

const SPEAKER_NAMES = {
  narrator: 'Chronicles of the Realm',
  clock: 'The Forgotten Clock',
  book: 'The Living Book',
  crystal: 'The Last Crystal',
};

export function StoryPanel({ onChoiceMade }: StoryPanelProps) {
  const {
    node,
    choices,
    makeChoice,
    activeDialogue,
    isAiLoading,
    settings,
  } = useGameStore();

  const nodeData = useMemo(() => getNode(node), [node]);

  const fullText = useMemo(() => {
    if (activeDialogue) return activeDialogue;
    return nodeData?.fallback.dialogue.join(' ') ?? 'The ancient realm listens in silence...';
  }, [activeDialogue, nodeData]);

  const speaker = nodeData?.speaker ?? 'narrator';
  const SpeakerIcon = SPEAKER_ICONS[speaker];
  const speakerName = SPEAKER_NAMES[speaker];

  const { displayedText, isComplete, skip } = useTypewriter(fullText, {
    speed: 18,
    reducedMotion: settings.reducedMotion,
  });

  const handleChoiceClick = (choiceId: string) => {
    makeChoice(choiceId);
    onChoiceMade?.(choiceId);
  };

  return (
    <div className='w-full max-w-2xl mx-auto z-40'>
      <div className='glass-panel rounded-xl border border-cyan-glow/15 backdrop-blur-xl overflow-hidden'>
        {/* Compact speaker + dialogue row */}
        <div className='flex items-start gap-3 px-4 py-3'>
          <div className='w-7 h-7 rounded-md bg-emerald-deep/80 border border-cyan-glow/30 flex items-center justify-center text-cyan-200 flex-shrink-0 mt-0.5'>
            <SpeakerIcon className='w-3.5 h-3.5' />
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-[10px] uppercase font-mono tracking-widest text-emerald-glow mb-0.5'>{speakerName}</p>
            <div className='cursor-pointer' onClick={skip}>
              <p className='text-gray-200 text-xs sm:text-sm leading-relaxed font-light italic line-clamp-3'>
                {displayedText}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-1.5 flex-shrink-0'>
            {isAiLoading && (
              <Sparkles className='w-3 h-3 text-cyan-400 animate-pulse' />
            )}
            {!isComplete && (
              <button
                onClick={skip}
                className='text-gray-500 hover:text-cyan-200 transition-colors'
                aria-label='Skip'
              >
                <ArrowRight className='w-3.5 h-3.5' />
              </button>
            )}
          </div>
        </div>

        {/* Choices */}
        {isComplete && choices.length > 0 && (
          <div className='border-t border-white/[0.08] px-4 pb-3 pt-2 space-y-1.5'>
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleChoiceClick(choice.id)}
                className='w-full text-left px-3 py-2 rounded-lg glass-button text-gray-200 hover:text-white text-xs font-medium flex items-center justify-between group transition-all cursor-pointer border border-white/[0.08] hover:border-cyan-glow/40 hover:bg-cyan-950/20'
              >
                <span className='leading-snug flex-1 pr-2'>{choice.label}</span>
                <ArrowRight className='w-3 h-3 text-cyan-glow/60 group-hover:translate-x-0.5 transition-transform flex-shrink-0' />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}