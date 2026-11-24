import { useEffect, useMemo } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { getEnding } from '../story/endings';
import { audioService } from '../services/audio';
import { RotateCcw, Sparkles, Sun, Compass, Moon } from 'lucide-react';

interface EndingConfig {
  title: string;
  subtitle: string;
  narrative: string[];
  themeColor: string;
  glowClass: string;
  icon: typeof Sun;
  borderClass: string;
}

const ENDING_CONFIGS: Record<'RESTORATION' | 'TRANSFORMATION' | 'DARKNESS', EndingConfig> = {
  RESTORATION: {
    title: 'RESTORATION',
    subtitle: 'The Ancient Golden Dawn Returns',
    narrative: [
      'Through your selfless sacrifice and unwavering remembrance, the primordial light surges back into the roots of the ancient world.',
      'The Forgotten Clock strikes the sacred hour. Crumbling spires knit themselves back together from golden dust. The sanctuaries awaken with singing fountains.',
      'You gave of yourself completely so that the legacy of all keepers may endure throughout the ages. The world is reborn in eternal grace.',
    ],
    themeColor: '#facc15',
    glowClass: 'shadow-glow-gold',
    icon: Sun,
    borderClass: 'border-yellow-400/40',
  },
  TRANSFORMATION: {
    title: 'TRANSFORMATION',
    subtitle: 'The Radiance of a Living Cosmos',
    narrative: [
      'You chose not to cling to the past, but to share the crystal’s light freely with the hungry cosmos.',
      'The crystal fractures into countless glowing spores of emerald and cyan radiance. The rigid stone laws of the old universe dissolve into fertile stardust.',
      'Emotionverse has evolved into a boundless, living ecosystem where every emotion now blooms as a new constellation.',
    ],
    themeColor: '#22d3aa',
    glowClass: 'shadow-glow-emerald',
    icon: Compass,
    borderClass: 'border-cyan-400/40',
  },
  DARKNESS: {
    title: 'DARKNESS',
    subtitle: 'The Peace of the Endless Night',
    narrative: [
      'The final ember of light gently gutters and winks out against the cold velvet of space.',
      'The weary world breathes its last sigh. The burdens of keepers, time, and memory are laid to rest beneath an infinity of silent stars.',
      'There is neither grief nor terror here — only the sacred, gentle stillness of a universe at peace.',
    ],
    themeColor: '#a855f7',
    glowClass: 'shadow-glow-purple',
    icon: Moon,
    borderClass: 'border-purple-400/40',
  },
};

export function EndingScreen() {
  const { node, vars, flags, emotion, resetGame } = useGameStore();

  const ending = useMemo(() => {
    if (!emotion) return 'DARKNESS';
    return getEnding({ node, vars, flags, emotion });
  }, [node, vars, flags, emotion]);

  const config = ENDING_CONFIGS[ending];
  const Icon = config.icon;

  useEffect(() => {
    audioService.playMood('ending');
  }, []);

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between p-6 sm:p-12 bg-void text-white overflow-y-auto select-none">
      {/* Background radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[170px] pointer-events-none opacity-20"
        style={{ backgroundColor: config.themeColor }}
      />

      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-gray-400">
          <Sparkles className="w-4 h-4 text-emerald-glow" />
          <span>Destiny Concluded</span>
        </div>
        <span className="text-xs font-mono text-gray-400 uppercase">
          Final Fate of Emotionverse
        </span>
      </header>

      {/* Center Cinematic Card */}
      <main className="w-full max-w-2xl mx-auto my-auto py-10 z-10 text-center">
        {/* Ending Icon */}
        <div
          className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border ${config.borderClass} ${config.glowClass} shadow-2xl transition-all`}
          style={{ backgroundColor: `${config.themeColor}15` }}
        >
          <Icon className="w-10 h-10" style={{ color: config.themeColor }} />
        </div>

        <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color: config.themeColor }}>
          {config.subtitle}
        </p>

        <h1 className="font-cinzel text-5xl sm:text-6xl font-black tracking-widest text-white mb-8">
          {config.title}
        </h1>

        {/* Narrative Paragraphs */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 text-gray-200 text-sm sm:text-base leading-relaxed space-y-4 font-light text-left mb-8 backdrop-blur-xl">
          {config.narrative.map((paragraph, idx) => (
            <p key={idx} className="italic">
              "{paragraph}"
            </p>
          ))}
        </div>

        {/* Journey Statistics Summary */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10 text-center">
          <div className="glass-panel p-3 rounded-xl border border-white/10">
            <p className="text-[11px] font-mono text-gray-400 uppercase">Resolve</p>
            <p className="text-lg font-bold text-amber-400 font-cinzel">{vars.resolve}</p>
          </div>
          <div className="glass-panel p-3 rounded-xl border border-white/10">
            <p className="text-[11px] font-mono text-gray-400 uppercase">Memory</p>
            <p className="text-lg font-bold text-cyan-300 font-cinzel">{vars.memory}</p>
          </div>
          <div className="glass-panel p-3 rounded-xl border border-white/10">
            <p className="text-[11px] font-mono text-gray-400 uppercase">Light</p>
            <p className="text-lg font-bold text-emerald-300 font-cinzel">{vars.light}</p>
          </div>
        </div>

        {/* Restart Action */}
        <button
          onClick={resetGame}
          className="py-4 px-8 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-cinzel font-bold tracking-widest shadow-glow-cyan flex items-center justify-center space-x-3 mx-auto transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Awaken Anew</span>
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-gray-500 font-mono tracking-wider z-10">
        "Feel the World. Shape the Story. Change Your Destiny."
      </footer>
    </div>
  );
}
