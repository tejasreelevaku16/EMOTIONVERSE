import { useGameStore } from '../hooks/useGameStore';
import type { Emotion } from '../story/storyState';
import { audioService } from '../services/audio';
import { Sun, CloudRain, Compass, Ghost, ArrowLeft } from 'lucide-react';

interface EmotionOption {
  key: Emotion;
  title: string;
  subtitle: string;
  description: string;
  environmentPreview: string;
  icon: typeof Sun;
  themeColor: string;
  glowClass: string;
  borderClass: string;
  bgGradient: string;
}

const EMOTION_OPTIONS: EmotionOption[] = [
  {
    key: 'hope',
    title: 'HOPE',
    subtitle: 'Golden Sunlight & Blooming Flora',
    description: 'You believe light can be revived. The realm bathes in warm amber dawn, revitalizing withered roots into radiant blossom.',
    environmentPreview: 'Golden daylight, gentle floating embers, blooming meadows.',
    icon: Sun,
    themeColor: '#facc15',
    glowClass: 'hover:shadow-glow-gold hover:border-hope-base/60',
    borderClass: 'border-hope-base/30',
    bgGradient: 'from-amber-950/30 via-emerald-deep/40 to-void',
  },
  {
    key: 'sadness',
    title: 'SADNESS',
    subtitle: 'Misty Blue Drizzle & Gentle Rain',
    description: 'You weep for the world that was. Cool rain falls upon ancient stones as azure mist veils the quiet forest.',
    environmentPreview: 'Deep blue twilight, rainfall particles, soft drifting fog.',
    icon: CloudRain,
    themeColor: '#60a5fa',
    glowClass: 'hover:shadow-glow-blue hover:border-sadness-base/60',
    borderClass: 'border-sadness-base/30',
    bgGradient: 'from-blue-950/30 via-slate-950/50 to-void',
  },
  {
    key: 'curiosity',
    title: 'CURIOSITY',
    subtitle: 'Emerald Glow & Ancient Ciphers',
    description: 'You seek hidden truths behind the fading. Luminous cyan runes ignite in the air, unveiling forgotten cosmic ciphers.',
    environmentPreview: 'Emerald & cyan radiance, glowing runes, rising stardust.',
    icon: Compass,
    themeColor: '#22d3aa',
    glowClass: 'hover:shadow-glow-cyan hover:border-cyan-glow/60',
    borderClass: 'border-cyan-glow/30',
    bgGradient: 'from-emerald-950/40 via-teal-950/40 to-void',
  },
  {
    key: 'fear',
    title: 'FEAR',
    subtitle: 'Shadows, Heavy Fog & Gathering Storm',
    description: 'You brace against the encroaching dark. Dense shadows loom between twisted branches as distant thunder rumbles.',
    environmentPreview: 'Dark silhouette, heavy violet fog, swirling storm winds.',
    icon: Ghost,
    themeColor: '#c084fc',
    glowClass: 'hover:shadow-glow-purple hover:border-fear-base/60',
    borderClass: 'border-fear-base/30',
    bgGradient: 'from-purple-950/30 via-zinc-950/60 to-void',
  },
];

export function EmotionSelection() {
  const { startNewJourney, goToScreen } = useGameStore();

  const handleSelectEmotion = (emotion: Emotion) => {
    // Play synthesized WebAudio ambience for the chosen emotion
    audioService.playMood(emotion);
    startNewJourney(emotion);
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between p-6 sm:p-12 bg-void text-white overflow-y-auto select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-cyan-glow/5 blur-[180px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10 mb-8">
        <button
          onClick={() => goToScreen('landing')}
          className="glass-button px-4 py-2 rounded-xl text-sm flex items-center space-x-2 text-gray-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return</span>
        </button>

        <div className="text-right">
          <p className="text-xs uppercase font-mono tracking-widest text-emerald-glow">Act 0: Attunement</p>
          <h2 className="font-cinzel text-lg sm:text-xl font-bold tracking-wider text-cyan-100">Awaken the Soul</h2>
        </div>
      </header>

      {/* Main Emotion Cards Grid */}
      <main className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center z-10 my-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="font-cinzel text-3xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-white to-cyan-300 mb-3">
            Choose Your Emotion
          </h1>
          <p className="text-gray-400 text-sm sm:text-base font-light">
            Emotion is the only remaining force in Emotionverse. The state you embody will shape the lighting, weather, flora, and sounds of the shared 3D world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {EMOTION_OPTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectEmotion(item.key)}
                className={`group relative glass-panel rounded-2xl p-6 flex flex-col text-left transition-all duration-300 border ${item.borderClass} ${item.glowClass} hover:-translate-y-2 bg-gradient-to-b ${item.bgGradient} cursor-pointer`}
              >
                {/* Glowing Icon Header */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 shadow-lg"
                  style={{ backgroundColor: `${item.themeColor}20`, border: `1px solid ${item.themeColor}60` }}
                >
                  <Icon className="w-6 h-6" style={{ color: item.themeColor }} />
                </div>

                {/* Title & Subtitle */}
                <h2 className="font-cinzel text-2xl font-bold tracking-wider text-white mb-1 group-hover:text-cyan-200 transition-colors">
                  {item.title}
                </h2>
                <p className="text-xs font-mono tracking-wider mb-4" style={{ color: item.themeColor }}>
                  {item.subtitle}
                </p>

                {/* Narrative Description */}
                <p className="text-gray-300 text-xs sm:text-sm font-light leading-relaxed mb-6 flex-1">
                  {item.description}
                </p>

                {/* Atmosphere Preview Badge */}
                <div className="pt-4 border-t border-white/10 text-[11px] text-gray-400 font-mono flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.themeColor }} />
                  <span>{item.environmentPreview}</span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer Instructions */}
      <footer className="w-full text-center text-xs text-gray-500 font-mono tracking-wider z-10 mt-8">
        Each emotion transforms the same persistent world • Decisions shape the final light
      </footer>
    </div>
  );
}
